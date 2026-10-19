
import { z } from "zod";

const text = (max = 500) =>
  z.string().trim().min(1).max(max);

const scoreSchema = z
  .object({
    subject: text(100),
    score: z.number().min(0).max(100),
  })
  .strict();

// ==================================================
// UPDATE STUDENT / TEACHER PROFILE
// ==================================================

export const updateProfileSchema = z
  .object({
    address: text(),
    currentAddress: text(),

    age: z.number().int().min(1).max(120),

    fatherName: text(100),
    motherName: text(100),

    nationalId: text(100),

    dateOfBirth: z.coerce
      .date()
      .refine(
        (date) => date <= new Date(),
        "Future birth date not allowed",
      ),

    gender: z.enum([
      "male",
      "female",
      "other",
    ]),

    matriculationScores: z
      .array(scoreSchema)
      .max(30)
      .optional(),
  })
.strict()
.partial()
.refine(
  (data) => Object.keys(data).length > 0,
  "At least one field is required.",
);
// ==================================================
// SEARCH / FILTER / PAGINATION
// ==================================================

export const profileListSchema = z
  .object({
    search: z
      .string()
      .trim()
      .max(100)
      .optional(),

    status: z
      .enum(["all", "active", "inactive"])
      .default("all"),

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
      .default(10),
  })
  .strict();
