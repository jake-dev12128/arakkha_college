
import mongoose from "mongoose";

const collaborationPartnerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150,
    },
    type: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    logo: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2048,
    },
    shortDescription: {
      type: String,
      default: "",
      trim: true,
      maxlength: 5000,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 30000,
    },
    websiteUrl: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2048,
    },
    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    displayOrder: {
      type: Number,
      default: 0,
      min: 0,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
    collection: "collaboration_partners",
  }
);

collaborationPartnerSchema.index({
  isPublished: 1,
  isActive: 1,
  displayOrder: 1,
  _id: 1,
});

const CollaborationPartner = mongoose.model(
  "CollaborationPartner",
  collaborationPartnerSchema
);

export default CollaborationPartner;
