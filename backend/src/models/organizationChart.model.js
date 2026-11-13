
import mongoose from "mongoose";

// ==========================================
// ORGANIZATION CHART IMAGE
// ==========================================

const chartImageSchema = new mongoose.Schema(
  {
    mediaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MediaAsset",
      required: true,
    },

    url: {
      type: String,
      required: true,
      trim: true,
    },

    publicId: {
      type: String,
      required: true,
      trim: true,
    },

    width: {
      type: Number,
      default: null,
    },

    height: {
      type: Number,
      default: null,
    },
  },
  {
    _id: false,
  }
);

// ==========================================
// ORGANIZATION CHART SCHEMA
// ==========================================

const organizationChartSchema = new mongoose.Schema(
  {
    // ======================================
    // SINGLETON KEY
    // ======================================

    key: {
      type: String,
      enum: ["main"],
      default: "main",
      required: true,
      unique: true,
      immutable: true,
    },

    // ======================================
    // DRAFT METADATA
    // ======================================

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 250,
      default: "Organization Chart",
    },

    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    // ======================================
    // PUBLISHED METADATA
    // ======================================

    // Public title is saved separately
    // when the chart is published.

    publishedTitle: {
      type: String,
      trim: true,
      maxlength: 250,
      default: null,
    },

    // Public description is saved separately
    // when the chart is published.

    publishedDescription: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },

    // ======================================
    // DRAFT IMAGE
    // ======================================

    // Admin uploads and previews this image.
    draftImage: {
      type: chartImageSchema,
      default: null,
    },

    // ======================================
    // PUBLISHED IMAGE
    // ======================================

    // Public website reads this image only.
    publishedImage: {
      type: chartImageSchema,
      default: null,
    },

    // ======================================
    // PUBLICATION STATUS
    // ======================================

    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    // ======================================
    // AUDIT FIELDS
    // ======================================

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
    collection: "organization_charts",
  }
);

// ==========================================
// MODEL
// ==========================================

const OrganizationChart = mongoose.model(
  "OrganizationChart",
  organizationChartSchema
);

export default OrganizationChart;
