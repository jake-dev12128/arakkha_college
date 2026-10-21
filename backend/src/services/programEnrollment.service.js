
import mongoose from "mongoose";

import User from "../models/user.model.js";
import Student from "../models/student.model.js";
import Cohort from "../models/cohort.model.js";
import ProgramEnrollment from "../models/programEnrollment.model.js";
import AppError from "../utils/AppError.js";

const fail = (
  message,
  status = 400,
  code = "BAD_REQUEST",
) => {
  throw new AppError(message, status, code);
};

const occupiesSeat = status =>
  ["active", "suspended"].includes(status);

const getEnrollment = async (id, session = null) => {
  const query = ProgramEnrollment.findById(id);

  if (session) query.session(session);

  const enrollment = await query;

  if (!enrollment) {
    fail("Enrollment not found.", 404, "NOT_FOUND");
  }

  return enrollment;
};

const reserveSeat = async (cohortId, session) => {
  const cohort = await Cohort.findOneAndUpdate(
    {
      _id: cohortId,
      status: "active",
      $or: [
        { capacity: null },
        {
          $expr: {
            $lt: ["$occupiedSeats", "$capacity"],
          },
        },
      ],
    },
    { $inc: { occupiedSeats: 1 } },
    { new: true, session },
  );

  if (!cohort) {
    fail(
      "Cohort is inactive or capacity is full.",
      409,
      "COHORT_UNAVAILABLE",
    );
  }

  return cohort;
};

const releaseSeat = async (cohortId, session) => {
  const result = await Cohort.updateOne(
    {
      _id: cohortId,
      occupiedSeats: { $gt: 0 },
    },
    { $inc: { occupiedSeats: -1 } },
    { session },
  );

  if (result.modifiedCount !== 1) {
    fail(
      "Cohort seat counter is inconsistent.",
      409,
      "SEAT_COUNTER_CONFLICT",
    );
  }
};

export const createProgramEnrollment = async data => {
  const session = await mongoose.startSession();

  try {
    let created;

    await session.withTransaction(async () => {
    const student = await Student.findOne({
  studentId: data.studentId,
}).session(session);
      if (!student) {
        fail("Student not found.", 404, "STUDENT_NOT_FOUND");
      }

      const user = await User.findById(
        student.userId,
      ).session(session);

      if (
        !user ||
        !user.isActive ||
        user.role !== "student"
      ) {
        fail(
          "Student account is not active.",
          409,
          "STUDENT_INACTIVE",
        );
      }

      const cohort = await Cohort.findById(
        data.cohort,
      ).session(session);

      if (!cohort) {
        fail("Cohort not found.", 404, "COHORT_NOT_FOUND");
      }

      if (cohort.status !== "active") {
        fail(
          "Cohort must be active.",
          409,
          "COHORT_NOT_ACTIVE",
        );
      }

      const duplicate = await ProgramEnrollment.exists({
        student: student._id,
        cohort: cohort._id,
      }).session(session);

      if (duplicate) {
        fail(
          "Student is already enrolled in this cohort.",
          409,
          "ENROLLMENT_EXISTS",
        );
      }

      const activeProgram = await ProgramEnrollment.exists({
        student: student._id,
        program: cohort.program,
        status: { $in: ["active", "suspended"] },
      }).session(session);

      if (activeProgram) {
        fail(
          "Student already has an ongoing enrollment in this program.",
          409,
          "PROGRAM_ENROLLMENT_EXISTS",
        );
      }

      await reserveSeat(cohort._id, session);

      const records = await ProgramEnrollment.create(
        [{
          student: student._id,
          cohort: cohort._id,
          program: cohort.program,
          enrolledAt: data.enrolledAt ?? new Date(),
          notes: data.notes ?? "",
        }],
        { session },
      );

      created = records[0];
    });

    return created;
  } catch (error) {
    if (error.code === 11000) {
      fail(
        "Duplicate enrollment.",
        409,
        "ENROLLMENT_EXISTS",
      );
    }

    throw error;
  } finally {
    await session.endSession();
  }
};



