import mongoose from "mongoose";

const userSessionSchema = new mongoose.Schema(
  {
    // ==================================================
    // USER
    // ==================================================
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ==================================================
    // CLERK SESSION
    // ==================================================
    clerkSessionId: {
      type: String,
      required: true,
      maxlength: 255,
      trim: true,
    },

    // ==================================================
    // DEVICE
    // ==================================================
    deviceId: {
      type: String,
      required: true,
      maxlength: 255,
      trim: true,
    },

    // Stable client fingerprint used only as a heuristic for
    // detecting whether a login comes from a previously seen client.
    // It is intentionally separate from clerkSessionId/deviceId.
    deviceFingerprint: {
      type: String,
      default: null,
      maxlength: 255,
      trim: true,
      index: true,
    },

    deviceName: {
      type: String,
      default: "Unknown Device",
      maxlength: 255,
      trim: true,
    },

    browser: {
      type: String,
      default: "Unknown",
      maxlength: 100,
      trim: true,
    },

    operatingSystem: {
      type: String,
      default: "Unknown",
      maxlength: 100,
      trim: true,
    },

    // ==================================================
    // NETWORK
    // ==================================================
    ipAddress: {
      type: String,
      default: null,
      maxlength: 100,
      trim: true,
    },

    // ==================================================
    // LOCATION
    // ==================================================
    location: {
      country: {
        type: String,
        default: null,
        maxlength: 100,
        trim: true,
      },

      city: {
        type: String,
        default: null,
        maxlength: 100,
        trim: true,
      },
    },

    // ==================================================
    // ACTIVITY
    // ==================================================
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },

    // ==================================================
    // REVOCATION
    // ==================================================
    isRevoked: {
      type: Boolean,
      default: false,
    },

    revokedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ==================================================
// UNIQUE CLERK SESSION PER USER
// ==================================================

userSessionSchema.index(
  {
    userId: 1,
    clerkSessionId: 1,
  },
  {
    unique: true,
    name: "unique_clerk_session_per_user",
  }
);

// ==================================================
// USER SESSION HISTORY
// ==================================================

userSessionSchema.index(
  {
    userId: 1,
    createdAt: -1,
  },
  {
    name: "user_sessions_created_at",
  }
);

// ==================================================
// SESSION STATUS + ACTIVITY
// ==================================================

userSessionSchema.index(
  {
    userId: 1,
    deviceFingerprint: 1,
    isRevoked: 1,
  },
  {
    name: "user_sessions_device_fingerprint",
  }
);

userSessionSchema.index(
  {
    userId: 1,
    isRevoked: 1,
    lastActiveAt: -1,
  },
  {
    name: "user_sessions_status_activity",
  },
);

const UserSession = mongoose.model(
  "UserSession",
  userSessionSchema
);

export default UserSession;