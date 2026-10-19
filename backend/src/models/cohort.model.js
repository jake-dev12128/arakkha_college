
import mongoose from "mongoose";

const { Schema } = mongoose;

const cohortSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 50,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    program: {
      type: Schema.Types.ObjectId,
      ref: "Program",
      required: true,
      immutable: true,
    },

    curriculum: {
      type: Schema.Types.ObjectId,
      ref: "Curriculum",
      required: true,
      immutable: true,
    },

    academicYear: {
      type: Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
      immutable: true,
    },

    capacity: {
      type: Number,
      min: 1,
      default: null,
    },

    status: {
      type: String,
      enum: [
        "planned",
        "active",
        "completed",
        "cancelled",
      ],
      default: "planned",
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      default: null,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    occupiedSeats: {
  type: Number,
  default: 0,
  min: 0,
},
  },
  {
    timestamps: true,
    strict: true,
  },
);

cohortSchema.pre("validate", function () {
  if (
    this.endDate &&
    this.startDate &&
    this.endDate <= this.startDate
  ) {
    this.invalidate(
      "endDate",
      "End date must be after start date.",
    );
  }
});

cohortSchema.index({
  program: 1,
  academicYear: 1,
  status: 1,
});

cohortSchema.index({
  curriculum: 1,
});

const Cohort =
  mongoose.models.Cohort ||
  mongoose.model("Cohort", cohortSchema);

export default Cohort;
