
import express from "express";

import {
  requireAuthentication,
} from "../middleware/auth.middleware.js";

import {
  requireRole,
} from "../middleware/authorization.middleware.js";

import {
  strictRateLimiter,
} from "../middleware/rateLimit.middleware.js";

import {
  checkAcademicDeleteEligibility,
  deleteAcademicRecord,
} from "../controllers/academicSafeDelete.controller.js";

const router = express.Router();

// ==================================================
// AUTHENTICATION
// ==================================================

// All Safe Delete routes require a valid session.

router.use(requireAuthentication);

// ==================================================
// AUTHORIZATION
// ==================================================

// Only Super Admin and Admin can access these APIs.

router.use(
  requireRole("super_admin", "admin"),
);

// ==================================================
// GET DELETE ELIGIBILITY
// ==================================================
//
// GET /api/v1/admin/academic-delete/:resource/:id/eligibility
//
// ==================================================

router.get(
  "/:resource/:id/eligibility",
  checkAcademicDeleteEligibility,
);

// ==================================================
// SAFE DELETE
// ==================================================
//
// DELETE /api/v1/admin/academic-delete/:resource/:id
//
// ==================================================

router.delete(
  "/:resource/:id",
  strictRateLimiter,
  deleteAcademicRecord,
);

export default router;
