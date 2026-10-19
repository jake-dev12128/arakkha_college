import crypto from "node:crypto";

import UserSession from "../models/userSession.model.js";
import AppError from "../utils/AppError.js";
import { clerkClient } from "../config/clerk.js";
// ==================================================
// CLIENT IP
// ==================================================

const getClientIp = (req) => {
  return req?.ip || "unknown";
};

// ==================================================
// USER AGENT
// ==================================================

const getUserAgent = (req) => {
  return req?.get?.("user-agent") || "unknown";
};

// ==================================================
// DEVICE ID
// ==================================================

const generateDeviceId = ({
  userId,
  sessionId,
  userAgent,
}) => {
  return crypto
    .createHash("sha256")
    .update(`${userId}:${sessionId}:${userAgent}`)
    .digest("hex");
};

const generateDeviceFingerprint = ({
  userId,
  userAgent,
}) => {
  return crypto
    .createHash("sha256")
    .update(`${userId}:${userAgent}`)
    .digest("hex");
};

// ==================================================
// USER AGENT PARSER
// ==================================================

const parseUserAgent = (userAgent) => {
  let browser = "Unknown";
  let operatingSystem = "Unknown";
  let deviceName = "Unknown Device";

  // --------------------------------------------------
  // BROWSER
  // --------------------------------------------------

  if (userAgent.includes("Edg/")) {
    browser = "Microsoft Edge";
  } else if (userAgent.includes("Chrome/")) {
    browser = "Google Chrome";
  } else if (userAgent.includes("Firefox/")) {
    browser = "Mozilla Firefox";
  } else if (
    userAgent.includes("Safari/") &&
    !userAgent.includes("Chrome/")
  ) {
    browser = "Safari";
  }

  // --------------------------------------------------
  // OPERATING SYSTEM
  // --------------------------------------------------

  if (userAgent.includes("Windows NT")) {
    operatingSystem = "Windows";
    deviceName = "Windows Device";
  } else if (userAgent.includes("Mac OS X")) {
    operatingSystem = "macOS";
    deviceName = "Mac";
  } else if (userAgent.includes("Android")) {
    operatingSystem = "Android";
    deviceName = "Android Device";
  } else if (
    userAgent.includes("iPhone") ||
    userAgent.includes("iPad")
  ) {
    operatingSystem = "iOS";
    deviceName = "Apple Device";
  } else if (userAgent.includes("Linux")) {
    operatingSystem = "Linux";
    deviceName = "Linux Device";
  }

  return {
    browser,
    operatingSystem,
    deviceName,
  };
};

// ==================================================
// UPDATE EXISTING SESSION
// ==================================================

const updateExistingSession = async ({
  sessionId,
  ipAddress,
  deviceId,
  deviceName,
  browser,
  operatingSystem,
  deviceFingerprint,
}) => {
  try {
    const session = await UserSession.findOneAndUpdate(
      {
        _id: sessionId,
        isRevoked: false,
      },
      {
        $set: {
          lastActiveAt: new Date(),
          ipAddress,
          deviceId,
          deviceName,
          browser,
          operatingSystem,
          deviceFingerprint,
        },
      },
      {
        new: true,
      }
    );

    if (!session) {
      throw new AppError(
        "This session has been revoked or no longer exists.",
        401,
        "SESSION_REVOKED"
      );
    }

    return session;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      "Unable to update user session.",
      500,
      "SESSION_UPDATE_FAILED",
      {
        cause: error,
      }
    );
  }
};

// ==================================================
// GET OR CREATE USER SESSION
// ==================================================

