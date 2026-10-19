import { z } from "zod";

// ==================================================
// COMMON VALIDATION
// ==================================================

const objectId = z
  .string()
  .regex(
    /^[0-9a-fA-F]{24}$/,
    "Invalid MongoDB ObjectId.",
  );

const studentId = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^ACC\d{8}$/,
    "Student ID must follow ACC20260003 format.",
  );

const enrollmentStatus = z.enum([
  "active",
  "suspended",
  "completed",
  "withdrawn",
]);

// ==================================================
// CREATE ENROLLMENT
// ==================================================

export const createProgramEnrollmentSchema = z
  .object({
    studentId,

    cohort: objectId,

    enrolledAt: z.coerce
      .date()
      .optional(),

    notes: z
      .string()
      .trim()
      .max(2000)
      .optional(),
  })
  .strict();

// ==================================================
// UPDATE ENROLLMENT
// ==================================================

export const updateProgramEnrollmentSchema = z
  .object({
    status: enrollmentStatus.optional(),

    notes: z
      .string()
      .trim()
      .max(2000)
      .optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.status !== undefined ||
      data.notes !== undefined,
    {
      message:
        "At least one field must be provided.",
    },
  );

// ==================================================
// ENROLLMENT ID
// ==================================================

export const programEnrollmentIdSchema = z
  .object({
    id: objectId,
  })
  .strict();

// ==================================================
// LIST ENROLLMENTS
// ==================================================

export const listProgramEnrollmentsSchema = z
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

    cohort: objectId.optional(),

    student: objectId.optional(),

    status: enrollmentStatus.optional(),
  })
  .strict();