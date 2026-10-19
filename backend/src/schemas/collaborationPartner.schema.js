
import { z } from "zod";

const requiredText = (max) =>
  z.string().trim().min(1).max(max);

const optionalText = (max) =>
  z.string().trim().max(max).default("");

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

const optionalUrl = z.union([
  z.literal(""),
  httpUrl,
]).default("");

const localLogoPath = z.string().regex(
  /^\/img\/[a-zA-Z0-9/_-]+\.(jpg|jpeg|png|webp|svg)$/i,
  "Invalid local logo path."
);

const optionalLogo = z.union([
  z.literal(""),
  httpUrl,
  localLogoPath,
]).default("");

const optionalEmail = z.union([
  z.literal(""),
  z.email().max(254),
]).default("");

export const createCollaborationSchema = z.object({
  name: requiredText(150),
  type: requiredText(100),
  logo: optionalLogo,
  shortDescription: optionalText(5000),
  description: optionalText(30000),
  websiteUrl: optionalUrl,
  email: optionalEmail,
  displayOrder: z.number().int().min(0).default(0),
}).strict();

export const updateCollaborationSchema =
  createCollaborationSchema
    .partial()
    .refine(
      (data) => Object.keys(data).length > 0,
      "At least one field is required."
    );

export const collaborationIdSchema = z.object({
  id: z.string().regex(
    /^[0-9a-fA-F]{24}$/,
    "Invalid collaboration partner ID."
  ),
}).strict();

export const collaborationPublicationSchema = z.object({
  isPublished: z.boolean(),
}).strict();
