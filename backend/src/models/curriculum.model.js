
import mongoose from "mongoose";

const { Schema } = mongoose;

const curriculumCourseSchema = new Schema(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    courseType: {
      type: String,
      enum: [
        "core",
        "elective",
        "general_education",
      ],
      default: "core",
    },

    order: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: false }
);

const semesterSchema = new Schema(
  {
    yearNumber: {
      type: Number,
      required: true,
      min: 1,
    },

    semesterNumber: {
      type: Number,
      required: true,
      min: 1,
    },

    courses: {
      type: [curriculumCourseSchema],
      default: [],
    },
  },
  { _id: false }
);

const curriculumSchema = new Schema(
  {
    program: {
      type: Schema.Types.ObjectId,
      ref: "Program",
      required: true,
    },

    version: {
      type: String,
      required: true,
      trim: true,
    },

    effectiveFrom: {
      type: Date,
      required: true,
    },

    semesters: {
      type: [semesterSchema],
      default: [],
    },

    status: {
      type: String,
      enum: [
        "draft",
        "published",
        "archived",
      ],
      default: "draft",
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

curriculumSchema.index(
  {
    program: 1,
    version: 1,
  },
  { unique: true }
);

const Curriculum =
  mongoose.models.Curriculum ||
  mongoose.model(
    "Curriculum",
    curriculumSchema
  );

export default Curriculum;
