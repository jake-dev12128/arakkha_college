
import mongoose from "mongoose";

const mediaAssetSchema = new mongoose.Schema(
  {
    publicId: {
      type: String,
      required: true,
      unique: true,
    },

    resourceType: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },

    secureUrl: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      enum: [
        "news",
        "programs",
        "faculties",
        "collaborations",
        "students",
        "users",
        "thumbnails",
        "course-videos",
      ],
      required: true,
    },

    bytes: {
      type: Number,
      required: true,
    },

    width: Number,
    height: Number,
    duration: Number,
    format: String,

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "attached", "deleting"],
      default: "pending",
      index: true,
    },

    attachedTo: {
      model: String,
      documentId: mongoose.Schema.Types.ObjectId,
    },

    cleanupRequestedAt: {
      type: Date,
      default: null,
      index: true,
    },

    cleanupAttempts: {
      type: Number,
      default: 0,
    },

    cleanupLastError: {
      type: String,
      default: null,
    },

    cleanupNextRetryAt: {
      type: Date,
      default: null,
    },

    cleanupLockedAt: {
      type: Date,
      default: null,
    },

    cleanupLockToken: {
      type: String,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
    collection: "media_assets",
  }
);

mediaAssetSchema.index({
  status: 1,
  createdAt: 1,
});

mediaAssetSchema.index({
  category: 1,
  status: 1,
  cleanupNextRetryAt: 1,
});

mediaAssetSchema.index({
  status: 1,
  cleanupLockedAt: 1,
});

export default mongoose.model(
  "MediaAsset",
  mediaAssetSchema
);
