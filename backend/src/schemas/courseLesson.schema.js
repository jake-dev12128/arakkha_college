
import { z } from "zod";

// ==================================================
// MONGODB OBJECT ID VALIDATION
// ==================================================

const objectId = z
  .string()
  .regex(
    /^[0-9a-fA-F]{24}$/,
    "Invalid MongoDB ObjectId."
  );

// ==================================================
// COURSE PARAMS
// ==================================================

export const courseLessonParamsSchema = z
  .object({
    courseId: objectId,
  })
  .strict();

// ==================================================
// COURSE + LESSON PARAMS
// ==================================================

export const courseLessonIdParamsSchema = z
  .object({
    courseId: objectId,
    lessonId: objectId,
  })
  .strict();

// ==================================================
// CREATE COURSE LESSON
// ==================================================

export const createCourseLessonSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2)
      .max(200),

    description: z
      .string()
      .trim()
      .max(5000)
      .default(""),

    order: z
      .number()
      .int()
      .min(1),
  })
  .strict();

// ==================================================
// UPDATE COURSE LESSON
// ==================================================

export const updateCourseLessonSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2)
      .max(200)
      .optional(),

    description: z
      .string()
      .trim()
      .max(5000)
      .optional(),

    order: z
      .number()
      .int()
      .min(1)
      .optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field is required."
  );

// ==================================================
// PUBLISH / UNPUBLISH LESSON
// ==================================================

export const courseLessonPublicationSchema = z
  .object({
    isPublished: z.boolean(),
  })
  .strict();

// ==================================================
// LESSON LIST QUERY
// ==================================================

export const courseLessonListSchema = z
  .object({
    page: z.coerce
      .number()
      .int()
      .min(1)
      .default(1),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20),
  })
  .strict();
