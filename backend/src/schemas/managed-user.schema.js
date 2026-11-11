
import { z } from "zod";

// ==================================================
// MANAGED ADMIN ACCOUNT VALIDATION
// ==================================================

const nameSchema = z
  .string()
  .trim()
  .min(1)
  .max(100);

const baseAccountSchema = z.object({
  firstName: nameSchema,

  lastName: nameSchema,

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .max(320),

  password: z
    .string()
    .min(8)
    .max(128),
});

// ==================================================
// ADMIN / SUPER ADMIN ONLY
// ==================================================

export const createManagedUserSchema =
  baseAccountSchema
    .extend({
      role: z.enum([
        "super_admin",
        "admin",
      ]),
    })
    .strict();

// ==================================================
// ACADEMIC ACCOUNTS
// ==================================================

const academicProfileFields = {
  address: z.string().trim().min(1).max(500),
  currentAddress: z.string().trim().min(1).max(500),

  age: z.number().int().min(1).max(120),

  fatherName: z.string().trim().min(1),
  motherName: z.string().trim().min(1),
  nationalId: z.string().trim().min(1),

  dateOfBirth: z.coerce.date().refine(
    (date) => date <= new Date(),
    "Date of birth cannot be in the future."
  ),

  gender: z.enum([
    "male",
    "female",
    "other",
  ]),
};

const academicBaseSchema =
  baseAccountSchema.extend(academicProfileFields);

// ==================================================
// TEACHER CREATE VALIDATION
// ==================================================

export const createTeacherSchema =
  academicBaseSchema
    .extend({
      role: z.literal("teacher"),
    })
    .strict();

// ==================================================
// STUDENT CREATE VALIDATION
// ==================================================

export const createStudentSchema =
  academicBaseSchema
    .extend({
      role: z.literal("student"),

      matriculationScores: z.array(
        z.object({
          subject: z.string().trim().min(1).max(100),
          score: z.number().min(0).max(100),
        }).strict()
      ).max(30).default([]),
    })
    .strict();
