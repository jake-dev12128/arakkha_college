
import { z } from "zod";

// ==================================================
// COMMON CONSTANTS
// ==================================================

const USER_ROLES = [
  "super_admin",
  "admin",
  "teacher",
  "student",
];

const objectIdSchema = z
  .string()
  .regex(
    /^[a-fA-F0-9]{24}$/,
    "Invalid MongoDB ObjectId.",
  );

const personNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required.")
  .max(100, "Name cannot exceed 100 characters.");

// ==================================================
// LIST MANAGED USERS
// GET /api/v1/admin/users
// ==================================================

export const listManagedUsersSchema = z
  .object({
    role: z.enum(USER_ROLES).optional(),

    search: z
      .string()
      .trim()
      .max(100)
      .optional(),

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

// ==================================================
// USER ID PARAMETER
// GET/PATCH/DELETE /admin/users/:id
// ==================================================

export const managedUserIdSchema = z
  .object({
    id: objectIdSchema,
  })
  .strict();

// ==================================================
// UPDATE MANAGED USER
// PATCH /api/v1/admin/users/:id
//
// Identity changes:
// - firstName
// - lastName
//
// Email changes require a separate verified flow.
// Role changes require a separate authorization flow.
// ==================================================


 // ==================================================
 // PROFILE UPDATE VALIDATION
 // ==================================================

const profileTextSchema = (max = 500) =>
  z.string().trim().min(1).max(max);

const dateOfBirthSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "Date of birth must use YYYY-MM-DD.",
  )
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);

    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value &&
      date.getTime() <= Date.now()
    );
  }, "Invalid date of birth.");

const examScoreSchema = z
  .object({
    subject: z.string().trim().min(1).max(100),
    score: z.number().min(0).max(100),
  })
  .strict();

const profileUpdateFields = {
  address: profileTextSchema(500).optional(),

  currentAddress: profileTextSchema(500).optional(),

  age: z.number().int().min(1).max(120).optional(),

  fatherName: profileTextSchema(200).optional(),

  motherName: profileTextSchema(200).optional(),

  nationalId: profileTextSchema(100).optional(),

  dateOfBirth: dateOfBirthSchema.optional(),

  gender: z
    .enum(["male", "female", "other"])
    .optional(),

  matriculationScores: z
    .array(examScoreSchema)
    .max(30)
    .optional(),
};

// ==================================================
// UPDATE MANAGED USER
// PATCH /api/v1/admin/users/:id
// ==================================================

export const updateManagedUserSchema = z
  .object({
    firstName: personNameSchema.optional(),

    lastName: personNameSchema.optional(),

    ...profileUpdateFields,
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: "At least one field must be provided.",
    },
  );

// ==================================================
// DEACTIVATE USER
// PATCH /api/v1/admin/users/:id/deactivate
// ==================================================

export const deactivateManagedUserSchema = z
  .object({
    reason: z
      .string()
      .trim()
      .min(3)
      .max(500),
  })
  .strict();

// ==================================================
// REACTIVATE USER
// PATCH /api/v1/admin/users/:id/reactivate
// ==================================================

export const reactivateManagedUserSchema = z
  .object({
    reason: z
      .string()
      .trim()
      .min(3)
      .max(500)
      .optional(),
  })
  .strict();

// ==================================================
// PERMANENT DELETE USER
// DELETE /api/v1/admin/users/:id
//
// Restricted to super_admin.
//
// Confirmation is required to prevent accidental
// deletion.
//
// Academic dependency validation and actual
// deletion are handled by the service layer.
// ==================================================

export const permanentlyDeleteUserSchema = z
  .object({
    confirmation: z.literal("DELETE PERMANENTLY"),

    reason: z
      .string()
      .trim()
      .min(10, "A deletion reason is required.")
      .max(500),
  })
  .strict();
