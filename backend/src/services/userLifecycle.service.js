
import crypto from "node:crypto";
import mongoose from "mongoose";

import User from "../models/user.model.js";
import UserSession from "../models/userSession.model.js";

import UserLifecycle, {
  USER_LIFECYCLE_STATUS as STATUS,
  USER_LIFECYCLE_OPERATIONS as OPERATION,
  LIFECYCLE_STEP_STATUS as STEP,
} from "../models/userLifecycle.model.js";

import { clerkClient } from "../config/clerk.js";
import { createSecurityEvent } from "./securityEvent.service.js";

import AppError from "../utils/AppError.js";
import logger from "../utils/logger.js";

// ==================================================
// CONSTANTS
// ==================================================

const MANAGER_ROLES = new Set([
  "super_admin",
  "admin",
]);

const STEP_NAMES = [
  "accountDisable",
  "localSessionRevocation",
  "clerkSessionRevocation",
  "securityAudit",
];

const RECONCILIATION_LEASE_MS = 5 * 60 * 1000;

// ==================================================
// HELPERS
// ==================================================

const getLifecycleOwnershipFilter = (
  lifecycle,
  now = new Date()
) => {
  if (!lifecycle?._id || !lifecycle?.operationId) {
    throw new AppError(
      "Lifecycle ownership information is missing.",
      409,
      "LIFECYCLE_OWNERSHIP_MISSING"
    );
  }

  return {
    _id: lifecycle._id,
    operationId: lifecycle.operationId,
    operation: OPERATION.DEACTIVATE,
    status: STATUS.DEACTIVATING,
    reconciliationRequired: true,
    lastReconciliationAt: {
      $gt: new Date(
        now.getTime() - RECONCILIATION_LEASE_MS
      ),
      $lte: now,
    },
  };
};

const validateId = (value) => {
  if (
    !mongoose.isObjectIdOrHexString(
      String(value ?? "")
    )
  ) {
    throw new AppError(
      "Invalid user ID.",
      400,
      "INVALID_USER_ID"
    );
  }
};

const findUser = async (userId) => {
  validateId(userId);

  const user = await User.findById(userId);

  if (!user) {
    throw new AppError(
      "User not found.",
      404,
      "USER_NOT_FOUND"
    );
  }

  return user;
};

const publicUser = (user) => ({
  _id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  studentId: user.studentId,
  role: user.role,
  isActive: user.isActive,
});

const authorize = (actor, target) => {
  if (
    !actor ||
    !actor.isActive ||
    !MANAGER_ROLES.has(actor.role)
  ) {
    throw new AppError(
      "Permission denied.",
      403,
      "LIFECYCLE_FORBIDDEN"
    );
  }

  if (
    String(actor._id) ===
    String(target._id)
  ) {
    throw new AppError(
      "You cannot change your own account status.",
      403,
      "SELF_LIFECYCLE_FORBIDDEN"
    );
  }

  if (
    ["admin", "super_admin"].includes(
      target.role
    ) &&
    actor.role !== "super_admin"
  ) {
    throw new AppError(
      "Only super admins can manage administrator accounts.",
      403,
      "ADMIN_ACCOUNT_PROTECTED"
    );
  }
};

const safeError = (code) => ({
  code,
  message: "Lifecycle reconciliation required.",
  occurredAt: new Date(),
});

const emptyError = () => ({
  code: null,
  message: null,
  occurredAt: null,
});

const pendingStep = () => ({
  status: STEP.PENDING,
  attempts: 0,
  startedAt: null,
  completedAt: null,
  lastAttemptAt: null,
  lastError: emptyError(),
});

const getDeactivationAuditKey = (lifecycle) => {
  if (
    !lifecycle?._id ||
    !lifecycle?.requestedAt
  ) {
    throw new AppError(
      "Deactivation audit identity is missing.",
      409,
      "DEACTIVATION_AUDIT_IDENTITY_MISSING"
    );
  }

  const requestedAt = new Date(
    lifecycle.requestedAt
  );

  if (Number.isNaN(requestedAt.getTime())) {
    throw new AppError(
      "Invalid deactivation request timestamp.",
      409,
      "INVALID_DEACTIVATION_TIMESTAMP"
    );
  }

  return [
    "account-deactivated",
    String(lifecycle._id),
    requestedAt.toISOString(),
  ].join(":");
};

