
import { asyncHandler } from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";

import * as organizationChartService from "../services/organizationChart.service.js";

import {
  createOrganizationChartSchema,
  updateOrganizationChartSchema,
  publishOrganizationChartSchema,
  unpublishOrganizationChartSchema,
  removeOrganizationChartImageSchema,
} from "../schemas/organizationChart.schema.js";

// ==========================================
// RESPONSE HELPERS
// ==========================================

const sendSuccess = (
  res,
  data,
  statusCode = 200
) => {
  return res.status(statusCode).json({
    success: true,
    data,
  });
};

// ==========================================
// ZOD VALIDATION
// ==========================================

const validate = (schema, value) => {
  const result = schema.safeParse(value);

  if (!result.success) {
    const error = new AppError(
      "Validation failed.",
      400,
      "VALIDATION_ERROR"
    );

    error.details = result.error.issues.map(
      (issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })
    );

    throw error;
  }

  return result.data;
};

// ==========================================
// AUTHENTICATED ACTOR
// ==========================================

const getActorId = (req) => {
  const actorId = req.user?._id;

  if (!actorId) {
    throw new AppError(
      "Authentication required.",
      401,
      "AUTHENTICATION_REQUIRED"
    );
  }

  return actorId;
};

// ==========================================
// PUBLIC ORGANIZATION CHART
// GET /api/v1/public/organization-chart
// ==========================================

export const publicOrganizationChart = asyncHandler(
  async (req, res) => {
    const chart =
      await organizationChartService.getPublicOrganizationChart();

    if (!chart) {
      throw new AppError(
        "Published organization chart is not available.",
        404,
        "ORGANIZATION_CHART_NOT_PUBLISHED"
      );
    }

    return sendSuccess(res, {
      chart,
    });
  }
);

// ==========================================
// ADMIN ORGANIZATION CHART
// GET /api/v1/admin/organization-chart
// ==========================================

export const adminOrganizationChart = asyncHandler(
  async (req, res) => {
    getActorId(req);

    const chart =
      await organizationChartService.getAdminOrganizationChart();

    return sendSuccess(res, {
      chart: chart ?? null,
    });
  }
);

// ==========================================
// CREATE ORGANIZATION CHART
// POST /api/v1/admin/organization-chart
// ==========================================

export const createOrganizationChart = asyncHandler(
  async (req, res) => {
    const actorId = getActorId(req);

    const payload = validate(
      createOrganizationChartSchema,
      req.body
    );

    const chart =
      await organizationChartService.createOrganizationChart({
        actorId,
        ...payload,
      });

    return sendSuccess(
      res,
      {
        message: "Organization chart created successfully.",
        chart,
      },
      201
    );
  }
);

// ==========================================
// UPDATE ORGANIZATION CHART DRAFT
// PUT /api/v1/admin/organization-chart
// ==========================================

export const updateOrganizationChart = asyncHandler(
  async (req, res) => {
    const actorId = getActorId(req);

    const payload = validate(
      updateOrganizationChartSchema,
      req.body
    );

    const chart =
      await organizationChartService.updateOrganizationChart({
        actorId,
        ...payload,
      });

    return sendSuccess(res, {
      message: "Organization chart updated successfully.",
      chart,
    });
  }
);

// ==========================================
// PUBLISH ORGANIZATION CHART
// PATCH /api/v1/admin/organization-chart/publish
// ==========================================

export const publishOrganizationChart = asyncHandler(
  async (req, res) => {
    const actorId = getActorId(req);

    validate(
      publishOrganizationChartSchema,
      req.body ?? {}
    );

    const chart =
      await organizationChartService.publishOrganizationChart({
        actorId,
      });

    return sendSuccess(res, {
      message: "Organization chart published successfully.",
      chart,
    });
  }
);

// ==========================================
// UNPUBLISH ORGANIZATION CHART
// PATCH /api/v1/admin/organization-chart/unpublish
// ==========================================

export const unpublishOrganizationChart = asyncHandler(
  async (req, res) => {
    const actorId = getActorId(req);

    validate(
      unpublishOrganizationChartSchema,
      req.body ?? {}
    );

    const chart =
      await organizationChartService.unpublishOrganizationChart({
        actorId,
      });

    return sendSuccess(res, {
      message: "Organization chart unpublished successfully.",
      chart,
    });
  }
);

// ==========================================
// REMOVE DRAFT IMAGE
// DELETE /api/v1/admin/organization-chart/draft-image
// ==========================================

export const removeOrganizationChartDraftImage =
  asyncHandler(async (req, res) => {
    const actorId = getActorId(req);

    validate(
      removeOrganizationChartImageSchema,
      req.body ?? {}
    );

    const chart =
      await organizationChartService.removeOrganizationChartDraftImage({
        actorId,
      });

    return sendSuccess(res, {
      message: "Draft image removed successfully.",
      chart,
    });
  });
