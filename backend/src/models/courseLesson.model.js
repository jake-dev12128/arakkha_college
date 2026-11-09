import mongoose from "mongoose";

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
      maxlength: 200,
    },

    description: {
      type: String,
      default: "",
    },

    order: {
      type: Number,
      required: true,
      min: 0,
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

courseLessonSchema.index(
  { courseId: 1, order: 1 },
  { unique: true }
);

export default mongoose.model(
  "CourseLesson",
  courseLessonSchema
);