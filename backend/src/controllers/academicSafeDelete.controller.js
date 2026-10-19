
import {
  getAcademicDeleteEligibility,
  safeDeleteAcademicRecord,
} from "../services/academicSafeDelete.service.js";

import { asyncHandler } from "../utils/asyncHandler.js";

import AppError from "../utils/AppError.js";

// ==================================================
// ALLOWED RESOURCES
// ==================================================

const ALLOWED_RESOURCES = new Set([
  "programs",
  "courses",
  "curricula",
  "academic-years",
  "cohorts",
  "program-enrollments",
]);

// ==================================================
// HELPERS
// ==================================================

const validateResource = (resource) => {
  if (!ALLOWED_RESOURCES.has(resource)) {
    throw new AppError(
      "Unsupported academic resource.",
      400,
      "INVALID_ACADEMIC_RESOURCE",
    );
  }

  return resource;
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

// ==================================================
// GET DELETE ELIGIBILITY
// ==================================================
//
// GET
// /api/v1/admin/academic-delete/:resource/:id/eligibility
//
// Returns:
// - canDelete
// - recommendedAction
// - reason
// - dependencies
//
// ==================================================

export const checkAcademicDeleteEligibility =
  asyncHandler(async (req, res) => {
    const resource = validateResource(
      req.params.resource,
    );

    const id = validateId(req.params.id);

    const result =
      await getAcademicDeleteEligibility(
        resource,
        id,
      );

    return res.status(200).json({
      success: true,

      message: result.canDelete
        ? "Academic record is eligible for deletion."
        : "Academic record cannot be deleted.",

      data: {
        resource: result.resource,

        recordId: result.recordId,

        canDelete: result.canDelete,

        recommendedAction:
          result.recommendedAction,

        reason: result.reason,

        dependencies: result.dependencies,
      },
    });
  });

// ==================================================
// DELETE ACADEMIC RECORD
// ==================================================
//
// DELETE
// /api/v1/admin/academic-delete/:resource/:id
//
// Performs:
// - Resource validation
// - MongoDB ObjectId validation
// - Dependency checks
// - Academic status checks
// - Transaction-based deletion
//
// Authorization must be enforced by route middleware.
//
// ==================================================

export const deleteAcademicRecord =
  asyncHandler(async (req, res) => {
    const resource = validateResource(
      req.params.resource,
    );

    const id = validateId(req.params.id);

    // ----------------------------------------------
    // PRE-CHECK
    // ----------------------------------------------
    //
    // This improves the error response but is not
    // the final authorization or integrity check.
    //
    // The service must recheck dependencies
    // inside the transaction.
    // ----------------------------------------------

    const eligibility =
      await getAcademicDeleteEligibility(
        resource,
        id,
      );

    if (!eligibility.canDelete) {
      return res.status(409).json({
        success: false,

        message:
          eligibility.reason ||
          "This academic record cannot be deleted.",

        code: "ACADEMIC_DELETE_BLOCKED",

        data: {
          resource,

          recordId: id,

          recommendedAction:
            eligibility.recommendedAction,

          dependencies:
            eligibility.dependencies,
        },
      });
    }

    // ----------------------------------------------
    // SAFE DELETE
    // ----------------------------------------------

    const result =
      await safeDeleteAcademicRecord(
        resource,
        id,
      );

    // ----------------------------------------------
    // RESPONSE
    // ----------------------------------------------

    return res.status(200).json({
      success: true,

      message:
        "Academic record deleted successfully.",

      data: {
        deleted: result.deleted,

        record: result.record,
      },
    });
  });
