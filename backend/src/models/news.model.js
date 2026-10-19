
import mongoose from "mongoose";

const newsSchema = new mongoose.Schema(
  {
    title: {
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
    summary: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    content: {
      type: String,
      required: true,
      maxlength: 100000,
    },
    coverImage: {
      type: String,
      default: "",
      maxlength: 2048,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Announcement",
        "Event",
        "Academic",
        "General",
        "Programs",
        "Admission",
        "Collaboration",
        "Student Life",
      ],
      default: "General",
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
    collection: "news",
  }
);

newsSchema.index({
  isPublished: 1,
  isActive: 1,
  publishedAt: -1,
});

newsSchema.index({
  isFeatured: -1,
  publishedAt: -1,
});

export default mongoose.model("News", newsSchema);
