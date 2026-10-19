
import { getAuth } from "@clerk/express";
import mongoose from "mongoose";

import User from "../models/user.model.js";

import UserLifecycle, {
  USER_LIFECYCLE_STATUS as STATUS,
} from "../models/userLifecycle.model.js";

import AppError from "../utils/AppError.js";
import logger from "../utils/logger.js";

import {
  getOrCreateUserSession,
} from "../services/userSession.service.js";

// ==================================================
// AUTHENTICATION ERROR RESPONSE
// ==================================================

const rejectAuthentication = (
  res,
  status,
  code,
  message,
) => {
  return res.status(status).json({
    success: false,
    message,
    code,
    requestId: res.req?.requestId,
  });
};

// ==================================================
// REQUIRE CLERK AUTHENTICATION
// ==================================================

export const requireClerkAuthentication = async (
  req,
  res,
  next,
) => {
  try {
    // ==============================================
    // 1. VERIFY CLERK SESSION TOKEN
    // ==============================================

    const auth = getAuth(req, {
      acceptsToken: "session_token",
    });

    if (!auth.isAuthenticated) {
      return rejectAuthentication(
        res,
        401,
        "AUTHENTICATION_REQUIRED",
        "Authentication required.",
      );
    }

    const clerkId = auth.userId;
    const clerkSessionId = auth.sessionId;

    if (!clerkId || !clerkSessionId) {
      return rejectAuthentication(
        res,
        401,
        "INVALID_AUTH_SESSION",
        "Invalid authentication session.",
      );
    }

    // ==============================================
    // 2. CHECK MONGODB CONNECTION
    // ==============================================

    if (mongoose.connection.readyState !== 1) {
      throw new AppError(
        "Authentication database temporarily unavailable.",
        503,
        "AUTH_DATABASE_UNAVAILABLE",
      );
    }

    // ==============================================
    // 3. LOAD APPLICATION USER
    // ==============================================

    const user = await User.findOne({
      clerkId,
    }).lean();

    if (!user) {
      return rejectAuthentication(
        res,
        401,
        "APPLICATION_USER_NOT_FOUND",
        "Application user not found.",
      );
    }

    // ==============================================
    // 4. CHECK ACCOUNT STATUS
    // ==============================================

    if (!user.isActive) {
      return rejectAuthentication(
        res,
        403,
        "ACCOUNT_INACTIVE",
        "Your account is inactive.",
      );
    }

    // ==============================================
    // 5. CHECK ACCOUNT LIFECYCLE
    // ==============================================

    const lifecycle =
      await UserLifecycle.findOne({
        userId: user._id,
      })
        .select("status")
        .lean();

    if (!lifecycle) {
      return rejectAuthentication(
        res,
        403,
        "ACCOUNT_LIFECYCLE_UNAVAILABLE",
        "Account lifecycle state is unavailable.",
      );
    }

    if (lifecycle.status !== STATUS.ACTIVE) {
      return rejectAuthentication(
        res,
        403,
        "ACCOUNT_LIFECYCLE_RESTRICTED",
        "Account access is restricted.",
      );
    }

    // ==============================================
    // 6. VALIDATE APPLICATION SESSION
    // ==============================================

    const sessionTracking =
      await getOrCreateUserSession({
        req,
        userId: user._id,
        clerkSessionId,
      });

    // ==============================================
    // 7. ATTACH APPLICATION CONTEXT
    // ==============================================

    req.user = user;

    req.appAuth = {
      clerkId,
      sessionId: clerkSessionId,
      sessionClaims: auth.sessionClaims,
    };

    req.userSession = sessionTracking.session;

    req.sessionTracking = {
      created: sessionTracking.created,
      newDevice: sessionTracking.newDevice,
    };

    return next();
  } catch (error) {
    logger.error(
      "Authentication middleware failed",
      {
        requestId: req.requestId,
        name: error?.name,
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
      },
    );

    if (error instanceof AppError) {
      return next(error);
    }

    return next(
      new AppError(
        "Authentication service temporarily unavailable.",
        503,
        "AUTHENTICATION_SERVICE_UNAVAILABLE",
      ),
    );
  }
};

// ==================================================
// PROTECTED ROUTE AUTHENTICATION
// ==================================================

export const requireAuthentication =
  requireClerkAuthentication;
