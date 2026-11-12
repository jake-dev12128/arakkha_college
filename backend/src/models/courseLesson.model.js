
import mongoose from "mongoose";

// ==================================================
// COURSE LESSON SCHEMA
// ==================================================

const courseLessonSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 200,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: "",
    },

    order: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Lesson order must be an integer.",
      },
    },

    videoMediaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MediaAsset",
      default: null,
    },

    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// ==================================================
// UNIQUE LESSON ORDER PER COURSE
// ==================================================

courseLessonSchema.index(
  {
    courseId: 1,
    order: 1,
  },
  {
    unique: true,
  }
);

// ==================================================
// MODEL EXPORT
// ==================================================

export default mongoose.model(
  "CourseLesson",
  courseLessonSchema
);
