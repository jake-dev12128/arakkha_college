
import mongoose from "mongoose";

import Program from "../models/program.model.js";
import Course from "../models/course.model.js";
import Curriculum from "../models/curriculum.model.js";
import AcademicYear from "../models/academicYear.model.js";
import Cohort from "../models/cohort.model.js";
import ProgramEnrollment from "../models/programEnrollment.model.js";
import CourseAssignment from "../models/courseAssignment.model.js";

import AppError from "../utils/AppError.js";

// ==================================================
// RESOURCE REGISTRY
// ==================================================

const RESOURCES = Object.freeze({
  programs: Program,
  courses: Course,
  curricula: Curriculum,
  "academic-years": AcademicYear,
  cohorts: Cohort,
  "program-enrollments": ProgramEnrollment,
});

// ==================================================
// HELPERS
// ==================================================

const validateResource = (resource) => {
  const Model = RESOURCES[resource];

  if (!Model) {
    throw new AppError(
      "Unsupported academic resource.",
      400,
      "INVALID_ACADEMIC_RESOURCE",
    );
  }

  return Model;
};

const validateId = (id) => {
  if (
    typeof id !== "string" ||
    !/^[a-f\d]{24}$/i.test(id)
  ) {
    throw new AppError(
      "Invalid academic record ID.",
      400,
      "INVALID_RECORD_ID",
    );
  }

  return id;
};

const dependency = (name, count) => ({
  name,
  count,
});

const hasDependencies = (dependencies) =>
  dependencies.some((item) => item.count > 0);

const blockedError = (dependencies) => {
  const details = dependencies
    .filter((item) => item.count > 0)
    .map((item) => `${item.name}: ${item.count}`)
    .join(", ");

  return new AppError(
    `Cannot delete record. Related data exists: ${details}`,
    409,
    "ACADEMIC_DELETE_BLOCKED",
  );
};

// ==================================================
// DEPENDENCY CHECKS
// ==================================================

const getDependencies = async (
  resource,
  id,
  session = null,
) => {
  const options = session ? { session } : {};

  switch (resource) {
    case "programs": {
      const [
        curricula,
        cohorts,
        enrollments,
      ] = await Promise.all([
        Curriculum.countDocuments(
          { program: id },
          options,
        ),
        Cohort.countDocuments(
          { program: id },
          options,
        ),
        ProgramEnrollment.countDocuments(
          { program: id },
          options,
        ),
      ]);

      return [
        dependency("Curricula", curricula),
        dependency("Cohorts", cohorts),
        dependency("Program Enrollments", enrollments),
      ];
    }

    case "courses": {
      const [
        curricula,
        prerequisites,
        assignments,
      ] = await Promise.all([
        Curriculum.countDocuments(
          { "semesters.courses.course": id },
          options,
        ),
        Course.countDocuments(
          { prerequisites: id },
          options,
        ),
        CourseAssignment.countDocuments(
          { course: id },
          options,
        ),
      ]);

      return [
        dependency("Curricula", curricula),
        dependency("Course Prerequisites", prerequisites),
        dependency("Course Assignments", assignments),
      ];
    }

    case "curricula": {
      const cohorts = await Cohort.countDocuments(
        { curriculum: id },
        options,
      );

      return [
        dependency("Cohorts", cohorts),
      ];
    }

    case "academic-years": {
      const cohorts = await Cohort.countDocuments(
        { academicYear: id },
        options,
      );

      return [
        dependency("Cohorts", cohorts),
      ];
    }

   case "cohorts": {
  const [
    enrollments,
    assignments,
  ] = await Promise.all([
    ProgramEnrollment.countDocuments(
      { cohort: id },
      options,
    ),

    CourseAssignment.countDocuments(
      { cohort: id },
      options,
    ),
  ]);

  return [
    dependency("Program Enrollments", enrollments),
    dependency("Course Assignments", assignments),
  ];
}

    default:
      return [];
  }
};

// ==================================================
// GET DELETE ELIGIBILITY
// ==================================================

