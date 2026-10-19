
import { z } from "zod";

const httpUrl = z.url().max(2048).refine(
  (value) => {
    try {
      return ["http:", "https:"].includes(
        new URL(value).protocol
      );
    } catch {
      return false;
    }
  },
  { message: "Only HTTP/HTTPS URLs are allowed." }
);

const localImage = z.string().regex(
  /^\/img\/[a-zA-Z0-9/_-]+\.(jpg|jpeg|png|webp|svg)$/i
);

const optionalImage = z.union([
  z.literal(""),
  httpUrl,
  localImage,
]).default("");

export const createNewsSchema = z.object({
  title: z.string().trim().min(3).max(200),
  summary: z.string().trim().min(5).max(1000),
  content: z.string().trim().min(1).max(100000),
  coverImage: optionalImage,
  category: z.enum([
    "Announcement",
    "Event",
    "Academic",
    "General",
    "Programs",
    "Admission",
    "Collaboration",
    "Student Life",
  ]).default("General"),
  isFeatured: z.boolean().default(false),
}).strict();

export const updateNewsSchema =
  createNewsSchema.partial().refine(
    (data) => Object.keys(data).length > 0,
    "At least one field is required."
  );

export const newsIdSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/),
}).strict();

export const newsPublicationSchema = z.object({
  isPublished: z.boolean(),
}).strict();
