
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

import {
  toPublicImageUrl,
} from "../utils/imageDelivery.js";

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
// IMAGE DELIVERY RESPONSE MAPPING
// ==========================================

// Preserve original Cloudinary URLs.
// Add delivery URLs for display only.
// Never mutate the original service result.

const mapImageDelivery = (image) => {
  if (!image) {
    return image;
  }

  const record =
    typeof image.toObject === "function"
      ? image.toObject()
      : image;

  return {
    ...record,
    deliveryUrl: record.url
      ? toPublicImageUrl(record.url)
      : null,
  };
};

const mapAdminChartDelivery = (chart) => {
  if (!chart) {
    return chart;
  }

  const record =
    typeof chart.toObject === "function"
      ? chart.toObject()
      : chart;

  return {
    ...record,

    draftImage: mapImageDelivery(
      record.draftImage
    ),

    publishedImage: mapImageDelivery(
      record.publishedImage
    ),
  };
};

const mapPublicChartDelivery = (chart) => {
  if (!chart) {
    return chart;
  }

  const record =
    typeof chart.toObject === "function"
      ? chart.toObject()
      : chart;

  return {
    ...record,

    imageDeliveryUrl: record.imageUrl
      ? toPublicImageUrl(record.imageUrl)
      : null,
  };
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
      chart: mapPublicChartDelivery(chart),
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
      chart: mapAdminChartDelivery(chart),
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
        chart: mapAdminChartDelivery(chart),
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
      chart: mapAdminChartDelivery(chart),
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
      chart: mapAdminChartDelivery(chart),
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
      chart: mapAdminChartDelivery(chart),
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
      chart: mapAdminChartDelivery(chart),
    });
  });
