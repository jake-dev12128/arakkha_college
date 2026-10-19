
import mongoose from "mongoose";

// ==================================================
// SECURITY EVENT TYPES
// ==================================================

export const SECURITY_EVENT_TYPES = Object.freeze([
  // Authentication
  "LOGIN_SUCCESS",
  "LOGIN_FAILED",
  "LOGOUT",
  "LOGOUT_ALL",

  // OTP
  "OTP_SENT",
  "OTP_FAILED",
  "OTP_VERIFIED",

  // Password
  "PASSWORD_RESET_REQUESTED",
  "PASSWORD_RESET_COMPLETED",

  // Sessions and devices
  "SESSION_REVOKED",
  "NEW_DEVICE_LOGIN",

  // Role management
  "ROLE_CHANGED",

  // Account lifecycle
  "ACCOUNT_DEACTIVATED",
  "ACCOUNT_REACTIVATED",

  // Lifecycle cleanup / reconciliation
  "ACCOUNT_LIFECYCLE_RECONCILIATION_REQUIRED",
  "ACCOUNT_LIFECYCLE_RECONCILED",

  // Permanent deletion lifecycle
  "ACCOUNT_DELETION_REQUESTED",
  "ACCOUNT_DELETION_BLOCKED",
  "ACCOUNT_PERMANENTLY_DELETED",
]);

// ==================================================
// SECURITY EVENT SCHEMA
// ==================================================

const securityEventSchema = new mongoose.Schema(
  {
    // ==============================================
    // USER
    // ==============================================

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ==============================================
    // EVENT TYPE
    // ==============================================

    eventType: {
      type: String,
      required: true,
      enum: SECURITY_EVENT_TYPES,
    },

    // ==============================================
    // IP ADDRESS
    // ==============================================

    ipAddress: {
      type: String,
      default: null,
    },

    // ==============================================
    // USER AGENT
    // ==============================================

    userAgent: {
      type: String,
      default: null,
      maxlength: 1000,
    },

    // ==============================================
    // DEVICE ID
    // ==============================================

    deviceId: {
      type: String,
      default: null,
      maxlength: 255,
    },

    // ==============================================
    // SAFE AUDIT METADATA
    // ==============================================
    //
    // Examples:
    // {
    //   performedBy: "MongoDB user ID",
    //   targetRole: "student",
    //   reason: "Administrative suspension"
    // }
    //
    // Never store:
    // - Passwords
    // - OTP codes
    // - Clerk session tokens
    // - API keys
    // - Authorization headers
    // ==============================================

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ==================================================
// INDEXES
// ==================================================

securityEventSchema.index(
  { idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      idempotencyKey: { $type: "string" },
    },
    name: "unique_security_event_idempotency_key",
  }
);

// User security history
securityEventSchema.index({
  userId: 1,
  createdAt: -1,
});

// Filter by event type
securityEventSchema.index({
  eventType: 1,
  createdAt: -1,
});

// ==================================================
// MODEL
// ==================================================

const SecurityEvent = mongoose.model(
  "SecurityEvent",
  securityEventSchema
);

export default SecurityEvent;