// ==================================================
// INITIALIZE LIFECYCLE
// ==================================================

export const initializeUserLifecycle = async (
  userId
) => {
  const user = await findUser(userId);

  const initial = user.isActive
    ? {
        status: STATUS.ACTIVE,
        reconciliationRequired: false,
      }
    : {
        status: STATUS.RECONCILIATION_REQUIRED,
        reconciliationRequired: true,
        lastError: safeError(
          "LEGACY_INACTIVE_ACCOUNT"
        ),
      };

  try {
    return await UserLifecycle.findOneAndUpdate(
      { userId: user._id },
      {
        $setOnInsert: {
          userId: user._id,
          ...initial,
          operation: null,
          operationId: null,
          accountDisable: pendingStep(),
          localSessionRevocation: pendingStep(),
          clerkSessionRevocation: pendingStep(),
          securityAudit: pendingStep(),
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );
  } catch (error) {
    if (error?.code === 11000) {
      const existing =
        await UserLifecycle.findOne({
          userId: user._id,
        });

      if (existing) return existing;
    }

    throw error;
  }
};

// ==================================================
// STEP UPDATE
// ==================================================


const setStep = async (
  lifecycle,
  name,
  status,
  errorCode = null
) => {
  if (!STEP_NAMES.includes(name)) {
    throw new AppError(
      "Invalid lifecycle step.",
      500,
      "INVALID_LIFECYCLE_STEP"
    );
  }

  const now = new Date();

  const fields = {
    [`${name}.status`]: status,
    [`${name}.lastAttemptAt`]: now,
  };

  if (status === STEP.IN_PROGRESS) {
    fields[`${name}.startedAt`] = now;
    fields[`${name}.completedAt`] = null;
    fields[`${name}.lastError`] = emptyError();
  }

  if (status === STEP.COMPLETED) {
    fields[`${name}.completedAt`] = now;
    fields[`${name}.lastError`] = emptyError();
  }

  if (status === STEP.FAILED) {
    fields[`${name}.lastError`] =
      safeError(errorCode);
  }

  const result = await UserLifecycle.updateOne(
    getLifecycleOwnershipFilter(lifecycle, now),
    {
      $set: fields,
      ...(status === STEP.IN_PROGRESS
        ? {
            $inc: {
              [`${name}.attempts`]: 1,
            },
          }
        : {}),
    }
  );

  if (result.matchedCount !== 1) {
    throw new AppError(
      "Lifecycle lease expired or ownership changed.",
      409,
      "RECONCILIATION_LEASE_LOST"
    );
  }
};


// ==================================================
// RECONCILIATION STATE
// ==================================================

const markReconciliation = async (
  lifecycle,
  errorCode
) => {
  const now = new Date();

  const result = await UserLifecycle.updateOne(
    getLifecycleOwnershipFilter(lifecycle, now),
    {
      $set: {
        status: STATUS.RECONCILIATION_REQUIRED,
        reconciliationRequired: true,
        lastError: {
          code:
            typeof errorCode === "string"
              ? errorCode
              : "RECONCILIATION_INCOMPLETE",
          message:
            "Lifecycle reconciliation is incomplete.",
          occurredAt: now,
        },
      },
    }
  );

  if (result.matchedCount !== 1) {
    throw new AppError(
      "Lifecycle lease expired or ownership changed.",
      409,
      "RECONCILIATION_LEASE_LOST"
    );
  }
};


const renewReconciliationLease = async (
  lifecycle
) => {
  const now = new Date();

  const result =
    await UserLifecycle.findOneAndUpdate(
      getLifecycleOwnershipFilter(
        lifecycle,
        now
      ),
      {
        $set: {
          lastReconciliationAt: now,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

  if (!result) {
    throw new AppError(
      "Reconciliation lease expired or ownership changed.",
      409,
      "RECONCILIATION_LEASE_LOST"
    );
  }

  return result;
};


const recoverAccountDisable = async ({
  user,
  lifecycle,
}) => {
  if (
    lifecycle.operation !== OPERATION.DEACTIVATE ||
    lifecycle.reconciliationRequired !== true
  ) {
    throw new AppError(
      "No pending deactivation operation.",
      409,
      "INVALID_RECOVERY_OPERATION"
    );
  }

  // Do not disable a super_admin through
  // this recovery path.
  if (user.role === "super_admin") {
    throw new AppError(
      "Super admin recovery requires manual review.",
      503,
      "SUPER_ADMIN_RECOVERY_NOT_READY"
    );
  }

  await setStep(
    lifecycle,
    "accountDisable",
    STEP.IN_PROGRESS
  );

  // Idempotent: an already-disabled account
  // remains disabled.
  await User.updateOne(
    {
      _id: user._id,
      isActive: true,
    },
    {
      $set: {
        isActive: false,
      },
    }
  );

  // Confirm the persisted account state.
  const current = await User.findById(
    user._id
  ).select("isActive");

  if (!current || current.isActive) {
    await setStep(
      lifecycle,
      "accountDisable",
      STEP.FAILED,
      "ACCOUNT_DISABLE_NOT_CONFIRMED"
    );

    throw new AppError(
      "Account disable could not be confirmed.",
      503,
      "ACCOUNT_DISABLE_NOT_CONFIRMED"
    );
  }

  await setStep(
    lifecycle,
    "accountDisable",
    STEP.COMPLETED
  );
};

// ==================================================
// REVOKE LOCAL SESSIONS
// ==================================================

const revokeLocalSessions = async (
  userId
) => {
  const result =
    await UserSession.updateMany(
      {
        userId,
        isRevoked: false,
      },
      {
        $set: {
          isRevoked: true,
          revokedAt: new Date(),
        },
      }
    );

  return result.modifiedCount;
};

// ==================================================
// REVOKE LOCALLY KNOWN CLERK SESSIONS
// ==================================================

const revokeKnownClerkSessions = async (userId) => {
  const user = await User.findById(userId)
    .select("clerkId")
    .lean();

  if (!user?.clerkId) {
    throw new AppError(
      "Clerk identity is missing.",
      409,
      "CLERK_IDENTITY_MISSING"
    );
  }

  const records = await UserSession.find({
    userId,
  })
    .select("clerkSessionId")
    .lean();

  const ids = [
    ...new Set(
      records
        .map((record) => record.clerkSessionId)
        .filter(Boolean)
    ),
  ];

  // Read current provider state instead of blindly
  // revoking every historical local session.
  const sessions = await getAllClerkSessions(
    user.clerkId
  );

  const classified = classifyClerkSessions(
    sessions
  );

  if (classified.unknown.length > 0) {
    throw new AppError(
      "Unknown Clerk session status detected.",
      503,
      "CLERK_UNKNOWN_SESSION_STATUS"
    );
  }

  const activeIds = new Set(
    classified.active.map((session) => session.id)
  );

  let attempted = 0;
  let revoked = 0;
  let failed = 0;

  for (const sessionId of ids) {
    // Revoked, expired, replaced, or not present
    // in the snapshot: do not blindly revoke.
    if (!activeIds.has(sessionId)) {
      continue;
    }

    attempted++;

    try {
      await clerkClient.sessions.revokeSession(
        sessionId
      );

      revoked++;
    } catch (error) {
      failed++;

      logger.error(
        "Known Clerk session revocation failed",
        {
          userId: String(userId),
          errorName: error?.name,
          status: error?.status,
        }
      );
    }
  }

  return {
    attempted,
    revoked,
    failed,
  };
};


const CLERK_SESSION_PAGE_SIZE = 100;
const CLERK_SESSION_MAX_PAGES = 100;

const getAllClerkSessions = async (clerkUserId) => {
  if (
    typeof clerkUserId !== "string" ||
    !clerkUserId.trim()
  ) {
    throw new AppError(
      "Clerk user ID is required.",
      409,
      "CLERK_IDENTITY_MISSING"
    );
  }

  const sessions = [];
  const seenIds = new Set();

  let expectedTotal = null;

  for (
    let page = 0;
    page < CLERK_SESSION_MAX_PAGES;
    page++
  ) {
    const result =
      await clerkClient.sessions.getSessionList({
        userId: clerkUserId,
        limit: CLERK_SESSION_PAGE_SIZE,
        offset: page * CLERK_SESSION_PAGE_SIZE,
      });

    if (
      !Array.isArray(result?.data) ||
      !Number.isSafeInteger(result?.totalCount) ||
      result.totalCount < 0 ||
      result.data.length > CLERK_SESSION_PAGE_SIZE
    ) {
      throw new AppError(
        "Invalid Clerk session inventory response.",
        503,
        "CLERK_INVENTORY_INVALID_RESPONSE"
      );
    }

    if (expectedTotal === null) {
      expectedTotal = result.totalCount;
    } else if (result.totalCount !== expectedTotal) {
      throw new AppError(
        "Clerk session inventory changed during pagination.",
        503,
        "CLERK_INVENTORY_CHANGED"
      );
    }

    const offset =
      page * CLERK_SESSION_PAGE_SIZE;

    if (
      result.data.length === 0 &&
      offset < expectedTotal
    ) {
      throw new AppError(
        "Clerk session inventory contains a missing page.",
        503,
        "CLERK_INVENTORY_INCOMPLETE"
      );
    }

    for (const session of result.data) {
      if (
        typeof session?.id !== "string" ||
        !session.id ||
        session.userId !== clerkUserId
      ) {
        throw new AppError(
          "Clerk session identity mismatch.",
          503,
          "CLERK_SESSION_IDENTITY_MISMATCH"
        );
      }

      if (seenIds.has(session.id)) {
        throw new AppError(
          "Duplicate Clerk session detected during pagination.",
          503,
          "CLERK_INVENTORY_DUPLICATE_SESSION"
        );
      }

      seenIds.add(session.id);
      sessions.push(session);
    }

    if (sessions.length === expectedTotal) {
      return sessions;
    }

    if (
      sessions.length > expectedTotal ||
      result.data.length < CLERK_SESSION_PAGE_SIZE
    ) {
      throw new AppError(
        "Clerk session inventory is incomplete.",
        503,
        "CLERK_INVENTORY_INCOMPLETE"
      );
    }
  }

  throw new AppError(
    "Clerk session inventory exceeded pagination limit.",
    503,
    "CLERK_INVENTORY_PAGE_LIMIT"
  );
};


const classifyClerkSessions = (sessions) => {
  const active = [];
  const inactive = [];
  const unknown = [];

  const INACTIVE_STATUSES = new Set([
    "revoked",
    "expired",
    "replaced",
  ]);

  for (const session of sessions) {
    if (session.status === "active") {
      active.push(session);
    } else if (
      INACTIVE_STATUSES.has(session.status)
    ) {
      inactive.push(session);
    } else {
      unknown.push(session);
    }
  }

  return {
    active,
    inactive,
    unknown,
  };
};


const revokeActiveClerkSessions = async ({
  user,
}) => {
  if (!user.clerkId) {
    throw new AppError(
      "Clerk identity is missing.",
      409,
      "CLERK_IDENTITY_MISSING"
    );
  }

  const sessions = await getAllClerkSessions(
    user.clerkId
  );

  const classified = classifyClerkSessions(
    sessions
  );

  if (classified.unknown.length > 0) {
    throw new AppError(
      "Unknown Clerk session status detected.",
      503,
      "CLERK_UNKNOWN_SESSION_STATUS"
    );
  }

  let attempted = 0;
  let revoked = 0;
  let failed = 0;

  for (const session of classified.active) {
    attempted++;

    try {
      await clerkClient.sessions.revokeSession(
        session.id
      );

      revoked++;
    } catch (error) {
      failed++;

      logger.error(
        "Clerk active session revocation failed",
        {
          userId: String(user._id),
          errorName: error?.name,
          status: error?.status,
        }
      );
    }
  }

  // Verify provider state after revocation.
  // This is a point-in-time snapshot only.
  const verification =
    await verifyClerkSessionInventory({
      user,
    });

  return {
    attempted,
    revoked,
    failed,
    verified: verification.verified,
    remainingActive:
      verification.activeSessions,
    unknownSessions:
      verification.unknownSessions,
    verificationCode: verification.code,
  };
};

// ==================================================
// CLERK SESSION VERIFICATION STATUS
// ==================================================
//
// Local UserSession records are not guaranteed
// to represent every Clerk session.
//
// Do not return verified=true until the
// installed Clerk SDK's user-session listing,
// pagination, and session-status behavior
// have been integration-tested.
// ==================================================

const verifyClerkSessionInventory = async ({
  user,
}) => {
  if (!user.clerkId) {
    throw new AppError(
      "Clerk identity is missing.",
      409,
      "CLERK_IDENTITY_MISSING"
    );
  }

  const sessions =
    await getAllClerkSessions(user.clerkId);

  const {
    active,
    inactive,
    unknown,
  } = classifyClerkSessions(sessions);

  if (unknown.length > 0) {
    return {
      verified: false,
      clerkUserId: user.clerkId,
      totalSessions: sessions.length,
      activeSessions: active.length,
      inactiveSessions: inactive.length,
      unknownSessions: unknown.length,
      code: "CLERK_UNKNOWN_SESSION_STATUS",
    };
  }

  if (active.length > 0) {
    return {
      verified: false,
      clerkUserId: user.clerkId,
      totalSessions: sessions.length,
      activeSessions: active.length,
      inactiveSessions: inactive.length,
      unknownSessions: 0,
      code: "CLERK_ACTIVE_SESSIONS_REMAIN",
    };
  }

  return {
    verified: true,
    clerkUserId: user.clerkId,
    totalSessions: sessions.length,
    activeSessions: 0,
    inactiveSessions: inactive.length,
    unknownSessions: 0,
    code: "CLERK_INVENTORY_NO_ACTIVE_SESSIONS",
  };
};

// ==================================================
// BEGIN DEACTIVATION
// ==================================================

const beginDeactivation = async (
  user,
  actor,
  reason
) => {
  const operationId = crypto.randomUUID();

  // Only ACTIVE -> DEACTIVATING is allowed.
  // Existing reconciliation state is preserved.

  const lifecycle =
    await UserLifecycle.findOneAndUpdate(
      {
        userId: user._id,
        status: STATUS.ACTIVE,
        operation: null,
        reconciliationRequired: false,
      },
      {
        $set: {
          status: STATUS.DEACTIVATING,
          operation: OPERATION.DEACTIVATE,
          operationId,
          requestedBy: actor._id,
          reason,
         
requestedAt: new Date(),
completedAt: null,
lastReconciliationAt: new Date(),
reconciliationRequired: true,

          accountDisable: pendingStep(),
          localSessionRevocation:
            pendingStep(),
          clerkSessionRevocation:
            pendingStep(),
          securityAudit: pendingStep(),
        },
      },
      { new: true }
    );

  if (!lifecycle) {
    throw new AppError(
      "Account lifecycle is not ready for deactivation.",
      409,
      "LIFECYCLE_STATE_CONFLICT"
    );
  }

  return lifecycle;
};

// ==================================================
// DEACTIVATE ACCOUNT
// ==================================================

export const deactivateUserLifecycle = async ({
  userId,
  actor,
  reason,
  req,
}) => {
  const user = await findUser(userId);

  authorize(actor, user);

  if (
    typeof reason !== "string" ||
    reason.trim().length < 3
  ) {
    throw new AppError(
      "Deactivation reason is required.",
      400,
      "DEACTIVATION_REASON_REQUIRED"
    );
  }

  // Super admin lifecycle changes require
  // serialized last-admin protection.

  if (user.role === "super_admin") {
    throw new AppError(
      "Super admin deactivation is not enabled.",
      503,
      "SUPER_ADMIN_LIFECYCLE_NOT_READY"
    );
  }

  const existing =
    await initializeUserLifecycle(user._id);

  if (!user.isActive) {
    return {
      user: publicUser(user),
      status: existing.status,
      alreadyInactive: true,
      reconciliationRequired:
        existing.reconciliationRequired,
    };
  }

  const lifecycle =
    await beginDeactivation(
      user,
      actor,
      reason.trim()
    );

  try {
    // ------------------------------------------
    // 1. Disable application account
    // ----------------------------------

    await renewReconciliationLease(lifecycle);

    await setStep(
      lifecycle,
      "accountDisable",
      STEP.IN_PROGRESS
    );

    const disabled =
      await User.updateOne(
        {
          _id: user._id,
          isActive: true,
        },
        {
          $set: {
            isActive: false,
          },
        }
      );

    if (disabled.modifiedCount !== 1) {
      throw new AppError(
        "Account state changed.",
        409,
        "ACCOUNT_STATE_CONFLICT"
      );
    }

    await setStep(
      lifecycle,
      "accountDisable",
      STEP.COMPLETED
    );

    // ------------------------------------------
    // 2. Revoke local sessions
    // ------------------------------------------

    await setStep(
      lifecycle,
      "localSessionRevocation",
      STEP.IN_PROGRESS
    );

    const localRevoked =
      await revokeLocalSessions(user._id);

    await setStep(
      lifecycle,
      "localSessionRevocation",
      STEP.COMPLETED
    );

    // ------------------------------------------
    // 3. Revoke locally known Clerk sessions
    // ------------------------------------------

    await setStep(
      lifecycle,
      "clerkSessionRevocation",
      STEP.IN_PROGRESS
    );

    const clerk =
      await revokeKnownClerkSessions(
        user._id
      );

    if (clerk.failed > 0) {
      await setStep(
        lifecycle,
        "clerkSessionRevocation",
        STEP.FAILED,
        "CLERK_REVOCATION_PARTIAL"
      );

      throw new AppError(
        "Clerk session revocation requires reconciliation.",
        503,
        "CLERK_REVOCATION_PARTIAL"
      );
    }

    await setStep(
      lifecycle,
      "clerkSessionRevocation",
      STEP.COMPLETED
    );

    // ------------------------------------------
    // 4. Security audit
    // ------------------------------------------

    await setStep(
      lifecycle,
      "securityAudit",
      STEP.IN_PROGRESS
    );

    await createSecurityEvent({
      userId: user._id,
      eventType: "ACCOUNT_DEACTIVATED",
      ipAddress: req?.ip ?? null,
      userAgent:
        req?.get?.("user-agent") ?? null,
      metadata: {
        operationId:
          lifecycle.operationId,
        performedBy: String(actor._id),
        reason: reason.trim(),
      },
idempotencyKey:
  getDeactivationAuditKey(lifecycle),

    });

    await setStep(
      lifecycle,
      "securityAudit",
      STEP.COMPLETED
    );

    // ------------------------------------------
    // 5. Preserve reconciliation requirement
    // ------------------------------------------
    //
    // Known Clerk sessions were processed.
    // Full provider inventory has NOT been
    // independently verified.
    // ------------------------------------------

    // ============================================
    // STEP 5 — VERIFY CLERK SESSION INVENTORY
    // ============================================

await renewReconciliationLease(lifecycle);

const providerRevocation =
  await revokeActiveClerkSessions({
    user,
  });

if (providerRevocation.failed > 0) {
  throw new AppError(
    "Clerk provider session revocation is incomplete.",
    503,
    "CLERK_PROVIDER_REVOCATION_PARTIAL"
  );
}

await renewReconciliationLease(lifecycle);

    const verification =
      await verifyClerkSessionInventory({
        user,
      });

 await renewReconciliationLease(lifecycle);
await markReconciliation(
  lifecycle,
  verification.verified
    ? "FINAL_RECONCILIATION_REVIEW_REQUIRED"
    : verification.code
);

    // ============================================
    // RESPONSE
    // ============================================

    return {
      user: {
        ...publicUser(user),
        isActive: false,
      },

      operationId:
        lifecycle.operationId,

      status:
        STATUS.RECONCILIATION_REQUIRED,

      reconciliationRequired: true,

      localSessionsRevoked:
        localRevoked,

      clerkSessionsAttempted:
        clerk.attempted,

      clerkSessionsRevoked:
        clerk.revoked,

      providerVerification: {
        verified:
          verification.verified,

        code:
          verification.code,
      },
    };

  } catch (error) {
    try {
      await markReconciliation(
        lifecycle,
        typeof error?.code === "string"
          ? error.code
          : "DEACTIVATION_INTERRUPTED"
      );
    } catch (stateError) {
      logger.error(
        "Lifecycle reconciliation state update failed",
        {
          userId: String(user._id),
          errorName: stateError?.name,
        }
      );
    }

    // Never automatically reactivate
    // an account after partial cleanup.

    throw error;
  }
};

// ==================================================
// RECONCILE INCOMPLETE DEACTIVATION
// ==================================================


export const reconcileUserLifecycle = async ({
  userId,
  actor,
}) => {
  const user = await findUser(userId);

  authorize(actor, user);



  const now = new Date();

  const leaseCutoff = new Date(
    now.getTime() - RECONCILIATION_LEASE_MS
  );

  const newOperationId = crypto.randomUUID();

  // ==================================================
  // ATOMIC LEASE ACQUISITION
  // ==================================================
  //
  // Case A: reconciliation_required -> deactivating
  //
  // Case B: deactivating with expired retry lease
  //
  // operationId is rotated to fence older workers
  // from writing lifecycle state.
  // ==================================================

  const lifecycle =
    await UserLifecycle.findOneAndUpdate(
      {
        userId: user._id,
        operation: OPERATION.DEACTIVATE,
        reconciliationRequired: true,

       
$or: [
  {
    status:
      STATUS.RECONCILIATION_REQUIRED,
  },
  {
    status: STATUS.DEACTIVATING,
    lastReconciliationAt: {
      $lte: leaseCutoff,
    },
  },
  {
    status: STATUS.DEACTIVATING,
    lastReconciliationAt: null,
    requestedAt: {
      $lte: leaseCutoff,
    },
  },
],

      },
      {
        $set: {
          status: STATUS.DEACTIVATING,
          operationId: newOperationId,
          lastReconciliationAt: now,
        },
        $inc: {
          reconciliationAttempts: 1,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

  if (!lifecycle) {
    throw new AppError(
      "Reconciliation is unavailable or another operation is running.",
      409,
      "RECONCILIATION_CONFLICT"
    );
  }

  
     try {
    // ==================================================
    // STEP 0 — RECOVER ACCOUNT DISABLE
    // ==================================================
  await renewReconciliationLease(lifecycle);

    await recoverAccountDisable({
      user,
      lifecycle,
    });

    // ==================================================
    // STEP 1 — LOCAL SESSION REVOCATION
    // ==================================================
  await renewReconciliationLease(lifecycle);

    await setStep(
      lifecycle,
      "localSessionRevocation",
      STEP.IN_PROGRESS
    );

    const localRevoked =
      await revokeLocalSessions(user._id);

    await setStep(
      lifecycle,
      "localSessionRevocation",
      STEP.COMPLETED
    );

    // ==================================================
    // STEP 2 — KNOWN CLERK SESSION REVOCATION
    // ==================================================
  await renewReconciliationLease(lifecycle);

    await setStep(
      lifecycle,
      "clerkSessionRevocation",
      STEP.IN_PROGRESS
    );

    const clerk =
      await revokeKnownClerkSessions(
        user._id
      );

    if (clerk.failed > 0) {
      await setStep(
        lifecycle,
        "clerkSessionRevocation",
        STEP.FAILED,
        "CLERK_REVOCATION_PARTIAL"
      );

      throw new AppError(
        "Some Clerk sessions could not be revoked.",
        503,
        "CLERK_REVOCATION_PARTIAL"
      );
    }

    await setStep(
      lifecycle,
      "clerkSessionRevocation",
      STEP.COMPLETED
    );

    // ==================================================
    // STEP 3 — PROVIDER VERIFICATION
    // ==================================================

await renewReconciliationLease(lifecycle);

const providerRevocation =
  await revokeActiveClerkSessions({
    user,
  });

if (providerRevocation.failed > 0) {
  throw new AppError(
    "Clerk provider session revocation is incomplete.",
    503,
    "CLERK_PROVIDER_REVOCATION_PARTIAL"
  );
}

await renewReconciliationLease(lifecycle);

    const verification =
      await verifyClerkSessionInventory({
        user,
      });

    // The current verification helper returns
    // verified=false until the actual Clerk
    // inventory API is integrated and tested.

// ============================================
// STEP 4 — IDEMPOTENT AUDIT RECOVERY
// ============================================

await renewReconciliationLease(lifecycle);

await setStep(
  lifecycle,
  "securityAudit",
  STEP.IN_PROGRESS
);

try {
  await createSecurityEvent({
    userId: user._id,
    eventType: "ACCOUNT_DEACTIVATED",
    idempotencyKey:
      getDeactivationAuditKey(lifecycle),
    metadata: {
      performedBy: String(
        lifecycle.requestedBy
      ),
      reason: lifecycle.reason,
      originalRequestedAt:
        lifecycle.requestedAt,
    },
  });

  await setStep(
    lifecycle,
    "securityAudit",
    STEP.COMPLETED
  );
} catch (error) {
  await setStep(
    lifecycle,
    "securityAudit",
    STEP.FAILED,
    "SECURITY_AUDIT_RECOVERY_FAILED"
  );

  throw error;
}

    await markReconciliation(
      lifecycle,
      verification.verified
        ? "FINAL_RECONCILIATION_REVIEW_REQUIRED"
        : verification.code
    );

    return {
      user: {
        ...publicUser(user),
        isActive: false,
      },

      operationId: lifecycle.operationId,

      status:
        STATUS.RECONCILIATION_REQUIRED,

      reconciliationRequired: true,

      localSessionsRevoked: localRevoked,

      clerkSessionsAttempted:
        clerk.attempted,

      clerkSessionsRevoked:
        clerk.revoked,

      providerVerification: {
        verified: verification.verified,
        code: verification.code,
      },
    };
  } catch (error) {
    try {
      await markReconciliation(
        lifecycle,
        typeof error?.code === "string"
          ? error.code
          : "RECONCILIATION_FAILED"
      );
    } catch (stateError) {
      logger.error(
        "Unable to restore reconciliation state",
        {
          userId: String(user._id),
          errorName: stateError?.name,
        }
      );
    }

    throw error;
  }
};


// ==================================================
// REACTIVATE ACCOUNT — FAIL CLOSED
// ==================================================

export const reactivateUserLifecycle = async ({
  userId,
  actor,
  reason,
}) => {
  const user = await findUser(userId);

  authorize(actor, user);

  if (user.isActive) {
    return {
      user: publicUser(user),
      alreadyActive: true,
    };
  }

  // Until full Clerk inventory verification,
  // atomic state transition and audit logging
  // are implemented, never reactivate here.

  throw new AppError(
    "Reactivation is unavailable until provider session reconciliation is verified.",
    503,
    "REACTIVATION_NOT_READY"
  );
};

// ==================================================
// GET LIFECYCLE STATE
// ==================================================

export const getUserLifecycleState = async ({
  userId,
  actor,
}) => {
  const user = await findUser(userId);

  authorize(actor, user);

  const lifecycle =
    await UserLifecycle.findOne({
      userId: user._id,
    })
      .select(
        "-lastError.message " +
        "-accountDisable.lastError.message " +
        "-localSessionRevocation.lastError.message " +
        "-clerkSessionRevocation.lastError.message " +
        "-securityAudit.lastError.message"
      )
      .lean();

  return {
    user: publicUser(user),
    lifecycle,
  };
};