export const getOrCreateUserSession = async ({
  req,
  userId,
  clerkSessionId,
}) => {
  if (!userId) {
    throw new AppError(
      "User ID is required.",
      401,
      "USER_ID_REQUIRED"
    );
  }

  if (!clerkSessionId) {
    throw new AppError(
      "Clerk session ID is required.",
      401,
      "CLERK_SESSION_ID_REQUIRED"
    );
  }

  const userAgent = getUserAgent(req);
  const ipAddress = getClientIp(req);

  const deviceId = generateDeviceId({
    userId,
    sessionId: clerkSessionId,
    userAgent,
  });

  const deviceFingerprint = generateDeviceFingerprint({
    userId,
    userAgent,
  });

  const {
    browser,
    operatingSystem,
    deviceName,
  } = parseUserAgent(userAgent);

  // ==================================================
  // DETECT PREVIOUSLY SEEN CLIENT
  // ==================================================

  let previouslySeenDevice = false;

  try {
    previouslySeenDevice = Boolean(
      await UserSession.exists({
        userId,
        deviceFingerprint,
      }),
    );
  } catch (error) {
    throw new AppError(
      "Unable to evaluate device security state.",
      500,
      "DEVICE_LOOKUP_FAILED",
      { cause: error },
    );
  }

  // ==================================================
  // FIND EXISTING SESSION
  // ==================================================

  let existingSession;

  try {
    existingSession = await UserSession.findOne({
      userId,
      clerkSessionId,
    });
  } catch (error) {
    throw new AppError(
      "Unable to retrieve user session.",
      500,
      "SESSION_LOOKUP_FAILED",
      {
        cause: error,
      }
    );
  }

  // ==================================================
  // EXISTING SESSION
  // ==================================================

  if (existingSession) {
    if (existingSession.isRevoked) {
      throw new AppError(
        "This session has been revoked.",
        401,
        "SESSION_REVOKED"
      );
    }

    const session = await updateExistingSession({
      sessionId: existingSession._id,
      ipAddress,
      deviceId,
      deviceName,
      browser,
      operatingSystem,
      deviceFingerprint,
    });

    return {
      session,
      created: false,
      newDevice: false,
    };
  }

  // ==================================================
  // CREATE NEW SESSION
  // ==================================================

  try {
    const session = await UserSession.create({
      userId,
      clerkSessionId,
      deviceId,
      deviceName,
      browser,
      operatingSystem,
      deviceFingerprint,
      ipAddress,

      location: {
        country: null,
        city: null,
      },

      lastActiveAt: new Date(),

      isRevoked: false,

      revokedAt: null,
    });

    return {
      session,
      created: true,
      newDevice: !previouslySeenDevice,
    };
  } catch (error) {
    // ==================================================
    // DUPLICATE SESSION RACE CONDITION
    // ==================================================

    if (
      error?.code === 11000 &&
      error?.keyPattern?.clerkSessionId
    ) {
      let session;

      try {
        session = await UserSession.findOne({
          userId,
          clerkSessionId,
        });
      } catch (lookupError) {
        throw new AppError(
          "Unable to retrieve the existing user session.",
          500,
          "SESSION_LOOKUP_FAILED",
          {
            cause: lookupError,
          }
        );
      }

      if (!session) {
        throw new AppError(
          "User session could not be created.",
          500,
          "SESSION_CREATION_FAILED",
          {
            cause: error,
          }
        );
      }

      if (session.isRevoked) {
        throw new AppError(
          "This session has been revoked.",
          401,
          "SESSION_REVOKED"
        );
      }

      const updatedSession = await updateExistingSession({
        sessionId: session._id,
        ipAddress,
        deviceId,
        deviceName,
        browser,
        operatingSystem,
        deviceFingerprint,
      });

      return {
        session: updatedSession,
        created: false,
        newDevice: false,
      };
    }

    throw new AppError(
      "Unable to create user session.",
      500,
      "SESSION_CREATION_FAILED",
      {
        cause: error,
      }
    );
  }
};

// ==================================================
// REVOKE CURRENT SESSION
// ==================================================

