
import { Router } from "express";
import {
  requireCmsPermission,
} from "../middleware/teacherReadOnly.middleware.js";
import {
  listPublicFaculty,
  getPublicFaculty,
  listAdminFaculty,
  getAdminFaculty,
  createFaculty,
  updateFaculty,
  publishFaculty,
  deleteFaculty,
} from "../controllers/facultyMember.controller.js";

import {
  requireAuthentication,
} from "../middleware/auth.middleware.js";

// ==================================================
// ROUTERS
// ==================================================

const publicRouter = Router();
const adminRouter = Router();

// ==================================================
// ADMIN / SUPER ADMIN AUTHORIZATION
// ==================================================



// ==================================================
// PUBLIC ROUTES
// No authentication required
// ==================================================

publicRouter.get(
  "/",
  listPublicFaculty
);

publicRouter.get(
  "/:id",
  getPublicFaculty
);

// ==================================================
// ADMIN MIDDLEWARE
// ==================================================

adminRouter.use(
  requireAuthentication,
  requireCmsPermission
);

// ==================================================
// ADMIN ROUTES
// ==================================================

adminRouter.get(
  "/",
  listAdminFaculty
);

adminRouter.get(
  "/:id",
  getAdminFaculty
);

adminRouter.post(
  "/",
  createFaculty
);

adminRouter.patch(
  "/:id",
  updateFaculty
);

adminRouter.patch(
  "/:id/publication",
  publishFaculty
);

adminRouter.delete(
  "/:id",
  deleteFaculty
);

// ==================================================
// EXPORT
// ==================================================

export {
  publicRouter as publicFacultyRoutes,
  adminRouter as adminFacultyRoutes,
};
