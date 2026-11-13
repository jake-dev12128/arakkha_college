
import mongoose from "mongoose";

const { Schema } = mongoose;

// ==================================================
// ACC CONTACT NOTIFICATION — CONSTANTS
// ==================================================

export const CONTACT_NOTIFICATION_TYPES =
  Object.freeze([
    "admin_notification",
    "visitor_confirmation",
    "admin_reply",
  ]);

export const CONTACT_NOTIFICATION_STATUSES =
  Object.freeze([
    "pending",
    "processing",
    "sent",
    "failed",
    "cancelled",
  ]);

export const CONTACT_NOTIFICATION_MAX_ATTEMPTS = 5;

export const CONTACT_NOTIFICATION_LEASE_MS =
  5 * 60 * 1000;

// ==================================================
// EMAIL ADDRESS VALIDATION
// ==================================================

// This is a persistence-level safeguard.
// Zod and service-level validation remain required.

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ==================================================
// CONTACT NOTIFICATION SCHEMA
// ==================================================

const contactNotificationSchema = new Schema(
  {
    // ----------------------------------------------
    // RELATED CONTACT MESSAGE
    // ----------------------------------------------

    contact: {
      type: Schema.Types.ObjectId,
      ref: "Contact",
      required: true,
      immutable: true,
    },

    // ----------------------------------------------
    // NOTIFICATION TYPE
    // ----------------------------------------------

    type: {
      type: String,
      enum: CONTACT_NOTIFICATION_TYPES,
      required: true,
      immutable: true,
    },

    // ----------------------------------------------
    // IDEMPOTENCY
    // ----------------------------------------------

    // Unique logical job identifier.
    // Generate this in the service layer.
    //
    // Examples:
    // contact:<contactId>:admin_notification:v1
    // contact:<contactId>:visitor_confirmation:v1
    // contact:<contactId>:reply:<replyId>

    idempotencyKey: {
      type: String,
      required: true,
      immutable: true,
      trim: true,
      minlength: 1,
      maxlength: 255,
    },

    // ----------------------------------------------
    // EMAIL DESTINATION
    // ----------------------------------------------

    recipientEmail: {
      type: String,
      required: true,
      immutable: true,
      lowercase: true,
      trim: true,
      maxlength: 320,
      validate: {
        validator(value) {
          return EMAIL_PATTERN.test(value);
        },
        message: "Invalid recipient email.",
      },
    },

    // ----------------------------------------------
    // EMAIL CONTENT SNAPSHOT
    // ----------------------------------------------

    subject: {
      type: String,
      required: true,
      immutable: true,
      trim: true,
      minlength: 1,
      maxlength: 250,
    },

    // Plain-text email body.
    // HTML rendering must be escaped in the service.

    textBody: {
      type: String,
      required: true,
      immutable: true,
      minlength: 1,
      maxlength: 20000,
    },

    // Optional related reply subdocument ID.
    // Required by service for admin_reply jobs.

    replyId: {
      type: Schema.Types.ObjectId,
      default: null,
      immutable: true,
    },

    // ----------------------------------------------
    // JOB STATUS
    // ----------------------------------------------

    status: {
      type: String,
      enum: CONTACT_NOTIFICATION_STATUSES,
      required: true,
      default: "pending",
    },

    // ----------------------------------------------
    // RETRY CONTROL
    // ----------------------------------------------

    attempts: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Attempts must be an integer.",
      },
    },

    maxAttempts: {
      type: Number,
      default: CONTACT_NOTIFICATION_MAX_ATTEMPTS,
      min: 1,
      max: 20,
      validate: {
        validator: Number.isInteger,
        message: "Max attempts must be an integer.",
      },
    },

    nextRetryAt: {
      type: Date,
      default: Date.now,
    },

    lastAttemptAt: {
      type: Date,
      default: null,
    },

    // ----------------------------------------------
    // ATOMIC WORKER LEASE
    // ----------------------------------------------

    // Unique token for the worker holding the job.
    // Generate using crypto.randomUUID().

    lockToken: {
      type: String,
      default: null,
      maxlength: 128,
    },

    lockedBy: {
      type: String,
      default: null,
      maxlength: 128,
    },

    lockedAt: {
      type: Date,
      default: null,
    },

    lockExpiresAt: {
      type: Date,
      default: null,
    },

    // ----------------------------------------------
    // RESEND DELIVERY
    // ----------------------------------------------

    // Provider message ID returned by Resend.
    // This means accepted, not necessarily delivered.

    providerMessageId: {
      type: String,
      default: null,
      trim: true,
      maxlength: 255,
    },

    providerAcceptedAt: {
      type: Date,
      default: null,
    },

    sentAt: {
      type: Date,
      default: null,
    },

    deliveredAt: {
      type: Date,
      default: null,
    },

    // ----------------------------------------------
    // ERROR TRACKING
    // ----------------------------------------------

    lastErrorCode: {
      type: String,
      default: null,
      maxlength: 100,
    },

    lastError: {
      type: String,
      default: null,
      maxlength: 500,
    },

    failedAt: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    // ----------------------------------------------
    // AUDIT
    // ----------------------------------------------

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "contact_notifications",
    versionKey: "__v",
  }
);

// ==================================================
// DATABASE INDEXES
// ==================================================

// One logical email job per idempotency key.

contactNotificationSchema.index(
  {
    idempotencyKey: 1,
  },
  {
    unique: true,
    name: "contact_notification_idempotency_unique",
  }
);

// Pending/retry job lookup.

contactNotificationSchema.index(
  {
    status: 1,
    nextRetryAt: 1,
    createdAt: 1,
  },
  {
    name: "contact_notification_pending_queue",
  }
);

// Expired processing lease lookup.

contactNotificationSchema.index(
  {
    lockExpiresAt: 1,
  },
  {
    name: "contact_notification_lease_expiry",
    partialFilterExpression: {
      status: "processing",
    },
  }
);

// Contact notification history.

contactNotificationSchema.index(
  {
    contact: 1,
    createdAt: -1,
  },
  {
    name: "contact_notification_history",
  }
);

// Resend webhook correlation.

contactNotificationSchema.index(
  {
    providerMessageId: 1,
  },
  {
    name: "contact_notification_provider_message",
    partialFilterExpression: {
      providerMessageId: {
        $type: "string",
      },
    },
  }
);

// Admin monitoring.

contactNotificationSchema.index(
  {
    status: 1,
    updatedAt: -1,
  },
  {
    name: "contact_notification_monitoring",
  }
);

// ==================================================
// MODEL EXPORT
// ==================================================

const ContactNotification =
  mongoose.models.ContactNotification ||
  mongoose.model(
    "ContactNotification",
    contactNotificationSchema
  );

export default ContactNotification;
