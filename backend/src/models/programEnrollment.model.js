
import mongoose from "mongoose";

const { Schema } = mongoose;

const programEnrollmentSchema = new Schema(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      immutable: true,
    },

    cohort: {
      type: Schema.Types.ObjectId,
      ref: "Cohort",
      required: true,
      immutable: true,
    },

    program: {
      type: Schema.Types.ObjectId,
      ref: "Program",
      required: true,
      immutable: true,
    },

    enrolledAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    status: {
      type: String,
      enum: [
        "active",
        "suspended",
        "completed",
        "withdrawn",
      ],
      default: "active",
    },

    completedAt: {
      type: Date,
      default: null,
    },

    withdrawnAt: {
      type: Date,
      default: null,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
  },
  {
    timestamps: true,
    strict: true,
  },
);

// One enrollment record per student and cohort.
programEnrollmentSchema.index(
  { student: 1, cohort: 1 },
  { unique: true },
);

// Prevent multiple active/suspended enrollments
// in the same program.
programEnrollmentSchema.index(
  { student: 1, program: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["active", "suspended"] },
    },
  },
);

programEnrollmentSchema.index({
  cohort: 1,
  status: 1,
});

const ProgramEnrollment =
  mongoose.models.ProgramEnrollment ||
  mongoose.model(
    "ProgramEnrollment",
    programEnrollmentSchema,
  );

export default ProgramEnrollment;
