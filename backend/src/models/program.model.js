
import mongoose from "mongoose";

const { Schema } = mongoose;

const programSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      maxlength: 5000,
    },

    type: {
      type: String,
      enum: [
        "degree",
        "diploma",
        "certificate",
        "professional",
      ],
      required: true,
    },

    durationYears: {
      type: Number,
      required: true,
      min: 1,
    },

    semestersPerYear: {
      type: Number,
      required: true,
      default: 2,
      min: 1,
    },

    imageUrl: {
      type: String,
      default: "",
    },

    isPublished: {
  type: Boolean,
  default: false,
  index: true,
},

publishedAt: {
  type: Date,
  default: null,
},

lastPublishedAt: {
  type: Date,
  default: null,
},

isActive: {
  type: Boolean,
  default: true,
},
  },
  {
    timestamps: true,
    strict: true,
  }
);

programSchema.index({
  isPublished: 1,
  isActive: 1,
});

const Program =
  mongoose.models.Program ||
  mongoose.model("Program", programSchema);

export default Program;
