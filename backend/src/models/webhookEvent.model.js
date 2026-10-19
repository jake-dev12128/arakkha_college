import mongoose from "mongoose";

const webhookEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 255,
    },

    eventType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    status: {
      type: String,
      enum: ["PROCESSING", "PROCESSED", "FAILED"],
      default: "PROCESSING",
      index: true,
    },

    processedAt: {
      type: Date,
      default: null,
    },

    lastError: {
      type: String,
      default: null,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  },
);

const WebhookEvent = mongoose.model(
  "WebhookEvent",
  webhookEventSchema,
);

export default WebhookEvent;
