
import mongoose from "mongoose";

const studentIdCounterSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },

    sequence: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    versionKey: false,
  },
);

const StudentIdCounter =
  mongoose.models.StudentIdCounter ||
  mongoose.model(
    "StudentIdCounter",
    studentIdCounterSchema,
  );

export default StudentIdCounter;
