
import mongoose from "mongoose";

const { Schema } = mongoose;

// ==================================================
// CONSTANTS
// ==================================================

export const CONTACT_CATEGORIES = Object.freeze([
  "general",
  "admission",
  "programs",
  "student_support",
  "collaboration",
  "other",
]);

export const CONTACT_STATUSES = Object.freeze([
  "new",
  "in_progress",
  "replied",
  "closed",
]);

export const CONTACT_PRIORITIES = Object.freeze([
  "low",
  "normal",
  "high",
  "urgent",
]);

export const CONTACT_REPLY_STATUSES = Object.freeze([
  "pending",
  "sending",
  "sent",
  "delivered",
  "failed",
]);

// ==================================================
// REPLY HISTORY SCHEMA
// ==================================================

const contactReplySchema = new Schema(
  {
    body: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 10000,
    },

    repliedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    recipientEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 320,
    },

    deliveryStatus: {
      type: String,
      enum: CONTACT_REPLY_STATUSES,
      default: "pending",
    },

    providerMessageId: {
      type: String,
      trim: true,
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

    failureReason: {
      type: String,
      maxlength: 500,
      default: null,
    },
  },
  {
    _id: true,
    timestamps: true,
  }
);

// ==================================================
// CONTACT MESSAGE SCHEMA
// ==================================================

const contactSchema = new Schema(
  {
    // ----------------------------------------------
    // PUBLIC REFERENCE
    // ----------------------------------------------

    referenceNumber: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      trim: true,
      maxlength: 64,
    },

    // ----------------------------------------------
    // VISITOR INFORMATION
    // ----------------------------------------------

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 320,
    },

    phone: {
      type: String,
      trim: true,
      maxlength: 30,
      default: "",
    },

    // ----------------------------------------------
    // INQUIRY CONTENT
    // ----------------------------------------------

    category: {
      type: String,
      enum: CONTACT_CATEGORIES,
      required: true,
      default: "general",
    },

    subject: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 250,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 10000,
    },

    // ----------------------------------------------
    // MANAGEMENT STATUS
    // ----------------------------------------------

    status: {
      type: String,
      enum: CONTACT_STATUSES,
      default: "new",
      required: true,
    },

    priority: {
      type: String,
      enum: CONTACT_PRIORITIES,
      default: "normal",
    },

    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ----------------------------------------------
    // ADMIN REVIEW
    // ----------------------------------------------

    firstViewedAt: {
      type: Date,
      default: null,
    },

    firstViewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    lastRepliedAt: {
      type: Date,
      default: null,
    },

    closedAt: {
      type: Date,
      default: null,
    },

    closedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ----------------------------------------------
    // ADMIN REPLY HISTORY
    // ----------------------------------------------

    replies: {
      type: [contactReplySchema],
      default: [],
    },

    // ----------------------------------------------
    // INTERNAL ADMIN NOTES
    // ----------------------------------------------

    internalNotes: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: "",
    },

    // ----------------------------------------------
    // AUDIT
    // ----------------------------------------------

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
    collection: "contact_messages",
  }
);

// ==================================================
// DATABASE INDEXES
// ==================================================

// Admin inbox: newest messages by status
contactSchema.index({
  status: 1,
  createdAt: -1,
});

// Category filtering
contactSchema.index({
  category: 1,
  createdAt: -1,
});

// Admin assignment
contactSchema.index({
  assignedTo: 1,
  status: 1,
  createdAt: -1,
});

// Priority filtering
contactSchema.index({
  priority: 1,
  createdAt: -1,
});

// Email-based lookup
contactSchema.index({
  email: 1,
  createdAt: -1,
});

// ==================================================
// EXPORT
// ==================================================

const Contact =
  mongoose.models.Contact ||
  mongoose.model("Contact", contactSchema);

export default Contact;
