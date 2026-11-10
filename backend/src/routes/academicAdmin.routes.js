
import express from "express";

import {
  requireAuthentication,
} from "../middleware/auth.middleware.js";

import {
  requireRole,
} from "../middleware/authorization.middleware.js";

import academicRoutes from "./academic.routes.js";
import academicOperationsRoutes from "./academicOperations.routes.js";
import programEnrollmentRoutes from "./programEnrollment.routes.js";

const router = express.Router();

// ==========================================
// AUTHENTICATION
// ==========================================

// All academic management routes require
// an authenticated and active user.
router.use(requireAuthentication);

// ==========================================
// ACADEMIC READ-ONLY RBAC
// ==========================================

// Teacher:
//   GET / HEAD -> Allowed
//   POST / PUT / PATCH / DELETE -> Forbidden
//
// Admin / Super Admin:
//   Existing read and write permissions
//
// Student:
//   No access to admin academic routes

const requireAcademicPermission = (
  req,
  res,
  next
) => {
  if (
    req.method === "GET" ||
    req.method === "HEAD"
  ) {
    return requireRole(
      "super_admin",
      "admin",
      "teacher"
    )(req, res, next);
  }

  return requireRole(
    "super_admin",
    "admin"
  )(req, res, next);
};

router.use(requireAcademicPermission);

// ==========================================
// ACADEMIC MANAGEMENT
// ==========================================

// Programs, Courses, Curricula
router.use(academicRoutes);

// Academic Years, Cohorts
router.use(academicOperationsRoutes);

// Program Enrollments
router.use(programEnrollmentRoutes);

export default router;
