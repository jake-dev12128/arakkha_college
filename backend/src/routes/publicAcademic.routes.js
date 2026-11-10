import express from "express";

import {
  requireAuthentication,
} from "../middleware/auth.middleware.js";

import {
  requireRole,
} from "../middleware/authorization.middleware.js";

import {
  getPublicPrograms,
  getPublicProgram,
  getPublishedProgramCourses,
} from "../controllers/publicAcademic.controller.js";

const router = express.Router();

// Public
router.get(
  "/programs",
  getPublicPrograms
);

router.get(
  "/programs/:programId",
  getPublicProgram
);

// Protected
router.get(
  "/programs/:programId/courses",
  requireAuthentication,
  requireRole(
    "super_admin",
    "admin",
    "teacher",
    "student"
  ),
  getPublishedProgramCourses
);

export default router;