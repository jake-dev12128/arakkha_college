
import { Router } from "express";

import {
  requireAuthentication,
} from "../middleware/auth.middleware.js";

import {
  requireRole,
} from "../middleware/authorization.middleware.js";

import {
  createRateLimiter,
} from "../middleware/rateLimit.middleware.js";

import {
  publicSubmitContact,
  adminListContacts,
  adminGetContact,
  adminUpdateContact,
  adminReplyContact,
} from "../controllers/contact.controller.js";

// ==========================================
// ACC CONTACT ROUTES
// ==========================================

const publicContactRoutes = Router();
const adminContactRoutes = Router();

// ==========================================
// PUBLIC RATE LIMITER
// ==========================================

const contactSubmitRateLimiter =
  createRateLimiter({
    name: "contact-public-submit",
    limit: 5,
    windowSeconds: 600,
    keyGenerator: (req) => req.ip || "unknown",
    failOpen: false,
  });

// ==========================================
// ADMIN REPLY RATE LIMITER
// ==========================================

const contactReplyRateLimiter =
  createRateLimiter({
    name: "contact-admin-reply",
    limit: 10,
    windowSeconds: 60,
    keyGenerator: (req) =>
      req.user?._id?.toString() ||
      req.ip ||
      "unknown",
    failOpen: false,
  });

// ==========================================
// PUBLIC CONTACT
// ==========================================

// POST /api/v1/public/contact

publicContactRoutes.post(
  "/",
  contactSubmitRateLimiter,
  publicSubmitContact,
);

// ==========================================
// ADMIN AUTHENTICATION + RBAC
// ==========================================

adminContactRoutes.use(
  requireAuthentication,
  requireRole("super_admin", "admin"),
);

// ==========================================
// ADMIN CONTACT MANAGEMENT
// ==========================================

// GET /api/v1/admin/contacts

adminContactRoutes.get(
  "/",
  adminListContacts,
);

// GET /api/v1/admin/contacts/:id

adminContactRoutes.get(
  "/:id",
  adminGetContact,
);

// PATCH /api/v1/admin/contacts/:id

adminContactRoutes.patch(
  "/:id",
  adminUpdateContact,
);

// POST /api/v1/admin/contacts/:id/replies

adminContactRoutes.post(
  "/:id/replies",
  contactReplyRateLimiter,
  adminReplyContact,
);

// ==========================================
// EXPORT
// ==========================================

export {
  publicContactRoutes,
  adminContactRoutes,
};
