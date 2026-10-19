
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

    credits: {
      type: Number,
      required: true,
      min: 0,
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
