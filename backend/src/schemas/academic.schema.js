
import { z } from "zod";

// ==================================================
// COMMON VALIDATION
// ==================================================

const objectId = z.string().regex(
  /^[0-9a-fA-F]{24}$/,
  "Invalid MongoDB ObjectId."
);

const code = z
  .string()
  .trim()
  .min(2)
  .max(30)
  .regex(/^[A-Za-z0-9_-]+$/)
  .transform((value) => value.toUpperCase());

const title = z
  .string()
  .trim()
  .min(2)
  .max(200);

// ==================================================
// PROGRAM SCHEMAS
// ==================================================

const programFields = {
  code,

  name: title,

  // slug: z
  //   .string()
  //   .trim()
  //   .toLowerCase()
  //   .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),

  description: z
    .string()
    .trim()
    .max(5000)
    .default(""),

  type: z.enum([
    "degree",
    "diploma",
    "certificate",
    "professional",
  ]),

  durationYears: z
    .number()
    .int()
    .min(1)
    .max(10),

  semestersPerYear: z
    .number()
    .int()
    .min(1)
    .max(4),

  imageUrl: z
    .string()
    .trim()
    .max(2048)
    .default(""),
};

export const createProgramSchema = z
  .object(programFields)
  .strict();
export const updateProgramSchema =
  createProgramSchema
    .omit({
      code: true,
    })
    .partial()
    .refine(
      (value) => Object.keys(value).length > 0,
      "At least one field is required."
    );

// ==================================================
// COURSE SCHEMAS
// ==================================================

const courseFields = {
  code,

  title,

  description: z
    .string()
    .trim()
    .max(5000)
    .default(""),

  credits: z
    .number()
    .min(0)
    .max(30),

  lectureHours: z
    .number()
    .min(0)
    .max(1000)
    .default(0),

  practicalHours: z
    .number()
    .min(0)
    .max(1000)
    .default(0),

  prerequisites: z
    .array(objectId)
    .max(30)
    .default([]),
};

export const createCourseSchema = z
  .object(courseFields)
  .strict();

export const updateCourseSchema =
  createCourseSchema
    .omit({
      code: true,
    })
    .partial()
    .refine(
      (value) => Object.keys(value).length > 0,
      "At least one field is required."
    );

// ==================================================
// CURRICULUM SEMESTER SCHEMAS
// ==================================================

const semesterCourseSchema = z
  .object({
    course: objectId,

    courseType: z
      .enum([
        "core",
        "elective",
        "general_education",
      ])
      .default("core"),

    order: z
      .number()
      .int()
      .min(1),
  })
  .strict();

const semesterSchema = z
  .object({
    yearNumber: z
      .number()
      .int()
      .min(1)
      .max(10),

    semesterNumber: z
      .number()
      .int()
      .min(1)
      .max(40),

    courses: z
      .array(semesterCourseSchema)
      .max(30),
  })
  .strict();

// ==================================================
// CURRICULUM SCHEMAS
// ==================================================

export const createCurriculumSchema = z
  .object({
    program: objectId,

    version: z
      .string()
      .trim()
      .min(1)
      .max(40),

    effectiveFrom: z.coerce.date(),

    semesters: z
      .array(semesterSchema)
      .max(40),
  })
  .strict();

export const updateCurriculumSchema =
  createCurriculumSchema
    .omit({
      program: true,
      version: true,
    })
    .partial()
    .refine(
      (value) => Object.keys(value).length > 0,
      "At least one field is required."
    );
// ==================================================
// CLONE CURRICULUM AS DRAFT
// ==================================================

export const cloneCurriculumSchema = z
  .object({
    version: z
      .string()
      .trim()
      .min(1)
      .max(40),

    effectiveFrom: z.coerce.date(),
  })
  .strict();
// ==================================================
// PARAMETER VALIDATION
// ==================================================

export const academicIdSchema = z.object({
  id: objectId,
});

// ==================================================
// LIST / QUERY VALIDATION
// ==================================================

export const academicListSchema = z
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

    search: z
      .string()
      .trim()
      .max(100)
      .optional(),

    status: z
      .enum([
        "draft",
        "published",
        "archived",
      ])
      .optional(),
  })
  .strict();
