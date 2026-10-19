import crypto from "node:crypto";
import mongoose from "mongoose";

import User from "../models/user.model.js";

import { redisClient } from "../config/redis.js";

import { clerkClient } from "../config/clerk.js";

import {
  createOtp,
  verifyOtp,
} from "./otp.service.js";

import AppError from "../utils/AppError.js";

// ==================================================
// CONFIGURATION
// ==================================================


const PASSWORD_RESET_TTL_SECONDS = 10 * 60;



// ==================================================
// PASSWORD RESET TOKEN HASH
// ==================================================

const hashResetToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

// ==================================================
// PASSWORD RESET REDIS KEY
// ==================================================

const getPasswordResetKey = (token) => {
  const tokenHash = hashResetToken(token);

  return `password-reset:${tokenHash}`;
};





// ==================================================
// FORGOT PASSWORD
// ==================================================

export const forgotPassword = async ({
  email,
}) => {
  // ==================================================
  // NORMALIZE EMAIL
  // ==================================================

  const normalizedEmail = email
    .trim()
    .toLowerCase();

  // ==================================================
  // FIND USER
  // ==================================================

  const user = await User.findOne({
    email: normalizedEmail,
  }).lean();

  // ==================================================
  // ACCOUNT ENUMERATION PROTECTION
  // ==================================================

  if (!user || !user.isActive) {
    return {
      success: true,

      data: {
        expiresIn: PASSWORD_RESET_TTL_SECONDS,
      },
    };
  }

  // ==================================================
  // CREATE OTP
  // ==================================================

  const otpResult = await createOtp({
    purpose: "forgot-password",

    identifier: normalizedEmail,
  });

  // ==================================================
  // OTP COOLDOWN
  // ==================================================

  if (!otpResult.success) {
    return otpResult;
  }

  // ==================================================
  // RETURN
  // ==================================================

  return {
    success: true,
    userId: user._id,

    data: {
      expiresIn:
        otpResult.expiresIn,

      cooldown:
        otpResult.cooldown,
    },
  };
};

// ==================================================
// VERIFY FORGOT PASSWORD OTP
// ==================================================

export const verifyForgotPasswordOtp = async ({
  email,
  otp,
}) => {
  // ==================================================
  // NORMALIZE EMAIL
  // ==================================================

  const normalizedEmail = email
    .trim()
    .toLowerCase();

  // ==================================================
  // FIND USER
  // ==================================================

  const user = await User.findOne({
    email: normalizedEmail,
  }).lean();

  // ==================================================
  // USER NOT FOUND
  // ==================================================

  if (!user) {
    return {
      success: false,
      reason: "INVALID_OTP",
    };
  }

  // ==================================================
  // ACCOUNT INACTIVE
  // ==================================================

  if (!user.isActive) {
    return {
      success: false,
      reason: "INVALID_OTP",
    };
  }

  // ==================================================
  // VERIFY OTP
  // ==================================================

  const otpResult = await verifyOtp({
    purpose: "forgot-password",

    identifier: normalizedEmail,

    otp,
  });

  if (!otpResult.success) {
    return {
      ...otpResult,
      userId: user._id,
    };
  }

  // ==================================================
  // GENERATE RESET TOKEN
  // ==================================================

  const resetToken =
    crypto.randomBytes(32).toString("hex");

  // ==================================================
  // CREATE REDIS KEY
  // ==================================================

  const resetKey =
    getPasswordResetKey(resetToken);

  // ==================================================
  // STORE RESET SESSION
  // ==================================================

  await redisClient.set(
    resetKey,

    JSON.stringify({
      userId: user._id.toString(),

      clerkId: user.clerkId,

      email: user.email,
    }),

    {
      EX: PASSWORD_RESET_TTL_SECONDS,
    },
  );

  // ==================================================
  // RETURN RESET TOKEN
  // ==================================================

  return {
    success: true,
    userId: user._id,

    data: {
      resetToken,

      expiresIn:
        PASSWORD_RESET_TTL_SECONDS,
    },
  };
};

