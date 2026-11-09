
import { z } from "zod";

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId.");

export const courseLessonParamsSchema = z
  .object({
    courseId: objectId,
  })
  .strict();

export const courseLessonIdParamsSchema = z
  .object({
    courseId: objectId,
    lessonId: objectId,
  })
  .strict();

export const createCourseLessonSchema = z
  .object({
    title: z.string().trim().min(2).max(200),
    description: z.string().trim().max(5000).default(""),
    order: z.number().int().min(0),
  })
  .strict();

export const updateCourseLessonSchema = z
  .object({
    title: z.string().trim().min(2).max(200).optional(),
    description: z.string().trim().max(5000).optional(),
    order: z.number().int().min(0).optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field is required."
  );

export const courseLessonPublicationSchema = z
  .object({
    isPublished: z.boolean(),
  })
  .strict();

export const courseLessonListSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();
