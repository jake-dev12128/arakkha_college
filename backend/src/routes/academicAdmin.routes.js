
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

// Authenticate once for all academic admin routes.
router.use(requireAuthentication);

router.use(
  requireRole("super_admin", "admin"),
);

// Academic Management
router.use(academicRoutes);

// Academic Years and Cohorts
router.use(academicOperationsRoutes);

// Student Program Enrollment
router.use(programEnrollmentRoutes);

export default router;
