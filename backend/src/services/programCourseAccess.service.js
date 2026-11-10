
import Student from "../models/student.model.js";
import Teacher from "../models/teacher.model.js";
import Cohort from "../models/cohort.model.js";
import ProgramEnrollment from "../models/programEnrollment.model.js";
import CourseAssignment from "../models/courseAssignment.model.js";
import AppError from "../utils/AppError.js";

const id = (value) => String(value);

const ADMIN_ROLES = new Set([
  "admin",
  "super_admin",
]);

/**
 * Returns the course IDs this user may see
 * within the requested program.
 *
 * null = administrator (unrestricted published catalog)
 *
 * Throws 403 for users without an eligible
 * enrollment and/or active course assignment.
 */
export const getAllowedProgramCourseIds = async (
  user,
  programId
) => {
  // ==========================================
  // 1. VERIFY AUTHENTICATED ACTIVE USER
  // ==========================================

  if (!user?._id || !user.isActive) {
    throw new AppError(
      "Active authentication required.",
      401,
      "AUTHENTICATION_REQUIRED"
    );
  }

  // ==========================================
  // 2. ADMIN / SUPER ADMIN
  // ==========================================

 // Admins and teachers can view all
// published program course information.
//
// This does NOT grant access to
// unassigned lessons or videos.

if (
  ADMIN_ROLES.has(user.role) ||
  user.role === "teacher"
) {
  return null;
}

  // ==========================================
  // 3. FIND ACTIVE COHORTS IN THIS PROGRAM
  // ==========================================

  const activeCohorts = await Cohort.find({
    program: programId,
    status: "active",
  })
    .select("_id program")
    .lean();

  const cohortIds = activeCohorts.map(
    (cohort) => cohort._id
  );

  if (!cohortIds.length) {
    throw new AppError(
      "You are not assigned to this program.",
      403,
      "PROGRAM_ACCESS_DENIED"
    );
  }

  let assignments;

  // ==========================================
  // 4. STUDENT ACCESS
  // ==========================================

  if (user.role === "student") {
    const student = await Student.findOne({
      userId: user._id,
    })
      .select("_id")
      .lean();

    if (!student) {
      throw new AppError(
        "Student profile not found.",
        403,
        "PROGRAM_ACCESS_DENIED"
      );
    }

    // Student must have an active enrollment
    // in the requested program and cohort.

    const enrollments =
      await ProgramEnrollment.find({
        student: student._id,
        program: programId,
        cohort: {
          $in: cohortIds,
        },
        status: "active",
      })
        .select("cohort")
        .lean();

    const enrolledCohorts = enrollments.map(
      (entry) => entry.cohort
    );

    if (!enrolledCohorts.length) {
      throw new AppError(
        "You are not enrolled in this program.",
        403,
        "PROGRAM_ACCESS_DENIED"
      );
    }

    // Student must be included in an active
    // course assignment within an enrolled cohort.

    assignments = await CourseAssignment.find({
      students: student._id,
      cohort: {
        $in: enrolledCohorts,
      },
      isActive: true,
    })
      .select("course")
      .lean();

  // ==========================================
  // 5. TEACHER ACCESS
  // ==========================================

  } else if (user.role === "teacher") {
    const teacher = await Teacher.findOne({
      userId: user._id,
    })
      .select("_id")
      .lean();

    if (!teacher) {
      throw new AppError(
        "Teacher profile not found.",
        403,
        "PROGRAM_ACCESS_DENIED"
      );
    }

    // Teacher must have an active course
    // assignment in this program.

    assignments = await CourseAssignment.find({
      teacher: teacher._id,
      cohort: {
        $in: cohortIds,
      },
      isActive: true,
    })
      .select("course")
      .lean();

  // ==========================================
  // 6. DENY UNKNOWN ROLES
  // ==========================================

  } else {
    throw new AppError(
      "Course access denied.",
      403,
      "PROGRAM_ACCESS_DENIED"
    );
  }

  // ==========================================
  // 7. COLLECT ALLOWED COURSE IDS
  // ==========================================

  const allowed = new Set(
    assignments.map((assignment) =>
      id(assignment.course)
    )
  );

  if (!allowed.size) {
    throw new AppError(
      "You have no assigned courses in this program.",
      403,
      "PROGRAM_ACCESS_DENIED"
    );
  }

  return allowed;
};