export const getAcademicDeleteEligibility = async (
  resource,
  id,
) => {
  const Model = validateResource(resource);

  validateId(id);

  const record = await Model.findById(id).lean();

  if (!record) {
    throw new AppError(
      "Academic record not found.",
      404,
      "ACADEMIC_RECORD_NOT_FOUND",
    );
  }

  // Academic history must not be permanently deleted.

  if (resource === "program-enrollments") {
    return {
      resource,
      recordId: id,
      canDelete: false,
      recommendedAction: "status-change",
      reason:
        "Enrollment history must be preserved.",
      dependencies: [],
    };
  }

  const dependencies = await getDependencies(
    resource,
    id,
  );

  const blocked = hasDependencies(dependencies);

  // Only draft curricula are eligible.

  const draftRequired =
    resource === "curricula" &&
    record.status !== "draft";

  // Only unpublished programs are eligible.

  const unpublishedRequired =
    resource === "programs" &&
    record.isPublished === true;

  // Only planned academic years and cohorts.

  const plannedRequired =
    ["academic-years", "cohorts"].includes(resource) &&
    record.status !== "planned";

  const canDelete =
    !blocked &&
    !draftRequired &&
    !unpublishedRequired &&
    !plannedRequired;

  let reason = null;

  if (blocked) {
    reason = "Related academic records exist.";
  } else if (draftRequired) {
    reason =
      "Only draft curricula can be deleted.";
  } else if (unpublishedRequired) {
    reason =
      "Published programs cannot be deleted.";
  } else if (plannedRequired) {
    reason =
      "Only planned records can be deleted.";
  }

  const recommendedAction =
    ["programs", "courses", "curricula"].includes(resource)
      ? "archive"
      : "none";

  return {
    resource,
    recordId: id,
    canDelete,
    recommendedAction,
    reason,
    dependencies,
  };
};

// ==================================================
// PERMANENT SAFE DELETE
// ==================================================

export const safeDeleteAcademicRecord = async (
  resource,
  id,
) => {
  const Model = validateResource(resource);

  validateId(id);

  if (resource === "program-enrollments") {
    throw new AppError(
      "Enrollment history cannot be permanently deleted.",
      409,
      "ENROLLMENT_DELETE_FORBIDDEN",
    );
  }

  // This implementation uses a transaction for the
  // eligibility check and delete operation.
  //
  // MongoDB must support transactions.
  // Production requires a replica set or Atlas.
  //
  // IMPORTANT:
  // Concurrent writes to related collections can
  // still create race conditions unless the
  // corresponding create/assignment services
  // participate in a coordinated locking protocol.

  const session = await mongoose.startSession();

  try {
    let deletedRecord = null;

    await session.withTransaction(async () => {
      const record = await Model.findById(id)
        .session(session);

      if (!record) {
        throw new AppError(
          "Academic record not found.",
          404,
          "ACADEMIC_RECORD_NOT_FOUND",
        );
      }

      const dependencies = await getDependencies(
        resource,
        id,
        session,
      );

      if (hasDependencies(dependencies)) {
        throw blockedError(dependencies);
      }

      if (
        resource === "curricula" &&
        record.status !== "draft"
      ) {
        throw new AppError(
          "Only draft curricula can be deleted.",
          409,
          "CURRICULUM_DELETE_BLOCKED",
        );
      }

      if (
        resource === "programs" &&
        record.isPublished
      ) {
        throw new AppError(
          "Published programs cannot be deleted.",
          409,
          "PROGRAM_DELETE_BLOCKED",
        );
      }

      if (
        ["academic-years", "cohorts"].includes(resource) &&
        record.status !== "planned"
      ) {
        throw new AppError(
          "Only planned records can be deleted.",
          409,
          "ACADEMIC_STATUS_DELETE_BLOCKED",
        );
      }

      deletedRecord = {
        _id: record._id,
        resource,
        code: record.code || null,
        name:
          record.name ||
          record.title ||
          record.version ||
          null,
      };

      await Model.deleteOne(
        { _id: record._id },
        { session },
      );
    });

    return {
      deleted: true,
      record: deletedRecord,
    };
  } finally {
    await session.endSession();
  }
};