export const listProgramEnrollments = async ({
  page = 1,
  limit = 20,
  cohort,
  student,
  status,
  search,
} = {}) => {
  const filter = {};

  if (cohort) {
    if (!mongoose.isValidObjectId(cohort)) {
      fail("Invalid cohort ID.", 400, "INVALID_COHORT_ID");
    }
    filter.cohort = cohort;
  }

  if (student) {
    if (!mongoose.isValidObjectId(student)) {
      fail("Invalid student ID.", 400, "INVALID_STUDENT_ID");
    }
    filter.student = student;
  }

  if (status && status !== "all") {
    const allowed = [
      "active",
      "suspended",
      "completed",
      "withdrawn",
    ];

    if (!allowed.includes(status)) {
      fail("Invalid status.", 400, "INVALID_STATUS_FILTER");
    }

    filter.status = status;
  }

  if (typeof search === "string" && search.trim()) {
    const escaped = search.trim().replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const matchingStudents = await Student.find({
      $or: [
        { studentId: { $regex: escaped, $options: "i" } },
        { firstName: { $regex: escaped, $options: "i" } },
        { lastName: { $regex: escaped, $options: "i" } },
        {
          $expr: {
            $regexMatch: {
              input: {
                $concat: ["$firstName", " ", "$lastName"],
              },
              regex: escaped,
              options: "i",
            },
          },
        },
      ],
    })
      .select("_id")
      .lean();

    const matchingIds = matchingStudents.map(
      (item) => item._id
    );

    if (filter.student) {
      if (!matchingIds.some(
        (id) => String(id) === String(filter.student)
      )) {
        return {
          records: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        };
      }
    } else {
      filter.student = { $in: matchingIds };
    }
  }

  const [records, total] = await Promise.all([
    ProgramEnrollment.find(filter)
      .populate("student", "studentId firstName lastName")
      .populate("cohort", "code name status")
      .populate("program", "code name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    ProgramEnrollment.countDocuments(filter),
  ]);

  return {
    records,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};



// ==================================================
// GET PROGRAM ENROLLMENT DETAILS
// ==================================================

export const getProgramEnrollment = async (id) => {
  const enrollment = await getEnrollment(id);

  await enrollment.populate([
    {
      path: "student",
      select: "studentId firstName lastName",
    },
    {
      path: "program",
      select: "code name",
    },
    {
      path: "cohort",
      select:
        "code name status program academicYear curriculum",
      populate: [
        {
          path: "academicYear",
          select: "code name startDate endDate",
        },
        {
          path: "curriculum",
          select: "version status effectiveFrom",
        },
        {
          path: "program",
          select: "code name",
        },
      ],
    },
  ]);

  return enrollment;
};
export const updateProgramEnrollment = async (
  id,
  data,
) => {
  const session = await mongoose.startSession();

  try {
    let updated;

    await session.withTransaction(async () => {
      const enrollment = await getEnrollment(
        id,
        session,
      );

      const oldStatus = enrollment.status;
const newStatus = data.status ?? oldStatus;

      const terminal = ["completed", "withdrawn"];

      if (
        terminal.includes(oldStatus) &&
        newStatus !== oldStatus
      ) {
        fail(
          "Terminal enrollment cannot be reactivated.",
          409,
          "INVALID_STATUS_TRANSITION",
        );
      }

      if (
        occupiesSeat(oldStatus) &&
        !occupiesSeat(newStatus)
      ) {
        await releaseSeat(enrollment.cohort, session);
      }

      if (
        !occupiesSeat(oldStatus) &&
        occupiesSeat(newStatus)
      ) {
        await reserveSeat(enrollment.cohort, session);
      }

      enrollment.status = newStatus;

      if (data.notes !== undefined) {
        enrollment.notes = data.notes;
      }

      if (newStatus === "completed") {
        enrollment.completedAt ??= new Date();
      }

      if (newStatus === "withdrawn") {
        enrollment.withdrawnAt ??= new Date();
      }

      updated = await enrollment.save({ session });
    });

    return updated;
  } catch (error) {
    if (error.code === 11000) {
      fail(
        "Conflicting active enrollment.",
        409,
        "ENROLLMENT_CONFLICT",
      );
    }

    throw error;
  } finally {
    await session.endSession();
  }
};
