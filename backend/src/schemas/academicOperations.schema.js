
import { z } from "zod";

const objectId = z.string().regex(
  /^[a-f\d]{24}$/i,
  "Invalid MongoDB ObjectId.",
);

const date = z.coerce.date();

const optionalDate = z.union([
  date,
  z.null(),
]);

const academicYearFields = {
  code: z
    .string()
    .trim()
    .regex(
      /^[A-Za-z0-9_-]{3,30}$/,
      "Invalid academic year code.",
    )
    .transform((v) => v.toUpperCase()),

  name: z.string().trim().min(3).max(100),

  startDate: date,

  endDate: date,
};

export const createAcademicYearSchema = z
  .object({
    ...academicYearFields,
    status: z.literal("planned").default("planned"),
  })
  .strict()
  .refine(
    (v) => v.endDate > v.startDate,
    {
      path: ["endDate"],
      message: "End date must be after start date.",
    },
  );

export const updateAcademicYearSchema = z
  .object({
    code: academicYearFields.code.optional(),
    name: academicYearFields.name.optional(),
    startDate: date.optional(),
    endDate: date.optional(),
  })
  .strict()
  .refine(
    (v) => Object.keys(v).length > 0,
    "At least one field is required.",
  );

export const createCohortSchema = z.object({
  code: z.string().trim().min(3).max(50)
    .transform(v => v.toUpperCase()),
  name: z.string().trim().min(3).max(200),
  program: objectId,
  curriculum: objectId,
  academicYear: objectId,
  capacity: z.number().int().positive().nullable()
    .optional(),
 status: z.literal("planned").default("planned"),
  startDate: date,
  endDate: optionalDate.optional(),
  description: z.string().trim().max(2000)
    .default(""),
}).strict().refine(
  v => !v.endDate || v.endDate > v.startDate,
  {
    path: ["endDate"],
    message: "End date must be after start date.",
  },
);

export const updateCohortSchema = z.object({
  name: z.string().trim().min(3).max(200).optional(),
  capacity: z.number().int().positive().nullable()
    .optional(),
  status: z.enum([
    "planned",
    "active",
    "completed",
    "cancelled",
  ]).optional(),
  startDate: date.optional(),
  endDate: optionalDate.optional(),
  description: z.string().trim().max(2000).optional(),
}).strict().refine(
  v => Object.keys(v).length > 0,
  "At least one field is required.",
);

export const operationsIdSchema = z.object({
  id: objectId,
}).strict();


export const operationsListSchema = z
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
        "all",
        "planned",
        "active",
        "completed",
        "cancelled",
      ])
      .optional(),
  })
  .strict();

