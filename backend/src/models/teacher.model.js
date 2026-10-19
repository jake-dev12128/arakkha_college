
import mongoose from "mongoose";

const { Schema } = mongoose;

const teacherSchema = new Schema(
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
  },
  {
    timestamps: true,
    strict: true,
  },
);

teacherSchema.index({ email: 1 });
teacherSchema.index({ lastName: 1, firstName: 1 });

const Teacher =
  mongoose.models.Teacher ||
  mongoose.model("Teacher", teacherSchema);

export default Teacher;
