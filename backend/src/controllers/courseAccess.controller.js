
import mongoose from "mongoose";
import Cohort from "../models/cohort.model.js";
import Curriculum from "../models/curriculum.model.js";
import ProgramEnrollment from "../models/programEnrollment.model.js";
import Course from "../models/course.model.js";
import CourseAssignment from "../models/courseAssignment.model.js";
import Teacher from "../models/teacher.model.js";
import Student from "../models/student.model.js";
import User from "../models/user.model.js";

import AppError from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// ==================================================
// HELPERS
// ==================================================
const ensureId = (id) => {
  const normalizedId =
    typeof id === "string"
      ? id
      : id instanceof mongoose.Types.ObjectId
        ? id.toString()
        : null;

  if (
    !normalizedId ||
    !mongoose.isObjectIdOrHexString(normalizedId)
  ) {
    throw new AppError(
      "Invalid resource ID.",
      400,
      "INVALID_RESOURCE_ID",
    );
  }

  return normalizedId;
};
const ensureActiveProfile = async (
  Model,
  id,
  role,
) => {
  ensureId(id);

  const profile = await Model.findById(id)
    .select("_id userId")
    .lean();

  if (!profile) {
    throw new AppError(
      "Profile not found.",
      404,
      "PROFILE_NOT_FOUND",
    );
  }

  const user = await User.findOne({
    _id: profile.userId,
    role,
    isActive: true,
  })
    .select("_id")
    .lean();

  if (!user) {
    throw new AppError(
      "Account is not active.",
      409,
      "ACCOUNT_NOT_ACTIVE",
    );
  }

  return profile;
};

const getOwnProfile = async (
  Model,
  userId,
  code,
) => {
  const profile = await Model.findOne({
    userId,
  })
    .select("_id")
    .lean();

  if (!profile) {
    throw new AppError(
      "Profile not found.",
      404,
      code,
    );
  }

  return profile;
};
// ==================================================
// VALIDATE COURSE BELONGS TO COHORT CURRICULUM
// ==================================================

const validateCourseInCohort = async (
  courseId,
  cohortId,
) => {
  ensureId(courseId);
  ensureId(cohortId);

  const cohort = await Cohort.findById(cohortId)
    .select("program curriculum status")
    .lean();

  if (!cohort) {
    throw new AppError(
      "Cohort not found.",
      404,
      "COHORT_NOT_FOUND",
    );
  }

  if (!["planned", "active"].includes(cohort.status)) {
    throw new AppError(
      "Cohort is not available for course assignment.",
      409,
      "COHORT_NOT_AVAILABLE",
    );
  }

  const curriculum = await Curriculum.findById(
    cohort.curriculum,
  )
    .select("program status semesters")
    .lean();

  if (
    !curriculum ||
    String(curriculum.program) !== String(cohort.program)
  ) {
    throw new AppError(
      "Invalid cohort curriculum.",
      409,
      "INVALID_COHORT_CURRICULUM",
    );
  }

  const courseExists = curriculum.semesters.some(
    (semester) =>
      semester.courses.some(
        (entry) =>
          String(entry.course) === String(courseId),
      ),
  );

  if (!courseExists) {
    throw new AppError(
      "Course does not belong to this cohort curriculum.",
      409,
      "COURSE_NOT_IN_CURRICULUM",
    );
  }

  return cohort;
};
// ==================================================
// ADMIN - ASSIGN TEACHER
// ==================================================

