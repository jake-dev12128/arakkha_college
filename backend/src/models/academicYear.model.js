
import mongoose from "mongoose";

const { Schema } = mongoose;

const academicYearSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: 30,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["planned", "active", "completed"],
      default: "planned",
    },

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

academicYearSchema.pre("validate", function () {
  if (
    this.startDate &&
    this.endDate &&
    this.endDate <= this.startDate
  ) {
    this.invalidate(
      "endDate",
      "End date must be after start date.",
    );
  }
});

academicYearSchema.index({
  status: 1,
  startDate: -1,
});
// Only one available academic year may be active.
academicYearSchema.index(
  { status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: "active",
      isActive: true,
    },
    name: "unique_active_academic_year",
  },
);
const AcademicYear =
  mongoose.models.AcademicYear ||
  mongoose.model(
    "AcademicYear",
    academicYearSchema,
  );

export default AcademicYear;
