
import mongoose from "mongoose";

const { Schema } = mongoose;

const examScoreSchema = new Schema(
  {
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
  },
  { _id: false },
);

const studentSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      immutable: true,
    },

    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 320,
    },
    studentId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      immutable: true,
    },

    address: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    currentAddress: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    age: {
      type: Number,
      required: true,
      min: 1,
      max: 120,
    },
    fatherName: {
      type: String,
      required: true,
      trim: true,
    },
    motherName: {
      type: String,
      required: true,
      trim: true,
    },
    nationalId: {
      type: String,
      required: true,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    gender: {
      type: String,
      required: true,
      enum: ["male", "female", "other"],
    },

    matriculationScores: {
      type: [examScoreSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    strict: true,
  },
);

studentSchema.index({ email: 1 });
studentSchema.index({ lastName: 1, firstName: 1 });

const Student =
  mongoose.models.Student ||
  mongoose.model("Student", studentSchema);

export default Student;