export const assignTeacher = asyncHandler(
  async (req, res) => {
const { courseId, teacherId, cohortId } = req.body;

await validateCourseInCohort(courseId, cohortId);
    ensureId(courseId);

    const course = await Course.findOne({
      _id: courseId,
      isActive: true,
    })
      .select("_id")
      .lean();

    if (!course) {
      throw new AppError(
        "Active course not found.",
        404,
        "COURSE_NOT_FOUND",
      );
    }

    await ensureActiveProfile(
      Teacher,
      teacherId,
      "teacher",
    );

    let assignment;

    try {
      assignment =
        await CourseAssignment.findOneAndUpdate(
          {
  course: courseId,
  teacher: teacherId,
  cohort: cohortId,
},
          {
            $set: {
              isActive: true,
            },
            $setOnInsert: {
              students: [],
            },
          },
          {
            new: true,
            upsert: true,
            runValidators: true,
          },
        );
    } catch (error) {
      if (error.code !== 11000) {
        throw error;
      }

      // Concurrent creation: read the winner.
     assignment = await CourseAssignment.findOne({
  course: courseId,
  teacher: teacherId,
  cohort: cohortId,
});

      if (!assignment) {
        throw error;
      }

      if (!assignment.isActive) {
        assignment.isActive = true;
        await assignment.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: "Teacher assigned successfully.",
      data: {
        assignment,
      },
    });
  },
);

// ==================================================
// ADMIN - ASSIGN STUDENT
// ==================================================

// ==================================================
// ADMIN - ASSIGN STUDENT
// ==================================================

export const assignStudent = asyncHandler(
  async (req, res) => {
    const { assignmentId, studentId } = req.body;

    ensureId(assignmentId);

    // 1. Validate student profile and account
    await ensureActiveProfile(
      Student,
      studentId,
      "student",
    );

    // 2. Find active course assignment
    const existingAssignment =
      await CourseAssignment.findOne({
        _id: assignmentId,
        isActive: true,
      }).lean();

    if (!existingAssignment) {
      throw new AppError(
        "Active assignment not found.",
        404,
        "ASSIGNMENT_NOT_FOUND",
      );
    }

    // 3. Check cohort reference
    if (!existingAssignment.cohort) {
      throw new AppError(
        "Assignment has no cohort.",
        409,
        "ASSIGNMENT_COHORT_REQUIRED",
      );
    }

    // 4. Validate course and cohort curriculum
    const cohort = await validateCourseInCohort(
      existingAssignment.course,
      existingAssignment.cohort,
    );

    if (cohort.status !== "active") {
      throw new AppError(
        "Student assignment requires an active cohort.",
        409,
        "COHORT_NOT_ACTIVE",
      );
    }

    // 5. Check active program enrollment
    const enrollment = await ProgramEnrollment.exists({
      student: studentId,
      cohort: existingAssignment.cohort,
      program: cohort.program,
      status: "active",
    });

    if (!enrollment) {
      throw new AppError(
        "Student must have an active enrollment in this cohort.",
        409,
        "ACTIVE_ENROLLMENT_REQUIRED",
      );
    }

    // 6. Assign student only after validation
    const assignment =
      await CourseAssignment.findOneAndUpdate(
        {
          _id: assignmentId,
          isActive: true,
          cohort: existingAssignment.cohort,
        },
        {
          $addToSet: {
            students: studentId,
          },
        },
        {
          new: true,
          runValidators: true,
        },
      );

    if (!assignment) {
      throw new AppError(
        "Active assignment not found.",
        404,
        "ASSIGNMENT_NOT_FOUND",
      );
    }

    return res.status(200).json({
      success: true,
      message: "Student assigned successfully.",
      data: {
        assignment,
      },
    });
  },
);

// ==================================================
// ADMIN - GET ALL ASSIGNMENTS
// ==================================================

