
import mongoose from "mongoose";

const sectionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const introductionSchema = new mongoose.Schema(
  {
    eyebrow: {
      type: String,
      required: true,
      trim: true,
      default: "Who we are",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const contentSchema = new mongoose.Schema(
  {
    hero: {
      type: sectionSchema,
      required: true,
    },
    introduction: {
      type: introductionSchema,
      required: true,
    },
    vision: {
      type: sectionSchema,
      required: true,
    },
    mission: {
      type: sectionSchema,
      required: true,
    },
  },
  { _id: false }
);

const aboutSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      enum: ["main"],
      default: "main",
      unique: true,
      immutable: true,
      required: true,
    },

    draft: {
      type: contentSchema,
      required: true,
    },

    published: {
      type: contentSchema,
      default: null,
    },

    isPublished: {
      type: Boolean,
      default: false,
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
  }
);

export default mongoose.model("About", aboutSchema);
