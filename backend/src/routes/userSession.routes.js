import express from "express";

import {
  getUserSessions,
  getCurrentSession,
  revokeSession,
  revokeOtherSessions,
} from "../controllers/userSession.controller.js";

import {
  requireAuthentication,
} from "../middleware/auth.middleware.js";

import {
  strictRateLimiter,
} from "../middleware/rateLimit.middleware.js";

const router = express.Router();

router.get(
  "/",
  requireAuthentication,
  getUserSessions
);

router.get(
  "/current",
  requireAuthentication,
  getCurrentSession
);

// REVOKE ALL OTHER SESSIONS
router.post(
  "/revoke-others",
  strictRateLimiter,
  requireAuthentication,
  revokeOtherSessions
);

// REVOKE SPECIFIC SESSION
router.delete(
  "/:sessionId",
  strictRateLimiter,
  requireAuthentication,
  revokeSession
);

export default router;