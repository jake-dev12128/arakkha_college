
import mongoose from "mongoose";

const { Schema } = mongoose;

const requirementSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 3000,
  },
  order: {
    type: Number,
    default: 1,
    min: 1,
  },
});

const awardSchema = new Schema({
  program: {
    type: Schema.Types.ObjectId,
    ref: "Program",
    default: null,
  },
  awardTitle: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    default: "",
    trim: true,
    maxlength: 2000,
  },
  order: {
    type: Number,
    default: 1,
    min: 1,
  },
});

const entranceInformationSchema = new Schema(
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

    requirements: {
      type: [requirementSchema],
      default: [],
    },

    awards: {
      type: [awardSchema],
      default: [],
    },

    application: {
      pdfUrl: {
        type: String,
        default: "",
        trim: true,
        maxlength: 2048,
      },
      storageKey: {
        type: String,
        default: "",
        trim: true,
        select: false,
      },
      fileName: {
        type: String,
        default: "",
        trim: true,
        maxlength: 255,
      },
    },

    applicationStartDate: {
      type: Date,
      default: null,
    },

    applicationEndDate: {
      type: Date,
      default: null,
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

entranceInformationSchema.index(
  { academicYear: 1 },
  { unique: true },
);

entranceInformationSchema.index({
  status: 1,
  publishedAt: -1,
});

entranceInformationSchema.pre("validate", function () {
  if (
    this.applicationStartDate &&
    this.applicationEndDate &&
    this.applicationEndDate < this.applicationStartDate
  ) {
    this.invalidate(
      "applicationEndDate",
      "Application end date must not precede start date.",
    );
  }

  if (this.status === "published" && !this.publishedAt) {
    this.invalidate(
      "publishedAt",
      "Publication timestamp is required when published.",
    );
  }
});

const EntranceInformation =
  mongoose.models.EntranceInformation ||
  mongoose.model(
    "EntranceInformation",
    entranceInformationSchema,
  );

export default EntranceInformation;
