
import { Router } from "express";

import { requireAuthentication } from
  "../middleware/auth.middleware.js";

import { requireRole } from
  "../middleware/authorization.middleware.js";

import { validate } from
  "../middleware/validation.middleware.js";

import { saveAboutSchema } from
  "../schemas/about.schema.js";

import * as controller from
  "../controllers/about.controller.js";

export const publicAboutRouter = Router();
export const adminAboutRouter = Router();

// Public — no authentication required
publicAboutRouter.get(
  "/about",
  controller.publicAbout
);

// Admin / Super Admin only
adminAboutRouter.use(
  requireAuthentication,
  requireRole("super_admin", "admin")
);

adminAboutRouter.get(
  "/about",
  controller.adminAbout
);

adminAboutRouter.put(
  "/about",
  validate(saveAboutSchema),
  controller.saveAbout
);

adminAboutRouter.patch(
  "/about/publish",
  controller.publishAbout
);

adminAboutRouter.patch(
  "/about/unpublish",
  controller.unpublishAbout
);

adminAboutRouter.delete(
  "/about",
  controller.unpublishAbout
);
