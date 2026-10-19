
import express from "express";

import {
  forgotPasswordController,
  verifyForgotPasswordOtpController,
  resetPasswordController,
  getMe,
  logout,
} from "../controllers/auth.controller.js";

import {
  validate as validationMiddleware,
} from "../middleware/validation.middleware.js";

import {
  authRateLimiter,
  strictRateLimiter,
  emailRateLimiter,
  otpVerifyRateLimiter,
} from "../middleware/rateLimit.middleware.js";

import {
  requireClerkAuthentication,
} from "../middleware/auth.middleware.js";

import {
  forgotPasswordSchema,
  verifyForgotPasswordOtpSchema,
  resetPasswordSchema,
} from "../schemas/auth.schema.js";

const router = express.Router();

// ==================================================
// FORGOT PASSWORD
// TEMPORARY RESEND FLOW
// ==================================================

router.post(
  "/forgot-password",
  authRateLimiter,
  emailRateLimiter,
  validationMiddleware(forgotPasswordSchema),
  forgotPasswordController,
);

// ==================================================
// VERIFY PASSWORD RESET OTP
// ==================================================

router.post(
  "/forgot-password/verify",
  authRateLimiter,
  otpVerifyRateLimiter,
  validationMiddleware(verifyForgotPasswordOtpSchema),
  verifyForgotPasswordOtpController,
);

// ==================================================
// RESET PASSWORD
// ==================================================

router.post(
  "/reset-password",
  strictRateLimiter,
  validationMiddleware(resetPasswordSchema),
  resetPasswordController,
);

// ==================================================
// CURRENT USER
// ==================================================

router.get(
  "/me",
  requireClerkAuthentication,
  getMe,
);

// ==================================================
// LOGOUT
// ==================================================

router.post(
  "/logout",
  strictRateLimiter,
  requireClerkAuthentication,
  logout,
);

export default router;
