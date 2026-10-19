import {
  forgotPassword,
  verifyForgotPasswordOtp,
  resetPassword,
} from "../services/auth.service.js";
import AppError from "../utils/AppError.js";
import {
  getOrCreateUserSession,
  revokeCurrentSession,
  revokeAllUserSessions,
} from "../services/userSession.service.js";
import {
  createSecurityEvent,
} from "../services/securityEvent.service.js";
import { clerkClient } from "../config/clerk.js";
import { asyncHandler } from "../utils/asyncHandler.js";




// ==================================================
// FORGOT PASSWORD
// ==================================================

export const forgotPasswordController =
  asyncHandler(
    async (req, res) => {
      const { email } = req.body;

      const result =
        await forgotPassword({
          email,
        });

      // ==================================================
      // SECURITY EVENT
      // ==================================================

      if (result.userId) {
        try {
          await createSecurityEvent({
            userId: result.userId,
            eventType: "OTP_SENT",
            ipAddress: req.ip || null,
            userAgent: req.get("user-agent") || null,
            metadata: {
              purpose: "forgot-password",
            },
          });
        } catch (error) {
          console.error("OTP sent event failed:", error);
        }

        try {
          await createSecurityEvent({
            userId: result.userId,
            eventType: "PASSWORD_RESET_REQUESTED",
            ipAddress: req.ip || null,
            userAgent: req.get("user-agent") || null,
            metadata: {
              channel: "email_otp",
            },
          });
        } catch (error) {
          console.error("Password reset request event failed:", error);
        }
      }

      // ==================================================
      // OTP COOLDOWN
      // ==================================================

      if (
        !result.success &&
        result.reason ===
          "OTP_COOLDOWN"
      ) {
        return res.status(429).json({
          success: false,

          message:
            "Please wait before requesting another OTP.",

          code: "OTP_COOLDOWN",

          data: {
            retryAfter:
              result.retryAfter,
          },
        });
      }

      // ==================================================
      // SECURITY:
      // ALWAYS SAME RESPONSE
      // ==================================================

      return res.status(200).json({
        success: true,

        message:
          "If an account exists with this email, a verification code has been sent.",

        data: result.data,
      });
    },
  );

// ==================================================
// VERIFY FORGOT PASSWORD OTP
// ==================================================

export const verifyForgotPasswordOtpController =
  asyncHandler(
    async (req, res) => {
      const {
        email,
        otp,
      } = req.body;

      const result =
        await verifyForgotPasswordOtp({
          email,
          otp,
        });

      // ==================================================
      // FAILED
      // ==================================================

      if (!result.success) {
        if (result.userId) {
          try {
            await createSecurityEvent({
              userId: result.userId,
              eventType: "OTP_FAILED",
              ipAddress: req.ip || null,
              userAgent: req.get("user-agent") || null,
              metadata: {
                purpose: "forgot-password",
                reason: result.reason || "INVALID_OTP",
              },
            });
          } catch (error) {
            console.error("OTP failure event failed:", error);
          }
        }

        switch (result.reason) {
          case "OTP_EXPIRED":
            return res.status(400).json({
              success: false,

              message:
                "OTP has expired.",

              code: "OTP_EXPIRED",
            });

          case "INVALID_OTP":
            return res.status(400).json({
              success: false,

              message:
                "Invalid OTP.",

              code: "INVALID_OTP",
            });

          case "MAX_ATTEMPTS":
            return res.status(429).json({
              success: false,

              message:
                "Maximum OTP attempts exceeded.",

              code:
                "MAX_ATTEMPTS",
            });

          default:
            return res.status(400).json({
              success: false,

              message:
                "Unable to verify OTP.",

              code:
                result.reason ||
                "OTP_VERIFICATION_FAILED",
            });
        }
      }

      // ==================================================
      // SECURITY EVENT
      // ==================================================

      if (result.userId) {
        try {
          await createSecurityEvent({
            userId: result.userId,
            eventType: "OTP_VERIFIED",
            ipAddress: req.ip || null,
            userAgent: req.get("user-agent") || null,
            metadata: {
              purpose: "forgot-password",
            },
          });
        } catch (error) {
          console.error("OTP verification event failed:", error);
        }
      }

      // ==================================================
      // SUCCESS
      // ==================================================

      return res.status(200).json({
        success: true,

        message:
          "OTP verified successfully.",

        data: result.data,
      });
    },
  );

// ==================================================
// RESET PASSWORD
// ==================================================

