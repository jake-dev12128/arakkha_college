
import mongoose from "mongoose";

const { Schema } = mongoose;

const courseSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
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
      maxlength: 5000,
    },

    // OPTIONAL: Credits are not required.
    // null means no credit value has been assigned.
    credits: {
      type: Number,
      required: false,
      default: null,
      min: 0,
      max: 30,
    },

    lectureHours: {
      type: Number,
      default: 0,
      min: 0,
    },

    practicalHours: {
      type: Number,
      default: 0,
      min: 0,
    },

    prerequisites: [
      {
        type: Schema.Types.ObjectId,
        ref: "Course",
      },
    ],

    // NEW: Course cover image.
    coverImage: {
      type: String,
      default: "",
    },

    // NEW: Cloudinary MediaAsset reference.
    coverImageMediaId: {
      type: Schema.Types.ObjectId,
      ref: "MediaAsset",
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

courseSchema.index({ title: 1 });

const Course =
  mongoose.models.Course ||
  mongoose.model("Course", courseSchema);

export default Course;
