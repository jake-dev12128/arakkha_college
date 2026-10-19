
import mongoose from "mongoose";
import ProgramEnrollment from
  "../models/programEnrollment.model.js";
import AcademicYear from "../models/academicYear.model.js";
import Cohort from "../models/cohort.model.js";
import Program from "../models/program.model.js";
import Curriculum from "../models/curriculum.model.js";
import AppError from "../utils/AppError.js";

const fail = (message, status = 400, code = "BAD_REQUEST") => {
  throw new AppError(message, status, code);
};

const ensureId = id => {
  if (!mongoose.isValidObjectId(id)) {
    fail("Invalid ID.");
  }
};

const findRecord = async (Model, id) => {
  ensureId(id);
  const record = await Model.findById(id);

  if (!record) {
    fail("Record not found.", 404, "NOT_FOUND");
  }

  return record;
};

const checkDuplicate = async (Model, code, excludeId) => {
  const query = { code };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  if (await Model.exists(query)) {
    fail("Code already exists.", 409, "DUPLICATE_CODE");
  }
};

const checkReferences = async ({
  program,
  curriculum,
  academicYear,
}) => {
  const [p, c, y] = await Promise.all([
    findRecord(Program, program),
    findRecord(Curriculum, curriculum),
    findRecord(AcademicYear, academicYear),
  ]);

  if (!p.isActive) {
    fail("Program is inactive.", 409, "PROGRAM_INACTIVE");
  }

  if (c.status !== "published") {
    fail(
      "Curriculum must be published.",
      409,
      "CURRICULUM_NOT_PUBLISHED",
    );
  }

  if (String(c.program) !== String(p._id)) {
    fail(
      "Curriculum does not belong to the program.",
      400,
      "CURRICULUM_PROGRAM_MISMATCH",
    );
  }

  if (!y.isActive || y.status === "completed") {
    fail(
      "Academic year is unavailable.",
      409,
      "ACADEMIC_YEAR_UNAVAILABLE",
    );
  }

  return { p, c, y };
};

