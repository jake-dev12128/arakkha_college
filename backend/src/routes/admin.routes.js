
import express from "express";

import {
  requireAuthentication,
} from "../middleware/auth.middleware.js";

import {
  requireRole,
} from "../middleware/authorization.middleware.js";

import {
  validate,
} from "../middleware/validation.middleware.js";

import {
  createManagedUserController,
} from "../controllers/managed-user.controller.js";

import {
  listManagedUsersController,
  getManagedUserController,
  updateManagedUserController,
  deactivateManagedUserController,
  reactivateManagedUserController,
  permanentlyDeleteManagedUserController,
  getAdminDashboardStatsController,
} from "../controllers/userManagement.controller.js";

import {
  createManagedUserSchema,
} from "../schemas/managed-user.schema.js";

import {
  listManagedUsersSchema,
  updateManagedUserSchema,
  deactivateManagedUserSchema,
  reactivateManagedUserSchema,
  permanentlyDeleteUserSchema,
} from "../schemas/userManagement.schema.js";

import {
  profileListSchema,
  updateProfileSchema,
} from "../schemas/profileManagement.schema.js";

import {
  listProfiles,
  getProfile,
  getProfileByUserId,
  updateProfile,
  deactivateProfile,
} from "../controllers/profileManagement.controller.js";

const router = express.Router();

// ==================================================
// QUERY VALIDATION HELPER
// ==================================================

const validateQuery = (schema, localKey) => {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters.",
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    res.locals[localKey] = parsed.data;

    return next();
  };
};

// ==================================================
// ADMIN AUTHENTICATION
// ==================================================

router.use(requireAuthentication);

// ==================================================
// CREATE MANAGED USER
//
// super_admin -> all roles
// admin       -> admin, teacher, student
// teacher     -> student
// ==================================================

router.post(
  "/users",
  requireRole(
    "super_admin",
    "admin",
    "teacher"
  ),
  validate(createManagedUserSchema),
  createManagedUserController
);

// ==================================================
// LIST MANAGED USERS
// ==================================================

router.get(
  "/users",
  requireRole("super_admin", "admin"),
  validateQuery(
    listManagedUsersSchema,
    "userListQuery"
  ),
  listManagedUsersController
);

// ==================================================
// GET MANAGED USER
// ==================================================

router.get(
  "/users/:id",
  requireRole("super_admin", "admin"),
  getManagedUserController
);

// ==================================================
// UPDATE MANAGED USER
// ==================================================

router.patch(
  "/users/:id",
  requireRole("super_admin", "admin"),
  validate(updateManagedUserSchema),
  updateManagedUserController
);

// ==================================================
// DEACTIVATE MANAGED USER
// ==================================================
//
// SECURITY:
// Disabled until Clerk session revocation,
// reconciliation, and lifecycle audit handling
// are completed.
//
// Do not expose a partially implemented
// deactivation workflow in production.
// ==================================================

router.patch(
  "/users/:id/deactivate",
  requireRole("super_admin", "admin"),
  validate(deactivateManagedUserSchema),
  (req, res) => {
    return res.status(503).json({
      success: false,
      message:
        "Account deactivation is temporarily unavailable until session revocation is fully implemented.",
      code: "USER_DEACTIVATION_NOT_READY",
    });
  }
);

// ==================================================
// REACTIVATE MANAGED USER
// ==================================================
//
// Reactivation is also disabled until the
// account lifecycle workflow is complete.
// ==================================================

router.patch(
  "/users/:id/reactivate",
  requireRole("super_admin", "admin"),
  validate(reactivateManagedUserSchema),
  (req, res) => {
    return res.status(503).json({
      success: false,
      message:
        "Account reactivation is temporarily unavailable until account lifecycle handling is complete.",
      code: "USER_REACTIVATION_NOT_READY",
    });
  }
);

// ==================================================
// PERMANENT DELETE MANAGED USER
// ==================================================
//
// Only super_admin can request deletion.
//
// The service currently blocks deletion
// until academic dependency checks are
// implemented.
// ==================================================

router.delete(
  "/users/:id",
  requireRole("super_admin"),
  validate(permanentlyDeleteUserSchema),
  permanentlyDeleteManagedUserController
);

// ==================================================
// STUDENT / TEACHER PROFILE MANAGEMENT
// ==================================================

const validateProfileListQuery = validateQuery(
  profileListSchema,
  "profileQuery"
);

for (const [path, role] of [
  ["students", "student"],
  ["teachers", "teacher"],
]) {
  // ----------------------------------------------
  // LIST PROFILES
  // ----------------------------------------------

  router.get(
    `/${path}`,
    requireRole("super_admin", "admin"),
    validateProfileListQuery,
    listProfiles(role)
  );

  // ----------------------------------------------
  // GET PROFILE BY USER ID
  // ----------------------------------------------

  router.get(
    `/${path}/by-user/:userId`,
    requireRole("super_admin", "admin"),
    getProfileByUserId(role)
  );

  // ----------------------------------------------
  // GET PROFILE BY PROFILE ID
  // ----------------------------------------------

  router.get(
    `/${path}/:id`,
    requireRole("super_admin", "admin"),
    getProfile(role)
  );

  // ----------------------------------------------
  // UPDATE PROFILE
  // ----------------------------------------------

  router.patch(
    `/${path}/:id`,
    requireRole("super_admin", "admin"),
    validate(updateProfileSchema),
    updateProfile(role)
  );

  // ----------------------------------------------
  // DEACTIVATE PROFILE
  // ----------------------------------------------

  router.patch(
    `/${path}/:id/deactivate`,
    requireRole("super_admin", "admin"),
    deactivateProfile(role)
  );
}

// ==================================================
// ADMIN DASHBOARD STATISTICS
// ==================================================

router.get(
  "/dashboard/stats",
  requireRole("super_admin", "admin"),
  getAdminDashboardStatsController
);

// ==================================================
// EXISTING ADMIN DASHBOARD
// ==================================================

router.get(
  "/admin-dashboard",
  requireRole("super_admin", "admin"),
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: "Welcome to admin dashboard.",
    });
  }
);

export default router;
