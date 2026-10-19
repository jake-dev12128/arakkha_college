
import { z } from "zod";

const name = z.string().trim().min(1).max(100);
const address = z.string().trim().min(1).max(500);

const base = z.object({
  firstName: name,
  lastName: name,
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(8).max(128),
});

const personal = {
  address,
  currentAddress: address,
  age: z.number().int().min(1).max(120),
  fatherName: name,
  motherName: name,
  nationalId: z.string().trim().min(1).max(100),
  dateOfBirth: z.coerce.date().refine(
    (value) => value <= new Date(),
    "Date of birth cannot be in the future.",
  ),
  gender: z.enum(["male", "female", "other"]),
};

const scoreSchema = z.object({
  subject: z.string().trim().min(1).max(100),
  score: z.number().min(0).max(100),
}).strict();

const student = base.extend({
  role: z.literal("student"),
  ...personal,
  matriculationScores: z.array(scoreSchema).max(30).default([]),
}).strict();

const teacher = base.extend({
  role: z.literal("teacher"),
  ...personal,
}).strict();

const admin = base.extend({
  role: z.enum(["admin", "super_admin"]),
}).strict();

export const createManagedUserSchema =
  z.discriminatedUnion("role", [
    student,
    teacher,
    admin,
  ]);