const listRecords = async (Model, query = {}) => {
  const {
    page = 1,
    limit = 20,
    search,
    status,
  } = query;

  const filter = {};

  if (search) {
    const escaped = search.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );

    filter.$or = [
      { code: { $regex: escaped, $options: "i" } },
      { name: { $regex: escaped, $options: "i" } },
    ];
  }

  if (status) {
    filter.status = status;
  }

  const [data, total] = await Promise.all([
    Model.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Model.countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ACADEMIC YEAR
export const createAcademicYear = async (data) => {
  await checkDuplicate(AcademicYear, data.code);

  try {
    return await AcademicYear.create({
      ...data,
      status: "planned",
      isActive: true,
    });
  } catch (error) {
    if (error.code === 11000) {
      fail(
        "Academic year code already exists.",
        409,
        "DUPLICATE_CODE",
      );
    }

    throw error;
  }
};

export const listAcademicYears = query =>
  listRecords(AcademicYear, query);

export const getAcademicYear = id =>
  findRecord(AcademicYear, id);

// ==================================================
// UPDATE ACADEMIC YEAR
// ==================================================

export const updateAcademicYear = async (id, data) => {
if (year.status !== "planned") {
  fail(
    "Only planned academic years may be edited.",
    409,
    "ACADEMIC_YEAR_NOT_PLANNED",
  );
}
  const dateChangeRequested =
    data.startDate !== undefined ||
    data.endDate !== undefined;

  if (dateChangeRequested) {
    const cohortCount = await Cohort.countDocuments({
      academicYear: year._id,
    });

    if (cohortCount > 0) {
      fail(
        "Academic year dates cannot be changed because cohorts reference this year.",
        409,
        "ACADEMIC_YEAR_IN_USE"
      );
    }
  }

  if (data.code && data.code !== year.code) {
    await checkDuplicate(AcademicYear, data.code, id);
  }

  Object.assign(year, data);

  if (year.endDate <= year.startDate) {
    fail(
      "End date must be after start date.",
      400,
      "INVALID_ACADEMIC_YEAR_DATES"
    );
  }

  try {
    return await year.save();
  } catch (error) {
    if (error.code === 11000) {
      fail(
        "Academic year code already exists.",
        409,
        "DUPLICATE_CODE"
      );
    }

    throw error;
  }
};

// ==================================================
// ACTIVATE ACADEMIC YEAR
// ==================================================

export const activateAcademicYear = async (id) => {
  ensureId(id);

  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(
      async () => {
        const target = await AcademicYear.findById(id)
          .session(session);

        if (!target) {
          fail(
            "Academic year not found.",
            404,
            "ACADEMIC_YEAR_NOT_FOUND",
          );
        }

        if (
          !target.isActive ||
          target.status !== "planned"
        ) {
          fail(
            "Only available planned academic years can be activated.",
            409,
            "ACADEMIC_YEAR_NOT_PLANNED",
          );
        }

        const current = await AcademicYear.find({
          status: "active",
          isActive: true,
        })
          .session(session)
          .limit(2);

        if (current.length > 1) {
          fail(
            "Multiple active academic years detected.",
            409,
            "MULTIPLE_ACTIVE_ACADEMIC_YEARS",
          );
        }

        if (current.length === 1) {
          const previous = current[0];

          // Prevent activating an older year.
          if (target.startDate <= previous.startDate) {
            fail(
              "New academic year must start after the current academic year.",
              409,
              "INVALID_ACADEMIC_YEAR_ORDER",
            );
          }

          previous.status = "completed";
          await previous.save({ session });
        }

        target.status = "active";
        await target.save({ session });

        result = target.toObject();
      },
      {
        readPreference: "primary",
        writeConcern: { w: "majority" },
      },
    );

    return result;
  } catch (error) {
    if (error.code === 11000) {
      fail(
        "Another academic year is already active.",
        409,
        "ACTIVE_ACADEMIC_YEAR_CONFLICT",
      );
    }

    throw error;
  } finally {
    await session.endSession();
  }
};

// ==================================================
// COMPLETE ACADEMIC YEAR
// ==================================================

export const completeAcademicYear = async (id) => {
  ensureId(id);

  const year = await AcademicYear.findOneAndUpdate(
    {
      _id: id,
      status: "active",
      isActive: true,
    },
    {
      $set: {
        status: "completed",
      },
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!year) {
    const exists = await AcademicYear.exists({ _id: id });

    if (!exists) {
      fail(
        "Academic year not found.",
        404,
        "ACADEMIC_YEAR_NOT_FOUND",
      );
    }

    fail(
      "Only an active academic year can be completed.",
      409,
      "ACADEMIC_YEAR_NOT_ACTIVE",
    );
  }

  return year;
};
// ==================================================
// COHORT STATUS TRANSITIONS
// ==================================================

const COHORT_TRANSITIONS = {
  planned: new Set(["active", "cancelled"]),
  active: new Set(["completed", "cancelled"]),
  completed: new Set(),
  cancelled: new Set(),
};

const validateCohortTransition = async (
  cohort,
  nextStatus
) => {
  const currentStatus = cohort.status;

  // No change
  if (nextStatus === currentStatus) {
    return;
  }

  const allowed =
    COHORT_TRANSITIONS[currentStatus];

  if (!allowed?.has(nextStatus)) {
    fail(
      `Cannot change cohort status from ${currentStatus} to ${nextStatus}.`,
      409,
      "INVALID_COHORT_STATUS_TRANSITION"
    );
  }

  // Do not cancel a cohort that has enrollment history.
  if (nextStatus === "cancelled") {
    const enrollmentExists =
      await ProgramEnrollment.exists({
        cohort: cohort._id,
      });

    if (enrollmentExists) {
      fail(
        "Cannot cancel cohort because enrollment records exist.",
        409,
        "COHORT_HAS_ENROLLMENTS"
      );
    }
  }

  // Cannot complete while students are still active/suspended.
  if (nextStatus === "completed") {
    const ongoingEnrollment =
      await ProgramEnrollment.exists({
        cohort: cohort._id,
        status: {
          $in: ["active", "suspended"],
        },
      });

    if (ongoingEnrollment) {
      fail(
        "Cannot complete cohort while active or suspended enrollments exist.",
        409,
        "COHORT_HAS_ONGOING_ENROLLMENTS"
      );
    }
  }
};
// COHORT

export const createCohort = async data => {
  await checkDuplicate(Cohort, data.code);
  await checkReferences(data);

  if (data.endDate && data.endDate <= data.startDate) {
    fail("End date must be after start date.");
  }

  try {
    return await Cohort.create(data);
  } catch (error) {
    if (error.code === 11000) {
      fail("Cohort code already exists.", 409, "DUPLICATE_CODE");
    }
    throw error;
  }
};

export const listCohorts = query =>
  listRecords(Cohort, query);

export const getCohort = id =>
  findRecord(Cohort, id);

// ==================================================
// UPDATE COHORT
// ==================================================

// ==================================================
// UPDATE COHORT
// ==================================================

export const updateCohort = async (id, data) => {
  const cohort = await findRecord(Cohort, id);

  // 1. Validate lifecycle transition
  if (data.status !== undefined) {
    await validateCohortTransition(
      cohort,
      data.status
    );
  }

  // 2. Protect occupied seats
  if (
    data.capacity !== undefined &&
    data.capacity !== null &&
    data.capacity < cohort.occupiedSeats
  ) {
    fail(
      `Capacity cannot be lower than ${cohort.occupiedSeats} occupied seats.`,
      409,
      "CAPACITY_BELOW_OCCUPANCY"
    );
  }

  // 3. Apply updates
  Object.assign(cohort, data);

  // 4. Validate dates
  if (
    cohort.endDate &&
    cohort.endDate <= cohort.startDate
  ) {
    fail(
      "End date must be after start date.",
      400,
      "INVALID_COHORT_DATES"
    );
  }

  return cohort.save();
};