export const resetPasswordController =
  asyncHandler(
    async (req, res) => {
      const {
        resetToken,
        newPassword,
      } = req.body;

      const result =
        await resetPassword({
          resetToken,
          newPassword,
        });

      // ==================================================
      // FAILED
      // ==================================================

      if (!result.success) {
        switch (result.reason) {
          case "RESET_TOKEN_EXPIRED":
            return res.status(400).json({
              success: false,

              message:
                "Password reset session has expired.",

              code:
                "RESET_TOKEN_EXPIRED",
            });

          case "INVALID_RESET_TOKEN":
            return res.status(400).json({
              success: false,

              message:
                "Invalid password reset token.",

              code:
                "INVALID_RESET_TOKEN",
            });

          default:
            return res.status(400).json({
              success: false,

              message:
                "Unable to reset password.",

              code:
                result.reason ||
                "PASSWORD_RESET_FAILED",
            });
        }
      }

      // ==================================================
      // SECURITY EVENT
      // ==================================================

      if (result.userId) {
        try {
          await createSecurityEvent({
            userId: result.userId,
            eventType: "PASSWORD_RESET_COMPLETED",
            ipAddress: req.ip || null,
            userAgent: req.get("user-agent") || null,
            metadata: {
              sessionsRevokedByClerk: true,
            },
          });
        } catch (error) {
          console.error("Password reset completion event failed:", error);
        }
      }

      // ==================================================
      // SUCCESS
      // ==================================================

      return res.status(200).json({
        success: true,

        message:
          "Password reset successfully.",
      });
    },
  );

// ==================================================
// GET CURRENT USER
// ==================================================

export const getMe = asyncHandler(
  async (req, res) => {
    const userId = req.user._id;

    const session = req.userSession;

    const {
      created,
      newDevice,
    } = req.sessionTracking;

    // Record successful login
    if (created) {
      try {
        await createSecurityEvent({
          userId,
          eventType: "LOGIN_SUCCESS",
          ipAddress: req.ip || null,
          userAgent:
            req.get("user-agent") || null,
          deviceId: session.deviceId,
          metadata: {
            deviceName: session.deviceName,
            browser: session.browser,
            operatingSystem:
              session.operatingSystem,
          },
        });
      } catch (error) {
        console.error(
          "Login event logging failed:",
          error.message,
        );
      }
    }

    // Record new device
    if (created && newDevice) {
      try {
        await createSecurityEvent({
          userId,
          eventType: "NEW_DEVICE_LOGIN",
          ipAddress: req.ip || null,
          userAgent:
            req.get("user-agent") || null,
          deviceId: session.deviceId,
          metadata: {
            deviceName: session.deviceName,
            browser: session.browser,
            operatingSystem:
              session.operatingSystem,
          },
        });
      } catch (error) {
        console.error(
          "New device event logging failed:",
          error.message,
        );
      }
    }

    // Return authenticated user
    return res.status(200).json({
      success: true,

      user: {
        id: req.user._id,
        clerkId: req.user.clerkId,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        role: req.user.role,
        studentId:
          req.user.studentId ?? null,
        isActive: req.user.isActive,
      },

      auth: {
  clerkId: req.appAuth.clerkId,
  sessionId: req.appAuth.sessionId,
},

      session: {
        id: session._id,
        deviceName: session.deviceName,
        browser: session.browser,
        operatingSystem:
          session.operatingSystem,
        lastActiveAt: session.lastActiveAt,
      },
    });
  },
);


// ==================================================
// LOGOUT CURRENT SESSION
// ==================================================

// ==================================================
// LOGOUT CURRENT SESSION
// ==================================================

export const logout = asyncHandler(
  async (req, res) => {
 const userId = req.user._id;
const clerkSessionId = req.appAuth.sessionId;
    // ==================================================
    // VALIDATION
    // ==================================================

    if (!clerkSessionId) {
      return res.status(401).json({
        success: false,

        message:
          "Authentication session is required.",

        code:
          "CLERK_SESSION_ID_REQUIRED",
      });
    }

    // ==================================================
    // FIND APPLICATION SESSION
    // ==================================================

    const result =
      await revokeCurrentSession({
        userId,
        clerkSessionId,
      });

    // ==================================================
    // REVOKE CLERK SESSION
    // ==================================================

    try {
      await clerkClient.sessions.revokeSession(
        clerkSessionId,
      );
    } catch (error) {
      console.error(
        "Clerk session revocation failed:",
        error,
      );

      throw new AppError(
        "Unable to complete logout.",
        503,
        "CLERK_SESSION_REVOKE_FAILED",
        {
          cause: error,
        },
      );
    }

    // ==================================================
    // SECURITY EVENT
    // ==================================================

    try {
      await createSecurityEvent({
        userId,

        eventType: "LOGOUT",

        ipAddress:
          req.ip || null,

        userAgent:
          req.get("user-agent") || null,

        deviceId:
          result.session.deviceId,

        metadata: {
          deviceName:
            result.session.deviceName,

          browser:
            result.session.browser,

          operatingSystem:
            result.session.operatingSystem,
        },
      });
    } catch (error) {
      // ==================================================
      // SECURITY LOG FAILURE MUST NOT CANCEL LOGOUT
      // ==================================================

      console.error(
        "Logout security event logging failed:",
        error,
      );
    }

    // ==================================================
    // RESPONSE
    // ==================================================

    return res.status(200).json({
      success: true,

      message:
        "Logged out successfully.",
    });
  },
);