export const getAllAssignments = asyncHandler(
  async (req, res) => {
    const page = Math.max(
      1,
      Number(req.query.page) || 1,
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        Number(req.query.limit) || 20,
      ),
    );

    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.courseId) {
      ensureId(req.query.courseId);
      filter.course = req.query.courseId;
    }

    if (req.query.teacherId) {
      ensureId(req.query.teacherId);
      filter.teacher = req.query.teacherId;
    }

    if (req.query.isActive !== undefined) {
      if (
        !["true", "false"].includes(
          req.query.isActive,
        )
      ) {
        throw new AppError(
          "Invalid isActive filter.",
          400,
          "INVALID_FILTER",
        );
      }

      filter.isActive =
        req.query.isActive === "true";
    }

    const [assignments, total] =
      await Promise.all([
        CourseAssignment.find(filter)
          .populate({
            path: "course",
            select: "code title credits isActive",
          })
          .populate({
            path: "teacher",
            select: "firstName lastName email",
          })
          .populate({
            path: "students",
            select: "studentId firstName lastName",
          })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),

        CourseAssignment.countDocuments(filter),
      ]);

    return res.status(200).json({
      success: true,
      data: {
        assignments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  },
);

// ==================================================
// ADMIN - REMOVE STUDENT FROM ASSIGNMENT
// ==================================================

export const removeStudent = asyncHandler(
  async (req, res) => {
    const { assignmentId, studentId } = req.params;

    ensureId(assignmentId);
    ensureId(studentId);

    const assignment =
      await CourseAssignment.findOneAndUpdate(
        {
          _id: assignmentId,
          isActive: true,
        },
        {
          $pull: {
            students: studentId,
          },
        },
        {
          new: true,
          runValidators: true,
        },
      );

    if (!assignment) {
      throw new AppError(
        "Active assignment not found.",
        404,
        "ASSIGNMENT_NOT_FOUND",
      );
    }

    return res.status(200).json({
      success: true,
      message: "Student removed from assignment.",
      data: {
        assignment,
      },
    });
  },
);

// ==================================================
// ADMIN - REVOKE TEACHER ASSIGNMENT
// ==================================================

export const revokeAssignment = asyncHandler(
  async (req, res) => {
    const { assignmentId } = req.params;

    ensureId(assignmentId);

    const assignment =
      await CourseAssignment.findOneAndUpdate(
        {
          _id: assignmentId,
          isActive: true,
        },
        {
          $set: {
            isActive: false,
          },
        },
        {
          new: true,
          runValidators: true,
        },
      );

    if (!assignment) {
      throw new AppError(
        "Active assignment not found.",
        404,
        "ASSIGNMENT_NOT_FOUND",
      );
    }

    return res.status(200).json({
      success: true,
      message: "Course assignment revoked.",
      data: {
        assignment,
      },
    });
  },
);

// ==================================================
// TEACHER - GET OWN COURSES
// ==================================================

// ==================================================
// TEACHER - GET OWN COURSES
// ==================================================

export const getTeacherCourses = asyncHandler(
  async (req, res) => {
    // 1. Get current teacher profile
    const teacher = await getOwnProfile(
      Teacher,
      req.user._id,
      "TEACHER_NOT_FOUND",
    );

    // 2. Find active cohorts
    const activeCohorts = await Cohort.find({
      status: "active",
    })
      .select("_id")
      .lean();

    const activeCohortIds = activeCohorts.map(
      (cohort) => cohort._id,
    );

    if (activeCohortIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          courses: [],
        },
      });
    }

    // 3. Find teacher's active assignments
    const assignments = await CourseAssignment.find({
      teacher: teacher._id,
      cohort: {
        $in: activeCohortIds,
      },
      isActive: true,
    })
      .populate({
        path: "course",
        match: {
          isActive: true,
        },
        select: "code title description credits",
      })
      .select("course cohort")
      .lean();

    // 4. Return valid courses
    const courses = assignments
      .filter((assignment) => assignment.course)
      .map((assignment) => ({
        assignmentId: assignment._id,
        course: assignment.course,
      }));

    return res.status(200).json({
      success: true,
      data: {
        courses,
      },
    });
  },
);
// ==================================================
// TEACHER - GET STUDENTS OF OWN ASSIGNMENT
// ==================================================
// ==================================================
// TEACHER - GET STUDENTS OF OWN ASSIGNMENT
// ==================================================

