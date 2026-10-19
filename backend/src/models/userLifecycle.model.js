
import mongoose from "mongoose";

// ==================================================
// LIFECYCLE STATUS
// ==================================================

export const USER_LIFECYCLE_STATUS = Object.freeze({
  ACTIVE: "active",
  DEACTIVATING: "deactivating",
  INACTIVE: "inactive",
  REACTIVATING: "reactivating",
  RECONCILIATION_REQUIRED:
    "reconciliation_required",
});

// ==================================================
// LIFECYCLE OPERATIONS
// ==================================================

export const USER_LIFECYCLE_OPERATIONS = Object.freeze({
  DEACTIVATE: "deactivate",
  REACTIVATE: "reactivate",
});

// ==================================================
// STEP STATUS
// ==================================================

export const LIFECYCLE_STEP_STATUS = Object.freeze({
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  FAILED: "failed",
});

// ==================================================
// RECONCILIATION STEP SCHEMA
// ==================================================

const lifecycleStepSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: Object.values(
        LIFECYCLE_STEP_STATUS
      ),
      default:
        LIFECYCLE_STEP_STATUS.PENDING,
      required: true,
    },

    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    startedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    lastAttemptAt: {
      type: Date,
      default: null,
    },

    lastError: {
      code: {
        type: String,
        default: null,
      },

      message: {
        type: String,
        default: null,
        maxlength: 500,
      },

      occurredAt: {
        type: Date,
        default: null,
      },
    },
  },
  {
    _id: false,
  }
);

// ==================================================
// USER LIFECYCLE SCHEMA
// ==================================================

const userLifecycleSchema = new mongoose.Schema(
  {
    // ==============================================
    // TARGET USER
    // ==============================================

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },

    // ==============================================
    // CURRENT LIFECYCLE STATUS
    // ==============================================

    status: {
      type: String,
      enum: Object.values(
        USER_LIFECYCLE_STATUS
      ),
      required: true,
      default:
        USER_LIFECYCLE_STATUS.ACTIVE,
    },

    // ==============================================
    // CURRENT OPERATION
    // ==============================================

    operation: {
      type: String,
      enum: [
        ...Object.values(
          USER_LIFECYCLE_OPERATIONS
        ),
        null,
      ],
      default: null,
    },

    // ==============================================
    // REQUESTED BY
    // ==============================================

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ==============================================
    // REASON
    // ==============================================

    reason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },

    // ==============================================
    // OPERATION ID
    // ==============================================
    //
    // Used for operation correlation and
    // retry/reconciliation workflows.
    // ==============================================

    operationId: {
      type: String,
      default: null,
      maxlength: 128,
    },

    // ==============================================
    // ACCOUNT DISABLE STEP
    // ==============================================

    accountDisable: {
      type: lifecycleStepSchema,
      default: () => ({}),
    },

    // ==============================================
    // LOCAL SESSION REVOCATION
    // ==============================================

    localSessionRevocation: {
      type: lifecycleStepSchema,
      default: () => ({}),
    },

    // ==============================================
    // CLERK SESSION REVOCATION
    // ==============================================

    clerkSessionRevocation: {
      type: lifecycleStepSchema,
      default: () => ({}),
    },

    // ==============================================
    // SECURITY AUDIT STEP
    // ==============================================

    securityAudit: {
      type: lifecycleStepSchema,
      default: () => ({}),
    },

    // ==============================================
    // RECONCILIATION STATE
    // ==============================================

    reconciliationRequired: {
      type: Boolean,
      default: false,
    },

    reconciliationAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastReconciliationAt: {
      type: Date,
      default: null,
    },

    reconciledAt: {
      type: Date,
      default: null,
    },

    // ==============================================
    // OPERATION TIMESTAMPS
    // ==============================================

    requestedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    deactivatedAt: {
      type: Date,
      default: null,
    },

    reactivatedAt: {
      type: Date,
      default: null,
    },

    // ==============================================
    // LAST ERROR
    // ==============================================

    lastError: {
      code: {
        type: String,
        default: null,
      },

      message: {
        type: String,
        default: null,
        maxlength: 500,
      },

      occurredAt: {
        type: Date,
        default: null,
      },
    },
  },
  {
  timestamps: true,
  versionKey: "__v",
  optimisticConcurrency: true,
}
);

// ==================================================
// INDEXES
// ==================================================

// One lifecycle state per user.
userLifecycleSchema.index(
  { userId: 1 },
  { unique: true }
);

// Reconciliation worker lookup.
userLifecycleSchema.index({
  reconciliationRequired: 1,
  status: 1,
  updatedAt: 1,
});

// Administrative lifecycle history lookup.
userLifecycleSchema.index({
  requestedBy: 1,
  requestedAt: -1,
});

// Operation correlation.
userLifecycleSchema.index(
  { operationId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      operationId: {
        $type: "string",
      },
    },
  }
);

// ==================================================
// MODEL
// ==================================================

const UserLifecycle =
  mongoose.models.UserLifecycle ||
  mongoose.model(
    "UserLifecycle",
    userLifecycleSchema
  );

export default UserLifecycle;