export const revokeCurrentSession = async ({
  userId,
  clerkSessionId,
}) => {
  if (!userId) {
    throw new AppError(
      "User ID is required.",
      401,
      "USER_ID_REQUIRED"
    );
  }

  if (!clerkSessionId) {
    throw new AppError(
      "Clerk session ID is required.",
      401,
      "CLERK_SESSION_ID_REQUIRED"
    );
  }

  try {
    const now = new Date();

    const session = await UserSession.findOne({
      userId,
      clerkSessionId,
    });

    if (!session) {
      throw new AppError(
        "User session not found.",
        404,
        "SESSION_NOT_FOUND"
      );
    }

    // Idempotent
    if (session.isRevoked) {
      return {
        session,
        alreadyRevoked: true,
      };
    }

    // Atomic revoke
    const revokedSession =
      await UserSession.findOneAndUpdate(
        {
          _id: session._id,
          isRevoked: false,
        },
        {
          $set: {
            isRevoked: true,
            revokedAt: now,
          },
        },
        {
          new: true,
        }
      );

    if (!revokedSession) {
      const currentSession =
        await UserSession.findById(session._id);

      if (currentSession?.isRevoked) {
        return {
          session: currentSession,
          alreadyRevoked: true,
        };
      }

      throw new AppError(
        "Unable to revoke user session.",
        500,
        "SESSION_REVOKE_FAILED"
      );
    }

    return {
      session: revokedSession,
      alreadyRevoked: false,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      "Unable to revoke user session.",
      500,
      "SESSION_REVOKE_FAILED",
      {
        cause: error,
      }
    );
  }
};

// ==================================================
// REVOKE ALL USER SESSIONS
// ==================================================

// ==================================================
// REVOKE ALL OTHER USER SESSIONS
// ==================================================

export const revokeAllUserSessions = async ({
  userId,
  excludeClerkSessionId = null,
}) => {
  if (!userId) {
    throw new AppError(
      "User ID is required.",
      401,
      "USER_ID_REQUIRED"
    );
  }

  if (!excludeClerkSessionId) {
    throw new AppError(
      "Current Clerk session ID is required.",
      401,
      "CLERK_SESSION_ID_REQUIRED"
    );
  }

  try {
    // ==================================================
    // FIND ALL ACTIVE OTHER SESSIONS
    // ==================================================

    const sessions = await UserSession.find({
      userId,
      isRevoked: false,
      clerkSessionId: {
        $ne: excludeClerkSessionId,
      },
    }).lean();

    // ==================================================
    // NOTHING TO REVOKE
    // ==================================================

    if (sessions.length === 0) {
      return {
        revokedCount: 0,
        currentSessionKept: true,
        clerkRevokedCount: 0,
        clerkFailedCount: 0,
        sessions: [],
      };
    }

    const sessionIds = sessions.map(
      (session) => session._id
    );

    const now = new Date();

    // ==================================================
    // STEP 1
    // ATOMIC MONGODB REVOKE
    // ==================================================

    const mongoResult =
      await UserSession.updateMany(
        {
          _id: {
            $in: sessionIds,
          },

          userId,

          isRevoked: false,

          clerkSessionId: {
            $ne: excludeClerkSessionId,
          },
        },
        {
          $set: {
            isRevoked: true,
            revokedAt: now,
          },
        }
      );

    // ==================================================
    // STEP 2
    // CLERK REMOTE REVOKE
    // ==================================================

    let clerkRevokedCount = 0;
    let clerkFailedCount = 0;

    const clerkFailures = [];

    for (const session of sessions) {
      try {
        await clerkClient.sessions.revokeSession(
          session.clerkSessionId
        );

        clerkRevokedCount++;
      } catch (error) {
        clerkFailedCount++;

        clerkFailures.push({
          sessionId: session._id.toString(),
          clerkSessionId: session.clerkSessionId,
          error: error?.message || "Unknown Clerk error",
        });

        console.error(
          "Clerk session revocation failed:",
          {
            sessionId: session._id.toString(),
            clerkSessionId: session.clerkSessionId,
            error,
          }
        );
      }
    }

    // ==================================================
    // RESULT
    // ==================================================

    return {
      revokedCount: mongoResult.modifiedCount,

      currentSessionKept: true,

      clerkRevokedCount,

      clerkFailedCount,

      sessions: sessionIds.map(
        (sessionId) => sessionId.toString()
      ),

      clerkFailures,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      "Unable to revoke user sessions.",
      500,
      "SESSIONS_REVOKE_FAILED",
      {
        cause: error,
      }
    );
  }
};