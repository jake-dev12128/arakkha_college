
import { Router } from "express";

import {
  listPublicCollaborations,
  getPublicCollaboration,
  listAdminCollaborations,
  getAdminCollaboration,
  createCollaboration,
  updateCollaboration,
  publishCollaboration,
  deleteCollaboration,
} from "../controllers/collaborationPartner.controller.js";

import {
  requireAuthentication,
} from "../middleware/auth.middleware.js";

const publicRouter = Router();
const adminRouter = Router();

const requireCollaborationAdmin = (req, res, next) => {
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
// ==================================================

publicRouter.get(
  "/",
  listPublicCollaborations
);

publicRouter.get(
  "/:id",
  getPublicCollaboration
);

// ==================================================
// ADMIN ROUTES
// ==================================================

adminRouter.use(
  requireAuthentication,
  requireCollaborationAdmin
);

adminRouter.get(
  "/",
  listAdminCollaborations
);

adminRouter.get(
  "/:id",
  getAdminCollaboration
);

adminRouter.post(
  "/",
  createCollaboration
);

adminRouter.patch(
  "/:id",
  updateCollaboration
);

adminRouter.patch(
  "/:id/publication",
  publishCollaboration
);

adminRouter.delete(
  "/:id",
  deleteCollaboration
);

export {
  publicRouter as publicCollaborationRoutes,
  adminRouter as adminCollaborationRoutes,
};
