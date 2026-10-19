
import mongoose from "mongoose";

const { Schema } = mongoose;

const entranceApplicantSchema = new Schema(
  {
    entranceList: {
      type: Schema.Types.ObjectId,
      ref: "EntranceList",
      required: true,
      immutable: true,
    },

    applicantNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 60,
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

    nationalId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      select: false,
    },

    fatherName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    admissionStatus: {
      type: String,
      enum: [
        "pending",
        "admitted",
        "rejected",
        "waitlisted",
      ],
      default: "pending",
    },

    student: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      default: null,
    },

    displayOrder: {
      type: Number,
      min: 1,
      default: 1,
    },
  },
  {
    timestamps: true,
    strict: true,
  },
);

entranceApplicantSchema.index(
  {
    entranceList: 1,
    applicantNumber: 1,
  },
  {
    unique: true,
  },
);

entranceApplicantSchema.index({
  entranceList: 1,
  admissionStatus: 1,
  displayOrder: 1,
  _id: 1,
});

entranceApplicantSchema.index(
  { student: 1 },
  {
    unique: true,
    partialFilterExpression: {
      student: { $type: "objectId" },
    },
  },
);

const EntranceApplicant =
  mongoose.models.EntranceApplicant ||
  mongoose.model(
    "EntranceApplicant",
    entranceApplicantSchema,
  );

export default EntranceApplicant;
