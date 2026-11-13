
import { Router } from "express";

import {
  requireAuthentication,
} from "../middleware/auth.middleware.js";

import {
  requireCmsPermission,
} from "../middleware/teacherReadOnly.middleware.js";

import {
  publicOrganizationChart,
  adminOrganizationChart,
  createOrganizationChart,
  updateOrganizationChart,
  publishOrganizationChart,
  unpublishOrganizationChart,
  removeOrganizationChartDraftImage,
} from "../controllers/organizationChart.controller.js";

// ==========================================
// ROUTERS
// ==========================================

export const publicOrganizationChartRouter = Router();

export const adminOrganizationChartRouter = Router();

// ==========================================
// PUBLIC ORGANIZATION CHART
// No authentication required
// ==========================================

// GET /api/v1/public/organization-chart
publicOrganizationChartRouter.get(
  "/organization-chart",
  publicOrganizationChart
);

// ==========================================
// ADMIN ORGANIZATION CHART
// Authentication + CMS RBAC
// ==========================================

// GET/HEAD:
// super_admin, admin, teacher
//
// POST/PUT/PATCH/DELETE:
// super_admin, admin

adminOrganizationChartRouter.use(
  requireAuthentication,
  requireCmsPermission
);

// ==========================================
// GET ORGANIZATION CHART
// ==========================================

// GET /api/v1/admin/organization-chart
adminOrganizationChartRouter.get(
  "/organization-chart",
  adminOrganizationChart
);

// ==========================================
// CREATE ORGANIZATION CHART
// ==========================================

// POST /api/v1/admin/organization-chart
adminOrganizationChartRouter.post(
  "/organization-chart",
  createOrganizationChart
);

// ==========================================
// UPDATE ORGANIZATION CHART
// ==========================================

// PUT /api/v1/admin/organization-chart
adminOrganizationChartRouter.put(
  "/organization-chart",
  updateOrganizationChart
);

// ==========================================
// PUBLISH ORGANIZATION CHART
// ==========================================

// PATCH /api/v1/admin/organization-chart/publish
adminOrganizationChartRouter.patch(
  "/organization-chart/publish",
  publishOrganizationChart
);

// ==========================================
// UNPUBLISH ORGANIZATION CHART
// ==========================================

// PATCH /api/v1/admin/organization-chart/unpublish
adminOrganizationChartRouter.patch(
  "/organization-chart/unpublish",
  unpublishOrganizationChart
);

// ==========================================
// REMOVE DRAFT IMAGE
// ==========================================

// DELETE /api/v1/admin/organization-chart/draft-image
adminOrganizationChartRouter.delete(
  "/organization-chart/draft-image",
  removeOrganizationChartDraftImage
);
