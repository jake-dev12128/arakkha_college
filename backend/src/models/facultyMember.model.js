
import mongoose from "mongoose";

const facultyMemberSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150,
    },

    position: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    department: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    bio: {
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

    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
      maxlength: 254,
    },

    linkedinUrl: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2048,
    },

    websiteUrl: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2048,
    },

    image: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2048,
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
    collection: "faculty_members",
  }
);

facultyMemberSchema.index({
  isPublished: 1,
  isActive: 1,
  displayOrder: 1,
  _id: 1,
});

facultyMemberSchema.index({
  department: 1,
});

const FacultyMember = mongoose.model(
  "FacultyMember",
  facultyMemberSchema
);

export default FacultyMember;
