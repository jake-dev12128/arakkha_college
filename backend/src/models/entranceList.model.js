
import mongoose from "mongoose";

const { Schema } = mongoose;

const entranceListSchema = new Schema(
  {
    academicYear: {
      type: Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
      immutable: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 250,
    },

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 10000,
    },

    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    strict: true,
  },
);

entranceListSchema.index(
  { academicYear: 1 },
  { unique: true },
);

entranceListSchema.index({
  status: 1,
  publishedAt: -1,
});

entranceListSchema.pre("validate", function () {
  if (
    this.status === "published" &&
    !this.publishedAt
  ) {
    this.invalidate(
      "publishedAt",
      "Publication timestamp is required when published.",
    );
  }
});

const EntranceList =
  mongoose.models.EntranceList ||
  mongoose.model(
    "EntranceList",
    entranceListSchema,
  );

export default EntranceList;
