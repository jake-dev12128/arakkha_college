
import { Router } from "express";

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

const requireFacultyAdmin = (req, res, next) => {
  const allowedRoles = new Set([
    "admin",
    "super_admin",
  ]);

  if (!req.user || !allowedRoles.has(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Insufficient permissions.",
      code: "FORBIDDEN",
    });
  }

  next();
};

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
  requireFacultyAdmin
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