// ==================================================
// RESET PASSWORD
// ==================================================

export const resetPassword = async ({
  resetToken,
  newPassword,
}) => {
  // ==================================================
  // BASIC TOKEN VALIDATION
  // ==================================================

  if (
    !resetToken ||
    typeof resetToken !== "string"
  ) {
    return {
      success: false,

      reason: "INVALID_RESET_TOKEN",
    };
  }

  // ==================================================
  // GET REDIS KEY
  // ==================================================

  const resetKey =
    getPasswordResetKey(resetToken);

  // ==================================================
  // ATOMICALLY CLAIM RESET TOKEN
  // ==================================================
  //
  // Redis GET + DEL as two separate commands
  // can create a race condition.
  //
  // Two requests could both GET the token
  // before either request deletes it.
  //
  // This Lua script makes the operation atomic.
  //
  // ==================================================

  const resetData =
    await redisClient.eval(
      `
        local value =
          redis.call("GET", KEYS[1])

        local ttl = redis.call("TTL", KEYS[1])

        if value then
          redis.call("DEL", KEYS[1])
        end

        return {value, ttl}
      `,
      {
        keys: [resetKey],

        arguments: [],
      },
    );

  // ==================================================
  // TOKEN INVALID / EXPIRED / ALREADY USED
  // ==================================================

  const claimedResetData = Array.isArray(resetData) ? resetData[0] : resetData;
  const claimedResetTtl = Array.isArray(resetData) ? Number(resetData[1]) : 0;

  if (!claimedResetData) {
    return {
      success: false,

      reason: "RESET_TOKEN_EXPIRED",
    };
  }

  // ==================================================
  // PARSE RESET SESSION
  // ==================================================

  let resetSession;

  try {
    resetSession =
      JSON.parse(claimedResetData);
  } catch {
    return {
      success: false,

      reason: "INVALID_RESET_TOKEN",
    };
  }

  // ==================================================
  // VALIDATE RESET SESSION
  // ==================================================

  if (
    !resetSession?.userId ||
    !resetSession?.clerkId
  ) {
    return {
      success: false,

      reason: "INVALID_RESET_TOKEN",
    };
  }

  // ==================================================
  // FIND USER
  // ==================================================

  const user =
    await User.findById(
      resetSession.userId,
    ).lean();

  if (!user) {
    return {
      success: false,

      reason: "INVALID_RESET_TOKEN",
    };
  }

  // ==================================================
  // CHECK ACCOUNT STATUS
  // ==================================================

  if (!user.isActive) {
    return {
      success: false,

      reason: "INVALID_RESET_TOKEN",
    };
  }

  // ==================================================
  // VERIFY CLERK IDENTITY
  // ==================================================

  if (
    user.clerkId !==
    resetSession.clerkId
  ) {
    return {
      success: false,

      reason: "INVALID_RESET_TOKEN",
    };
  }

  // ==================================================
  // UPDATE CLERK PASSWORD
  // ==================================================

 try {
  await clerkClient.users.updateUser(
    resetSession.clerkId,
    {
      password: newPassword,
      signOutOfOtherSessions: true,
    },
  );
} catch (error) {
  if (claimedResetTtl > 0) {
    try {
      await redisClient.set(
        resetKey,
        claimedResetData,
        { EX: claimedResetTtl },
      );
    } catch (restoreError) {
      console.error(
        "Failed to restore password reset token:",
        restoreError?.message,
      );
    }
  }

  console.error(
    "CLERK PASSWORD RESET FAILED:",
    error?.message,
  );

  throw new AppError(
    "Unable to reset password.",
    502,
    "PASSWORD_RESET_FAILED",
  );
}

  // ==================================================
  // SUCCESS
  // ==================================================

  return {
    success: true,
    userId: user._id,

    data: {
      message:
        "Password reset successfully.",
    },
  };
};

