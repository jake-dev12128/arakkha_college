
import { z } from "zod";

const text = (max) =>
  z.string().trim().min(1).max(max);

const optionalText = (max) =>
  z.string().trim().max(max);

const optionalUrl = z.union([
  z.literal(""),
  z.url().max(2048).refine((value) => {
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol);
    } catch {
      return false;
    }
  }),
]);

const imageUrl = z.union([
  optionalUrl,
  z.string().regex(/^\/img\/[a-zA-Z0-9/_-]+\.(jpg|jpeg|png|webp)$/i),
]);

export const createFacultySchema = z.object({
  name: text(150),
  position: text(150),
  department: text(150),

  bio: optionalText(5000).default(""),
  description: optionalText(30000).default(""),

  email: z.union([
    z.literal(""),
    z.email().max(254),
  ]).default(""),

  linkedinUrl: optionalUrl.default(""),
  websiteUrl: optionalUrl.default(""),
  image: imageUrl.default(""),

  displayOrder: z.number().int().min(0).default(0),
}).strict();

export const updateFacultySchema = createFacultySchema
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field is required."
  );

export const facultyIdSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/),
}).strict();

export const facultyPublicationSchema = z.object({
  isPublished: z.boolean(),
}).strict();