export const getTeacherCourseStudents = asyncHandler(
  async (req, res) => {
    const { assignmentId } = req.params;

    ensureId(assignmentId);

    // 1. Get current teacher profile
    const teacher = await getOwnProfile(
      Teacher,
      req.user._id,
      "TEACHER_NOT_FOUND",
    );

    // 2. Find teacher's active assignment
    const assignment = await CourseAssignment.findOne({
      _id: assignmentId,
      teacher: teacher._id,
      isActive: true,
    })
      .populate({
        path: "course",
        match: {
          isActive: true,
        },
        select: "_id",
      })
      .populate({
        path: "students",
        select: "_id userId studentId firstName lastName",
      })
      .lean();

    if (!assignment || !assignment.course) {
      throw new AppError(
        "Assignment not found.",
        404,
        "ASSIGNMENT_NOT_FOUND",
      );
    }

    // 3. Verify active cohort
    const cohort = await Cohort.findOne({
      _id: assignment.cohort,
      status: "active",
    })
      .select("_id program")
      .lean();

    if (!cohort) {
      throw new AppError(
        "Active cohort not found.",
        409,
        "COHORT_NOT_ACTIVE",
      );
    }

    // 4. Get assigned students
    const students = (assignment.students || [])
      .filter(Boolean);

    if (students.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          students: [],
        },
      });
    }

    // 5. Find active student accounts
    const activeUsers = await User.find({
      _id: {
        $in: students.map(
          (student) => student.userId,
        ),
      },
      role: "student",
      isActive: true,
    })
      .select("_id")
      .lean();

    const activeUserIds = new Set(
      activeUsers.map(
        (user) => String(user._id),
      ),
    );

    // 6. Find active enrollments for this cohort
    const activeEnrollments =
      await ProgramEnrollment.find({
        student: {
          $in: students.map(
            (student) => student._id,
          ),
        },
        cohort: cohort._id,
        program: cohort.program,
        status: "active",
      })
        .select("student")
        .lean();

    const enrolledStudentIds = new Set(
      activeEnrollments.map(
        (enrollment) => String(enrollment.student),
      ),
    );

    // 7. Return only eligible students
    const safeStudents = students
      .filter(
        (student) =>
          activeUserIds.has(
            String(student.userId),
          ) &&
          enrolledStudentIds.has(
            String(student._id),
          ),
      )
      .map((student) => ({
        _id: student._id,
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
      }));

    return res.status(200).json({
      success: true,
      data: {
        students: safeStudents,
      },
    });
  },
);

// ==================================================
// STUDENT - GET OWN COURSES
// ==================================================
// ==================================================
// STUDENT - GET OWN COURSES
// ==================================================

export const getStudentCourses = asyncHandler(
  async (req, res) => {
    // 1. Get current student's profile
    const student = await getOwnProfile(
      Student,
      req.user._id,
      "STUDENT_NOT_FOUND",
    );

    // 2. Find student's active enrollments
    const enrollments = await ProgramEnrollment.find({
      student: student._id,
      status: "active",
    })
      .select("cohort")
      .lean();

    const cohortIds = enrollments.map(
      (enrollment) => enrollment.cohort,
    );

    // 3. No active enrollment means no course access
    if (cohortIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          courses: [],
        },
      });
    }

    // 4. Only active cohorts
    const activeCohorts = await Cohort.find({
      _id: {
        $in: cohortIds,
      },
      status: "active",
    })
      .select("_id")
      .lean();

    const activeCohortIds = activeCohorts.map(
      (cohort) => cohort._id,
    );

    if (activeCohortIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          courses: [],
        },
      });
    }

    // 5. Find assignments in active enrolled cohorts
    const assignments = await CourseAssignment.find({
      students: student._id,
      cohort: {
        $in: activeCohortIds,
      },
      isActive: true,
    })
      .populate({
        path: "course",
        match: {
          isActive: true,
        },
        select: "code title description credits",
      })
      .select("course cohort")
      .lean();

    // 6. Remove invalid courses and duplicates
    const courses = [
      ...new Map(
        assignments
          .filter((assignment) => assignment.course)
          .map((assignment) => [
            String(assignment.course._id),
            assignment.course,
          ]),
      ).values(),
    ];

    return res.status(200).json({
      success: true,
      data: {
        courses,
      },
    });
  },
);