
import mongoose from "mongoose";

import User from "../models/user.model.js";

import UserLifecycle, {
  USER_LIFECYCLE_STATUS as STATUS,
  LIFECYCLE_STEP_STATUS as STEP,
} from "../models/userLifecycle.model.js";

import AppError from "../utils/AppError.js";
import logger from "../utils/logger.js";

// ==================================================
// CONSTANTS
// ==================================================

const DEFAULT_BATCH_SIZE = 100;
const MAX_BATCH_SIZE = 500;

// ==================================================
// HELPERS
// ==================================================

const validateUserId = (userId) => {
  if (
    !mongoose.isObjectIdOrHexString(
      String(userId ?? "")
    )
  ) {
    throw new AppError(
      "Invalid user ID.",
      400,
      "INVALID_USER_ID"
    );
  }
};

const createStep = (status = STEP.PENDING) => ({
  status,
  attempts: 0,
  startedAt: null,
  completedAt: null,
  lastAttemptAt: null,
  lastError: {
    code: null,
    message: null,
    occurredAt: null,
  },
});

// ==================================================
// INITIAL LIFECYCLE DATA
// ==================================================

const buildInitialLifecycle = (user) => {
  const isActive = user.isActive === true;

  // Active users are not undergoing lifecycle
  // cleanup at initialization time.
  //
  // This does NOT certify that all Clerk
  // sessions are known or verified.

  if (isActive) {
    return {
      userId: user._id,

      status: STATUS.ACTIVE,
      operation: null,
      operationId: null,

      requestedBy: null,
      reason: null,
      requestedAt: null,

      reconciliationRequired: false,
      reconciliationAttempts: 0,
      lastReconciliationAt: null,
      reconciledAt: null,

      accountDisable: createStep(),
      localSessionRevocation: createStep(),
      clerkSessionRevocation: createStep(),
      securityAudit: createStep(),

      completedAt: null,
      deactivatedAt: null,
      reactivatedAt: null,

      lastError: {
        code: null,
        message: null,
        occurredAt: null,
      },
    };
  }

  // Existing inactive accounts are not
  // assumed to have completed session cleanup.

  return {
    userId: user._id,

    status: STATUS.RECONCILIATION_REQUIRED,
    operation: null,
    operationId: null,

    requestedBy: null,
    reason:
      "Existing inactive account requires lifecycle reconciliation.",
    requestedAt: null,

    reconciliationRequired: true,
    reconciliationAttempts: 0,
    lastReconciliationAt: null,
    reconciledAt: null,

    // User is already inactive, but its
    // historical transition is not verified.

    accountDisable: createStep(
      STEP.PENDING
    ),

    localSessionRevocation: createStep(),
    clerkSessionRevocation: createStep(),
    securityAudit: createStep(),

    completedAt: null,
    deactivatedAt: null,
    reactivatedAt: null,

    lastError: {
      code: "LEGACY_INACTIVE_ACCOUNT",
      message:
        "Session revocation history has not been verified.",
      occurredAt: new Date(),
    },
  };
};

// ==================================================
// INITIALIZE LIFECYCLE FOR ONE USER
// ==================================================

export const initializeUserLifecycle = async (
  userId
) => {
  validateUserId(userId);

  const user = await User.findById(userId)
    .select("_id isActive")
    .lean();

  if (!user) {
    throw new AppError(
      "User not found.",
      404,
      "USER_NOT_FOUND"
    );
  }

  const initialData =
    buildInitialLifecycle(user);

  // ==================================================
  // ATOMIC INSERT IF ABSENT
  // ==================================================
  //
  // $setOnInsert ensures an existing lifecycle
  // record is never overwritten by initialization.
  //
  // A unique index on userId prevents duplicates.
  // ==================================================

  try {
    const lifecycle =
      await UserLifecycle.findOneAndUpdate(
        {
          userId: user._id,
        },
        {
          $setOnInsert: initialData,
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );

    return lifecycle;
  } catch (error) {
    // Concurrent initialization may cause
    // duplicate-key conflicts.
    //
    // Read the winning document rather than
    // overwriting it.

    if (error?.code === 11000) {
      const existing =
        await UserLifecycle.findOne({
          userId: user._id,
        });

      if (existing) {
        return existing;
      }
    }

    throw error;
  }
};

// ==================================================
// ENSURE LIFECYCLE EXISTS
// ==================================================

export const ensureUserLifecycle = async (
  userId
) => {
  return initializeUserLifecycle(userId);
};

// ==================================================
// GET LIFECYCLE
// ==================================================

export const findUserLifecycle = async (
  userId
) => {
  validateUserId(userId);

  return UserLifecycle.findOne({
    userId,
  });
};

// ==================================================
// BACKFILL EXISTING USERS
// ==================================================
//
// Intended for a controlled maintenance
// operation, not an HTTP request.
//
// Uses a cursor to avoid loading all users
// into memory.
//
// Existing lifecycle records are preserved.
// ==================================================

export const backfillUserLifecycles = async ({
  batchSize = DEFAULT_BATCH_SIZE,
  dryRun = true,
} = {}) => {
  if (
    !Number.isInteger(batchSize) ||
    batchSize < 1 ||
    batchSize > MAX_BATCH_SIZE
  ) {
    throw new AppError(
      `batchSize must be between 1 and ${MAX_BATCH_SIZE}.`,
      400,
      "INVALID_BATCH_SIZE"
    );
  }

  if (typeof dryRun !== "boolean") {
    throw new AppError(
      "dryRun must be a boolean.",
      400,
      "INVALID_DRY_RUN"
    );
  }

  const stats = {
    dryRun,
    scanned: 0,
    existing: 0,
    created: 0,
    wouldCreate: 0,
    failed: 0,
    errors: [],
  };

  const cursor = User.find({})
    .select("_id isActive")
    .sort({ _id: 1 })
    .lean()
    .cursor({
      batchSize,
    });

  try {
    for await (const user of cursor) {
      stats.scanned += 1;

      try {
        const existing =
          await UserLifecycle.exists({
            userId: user._id,
          });

        if (existing) {
          stats.existing += 1;
          continue;
        }

        if (dryRun) {
          stats.wouldCreate += 1;
          continue;
        }

        await initializeUserLifecycle(
          user._id
        );

        stats.created += 1;
      } catch (error) {
        stats.failed += 1;

        logger.error(
          "User lifecycle backfill failed",
          {
            userId: String(user._id),
            errorName: error?.name,
            errorCode: error?.code,
          }
        );

        // Store only limited, sanitized
        // error information in the report.

        if (stats.errors.length < 20) {
          stats.errors.push({
            userId: String(user._id),
            code:
              typeof error?.code === "string"
                ? error.code
                : "BACKFILL_FAILED",
          });
        }
      }
    }
  } finally {
    await cursor.close();
  }

  logger.info(
    "User lifecycle backfill finished",
    {
      dryRun: stats.dryRun,
      scanned: stats.scanned,
      existing: stats.existing,
      created: stats.created,
      wouldCreate: stats.wouldCreate,
      failed: stats.failed,
    }
  );

  return stats;
};
