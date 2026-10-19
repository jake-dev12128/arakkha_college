
import { z } from "zod";

const id = z.string().regex(/^[a-f\d]{24}$/i);

const nonempty = (max) =>
  z.string().trim().min(1).max(max);

const date = z.iso.datetime({ offset: true });

const requirement = z.object({
  title: nonempty(200),
  description: nonempty(3000),
  order: z.number().int().min(1).optional(),
}).strict();

const award = z.object({
  program: id.nullish(),
  awardTitle: nonempty(200),
  description: z.string().trim().max(2000).optional(),
  order: z.number().int().min(1).optional(),
}).strict();

const information = z.object({
  academicYear: id,
  title: nonempty(250),
  description: z.string().trim().max(10000).optional(),
  requirements: z.array(requirement).max(100).optional(),
  awards: z.array(award).max(100).optional(),
  application: z.object({
    pdfUrl: z.url().max(2048).refine(
      (v) => v.startsWith("https://"),
      "HTTPS required"
    ),
    fileName: nonempty(255),
  }).strict().optional(),
  applicationStartDate: date.nullish(),
  applicationEndDate: date.nullish(),
}).strict();

const list = z.object({
  academicYear: id,
  title: nonempty(250),
  description: z.string().trim().max(10000).optional(),
}).strict();

const applicant = z.object({
  applicantNumber: nonempty(60),
  firstName: nonempty(100),
  lastName: nonempty(100),
  nationalId: nonempty(100),
  fatherName: nonempty(200),
  admissionStatus: z.enum([
    "pending",
    "admitted",
    "rejected",
    "waitlisted",
  ]).optional(),
  displayOrder: z.number().int().min(1).optional(),
}).strict();

export const createInformationSchema = information;

export const updateInformationSchema = information
  .omit({ academicYear: true })
  .partial()
  .refine((x) => Object.keys(x).length > 0);

export const createListSchema = list;

export const updateListSchema = list
  .omit({ academicYear: true })
  .partial()
  .refine((x) => Object.keys(x).length > 0);

export const createApplicantSchema = applicant;

export const updateApplicantSchema = applicant
  .partial()
  .omit({ applicantNumber: true })
  .refine((x) => Object.keys(x).length > 0);

export const idParamsSchema = z.object({ id }).strict();

export const applicantParamsSchema = z.object({
  id,
  applicantId: id,
}).strict();

export const yearParamsSchema = z.object({
  year: z.union([
    z.literal("current"),
    z.string().regex(/^\d{4}$/),
    z.string().regex(/^AY\d{4}-\d{4}$/i),
  ]),
}).strict();
export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();
