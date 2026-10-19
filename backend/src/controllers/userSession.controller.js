import UserSession from "../models/userSession.model.js";

import AppError from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import { clerkClient } from "../config/clerk.js";

import { createSecurityEvent } from "../services/securityEvent.service.js";
import {
  revokeAllUserSessions,
} from "../services/userSession.service.js";
// ==================================================
// GET ALL USER SESSIONS
// ==================================================
//
// GET /api/v1/sessions
//
// ==================================================

export const getUserSessions = asyncHandler(
  async (req, res) => {
    const userId = req.user._id;
const clerkSessionId = req.appAuth.sessionId;
   const sessions = await UserSession.find({
  userId,
})
  .select(
    "_id clerkSessionId deviceId deviceName browser operatingSystem ipAddress location lastActiveAt isRevoked revokedAt createdAt updatedAt"
  )
  .sort({
    lastActiveAt: -1,
  })
  .lean();
const sessionsWithCurrent = sessions.map((session) => {
  const { clerkSessionId: internalClerkSessionId, ...safeSession } = session;

  return {
    ...safeSession,
    isCurrent: internalClerkSessionId === clerkSessionId,
  };
});
    return res.status(200).json({
  success: true,
  data: {
    sessions: sessionsWithCurrent,
  },
});
  }
);

// ==================================================
// GET CURRENT SESSION
// ==================================================
//
// GET /api/v1/sessions/current
//
// ==================================================

export const getCurrentSession = asyncHandler(
  async (req, res) => {
    const userId = req.user._id;

    const clerkSessionId = req.appAuth.sessionId;

    if (!clerkSessionId) {
      throw new AppError(
        "Authentication session is required.",
        401,
        "CLERK_SESSION_ID_REQUIRED"
      );
    }

    const session = await UserSession.findOne({
      userId,
      clerkSessionId,
    })
      .select(
        "_id deviceId deviceName browser operatingSystem ipAddress location lastActiveAt isRevoked revokedAt createdAt updatedAt"
      )
      .lean();

    if (!session) {
      throw new AppError(
        "Current session not found.",
        404,
        "SESSION_NOT_FOUND"
      );
    }

    return res.status(200).json({
      success: true,

      data: {
        session,
      },
    });
  }
);

// ==================================================
// REVOKE SPECIFIC SESSION
// ==================================================
//
// DELETE /api/v1/sessions/:sessionId
//
// ==================================================

export const revokeSession = asyncHandler(
  async (req, res) => {
    const userId = req.user._id;

    const { sessionId } = req.params;

    // ==================================================
    // VALIDATE SESSION ID
    // ==================================================

    if (!sessionId) {
      throw new AppError(
        "Session ID is required.",
        400,
        "SESSION_ID_REQUIRED"
      );
    }

    // ==================================================
    // FIND SESSION
    // ==================================================

    const session = await UserSession.findOne({
      _id: sessionId,
      userId,
    });

    if (!session) {
      throw new AppError(
        "Session not found.",
        404,
        "SESSION_NOT_FOUND"
      );
    }

    // ==================================================
    // ALREADY REVOKED
    // ==================================================

    if (session.isRevoked) {
      return res.status(200).json({
        success: true,

        message: "Session is already revoked.",

        data: {
          sessionId: session._id,
          alreadyRevoked: true,
        },
      });
    }

    // ==================================================
    // CURRENT SESSION PROTECTION
    // ==================================================

    if (
      session.clerkSessionId ===
      req.appAuth.sessionId
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Use the logout endpoint to revoke the current session.",

        code: "CURRENT_SESSION_USE_LOGOUT",
      });
    }

    // ==================================================
    // ATOMIC MONGO REVOKE
    // ==================================================

    const revokedSession =
      await UserSession.findOneAndUpdate(
        {
          _id: session._id,
          userId,
          isRevoked: false,
        },
        {
          $set: {
            isRevoked: true,
            revokedAt: new Date(),
          },
        },
        {
          new: true,
        }
      );

    // ==================================================
    // RACE CONDITION
    // ==================================================

    if (!revokedSession) {
      const latestSession =
        await UserSession.findOne({
          _id: session._id,
          userId,
        });

      if (latestSession?.isRevoked) {
        return res.status(200).json({
          success: true,

          message: "Session is already revoked.",

          data: {
            sessionId: latestSession._id,
            alreadyRevoked: true,
          },
        });
      }

      throw new AppError(
        "Unable to revoke user session.",
        500,
        "SESSION_REVOKE_FAILED"
      );
    }

    // ==================================================
    // CLERK REVOKE
    // ==================================================

    try {
      await clerkClient.sessions.revokeSession(
        revokedSession.clerkSessionId
      );
    } catch (error) {
      console.error(
        "Clerk session revocation failed:",
        error
      );

      throw new AppError(
        "Session was revoked locally, but remote session revocation failed.",
        503,
        "CLERK_SESSION_REVOKE_FAILED",
        {
          cause: error,
        }
      );
    }

    // ==================================================
    // SECURITY EVENT
    // ==================================================

    try {
      await createSecurityEvent({
        userId,

        eventType: "SESSION_REVOKED",

        ipAddress:
          req.ip || null,

        userAgent:
          req.get("user-agent") || null,

        deviceId:
          revokedSession.deviceId,

        metadata: {
          sessionId:
            revokedSession._id.toString(),

          deviceName:
            revokedSession.deviceName,

          browser:
            revokedSession.browser,

          operatingSystem:
            revokedSession.operatingSystem,
        },
      });
    } catch (error) {
      // Security logging must not break
      // an already successful revoke operation.

      console.error(
        "Session revoke security event logging failed:",
        error
      );
    }

    // ==================================================
    // RESPONSE
    // ==================================================

    return res.status(200).json({
      success: true,

      message: "Session revoked successfully.",

      data: {
        sessionId: revokedSession._id,
        alreadyRevoked: false,
      },
    });
  }
);


// ==================================================
// REVOKE ALL OTHER USER SESSIONS
// ==================================================
//
// POST /api/v1/sessions/revoke-others
//
// ==================================================

export const revokeOtherSessions = asyncHandler(
  async (req, res) => {
    const userId = req.user._id;

    const clerkSessionId = req.appAuth.sessionId;

    // ==================================================
    // VALIDATE CURRENT CLERK SESSION
    // ==================================================

    if (!clerkSessionId) {
      throw new AppError(
        "Authentication session is required.",
        401,
        "CLERK_SESSION_ID_REQUIRED"
      );
    }

    // ==================================================
    // REVOKE ALL OTHER SESSIONS
    // ==================================================

    const result = await revokeAllUserSessions({
      userId,
      excludeClerkSessionId: clerkSessionId,
    });

    if (result.revokedCount > 0) {
      try {
        await createSecurityEvent({
          userId,
          eventType: "LOGOUT_ALL",
          ipAddress: req.ip || null,
          userAgent: req.get("user-agent") || null,
          metadata: {
            revokedCount: result.revokedCount,
            initiatedFromCurrentSession: true,
          },
        });
      } catch (error) {
        console.error("Logout-all security event logging failed:", error);
      }
    }

    // ==================================================
    // RESPONSE
    // ==================================================

    return res.status(200).json({
      success: true,

      message:
        result.revokedCount === 0
          ? "There are no other active sessions to revoke."
          : "All other sessions have been revoked successfully.",

      data: {
        revokedCount: result.revokedCount,
        currentSessionKept: result.currentSessionKept,
      },
    });
  }
);