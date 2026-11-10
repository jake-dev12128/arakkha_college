
import { Router } from "express";
import {
  requireCmsPermission,
} from "../middleware/teacherReadOnly.middleware.js";
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
  requireCmsPermission
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
