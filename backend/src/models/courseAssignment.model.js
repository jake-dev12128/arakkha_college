
import mongoose from "mongoose";

const { Schema } = mongoose;

const courseAssignmentSchema = new Schema(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      immutable: true,
    },

    teacher: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
      immutable: true,
    },
cohort: {
  type: Schema.Types.ObjectId,
  ref: "Cohort",
  required: true,
  immutable: true,
},
    students: [{
      type: Schema.Types.ObjectId,
      ref: "Student",
    }],

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    strict: true,
  },
);

courseAssignmentSchema.index(
  {
    course: 1,
    teacher: 1,
    cohort: 1,
  },
  { unique: true },
);

courseAssignmentSchema.index({
  teacher: 1,
  isActive: 1,
});

courseAssignmentSchema.index({
  students: 1,
  isActive: 1,
});

const CourseAssignment =
  mongoose.models.CourseAssignment ||
  mongoose.model(
    "CourseAssignment",
    courseAssignmentSchema,
  );

export default CourseAssignment;
