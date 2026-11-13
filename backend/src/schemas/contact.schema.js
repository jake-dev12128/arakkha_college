
import { z } from "zod";

// ==================================================
// ACC CONTACT SYSTEM — ZOD 4 VALIDATION
// ==================================================

// Keep these values aligned with contact.model.js.

export const CONTACT_CATEGORIES = Object.freeze([
  "general",
  "admission",
  "programs",
  "student_support",
  "collaboration",
  "other",
]);

export const CONTACT_STATUSES = Object.freeze([
  "new",
  "in_progress",
  "replied",
  "closed",
]);

export const CONTACT_PRIORITIES = Object.freeze([
  "low",
  "normal",
  "high",
  "urgent",
]);

// ==================================================
// SHARED VALIDATION HELPERS
// ==================================================

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, {
    message: "Invalid MongoDB ObjectId.",
  });

// Reject null bytes and unsafe control characters.
// Allow tabs/newlines only in multiline text.

const singleLineText = (field, min, max) =>
  z
    .string({
      error: `${field} must be a string.`,
    })
    .trim()
    .min(min, {
      message: `${field} must contain at least ${min} characters.`,
    })
    .max(max, {
      message: `${field} must not exceed ${max} characters.`,
    })
    .refine(
      (value) => !/[\x00-\x1F\x7F-\x9F]/u.test(value),
      {
        message: `${field} contains invalid control characters.`,
      }
    );

const multilineText = (field, min, max) =>
  z
    .string({
      error: `${field} must be a string.`,
    })
    .trim()
    .min(min, {
      message: `${field} must contain at least ${min} characters.`,
    })
    .max(max, {
      message: `${field} must not exceed ${max} characters.`,
    })
    .refine(
      (value) =>
        !/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/u.test(
          value
        ),
      {
        message: `${field} contains invalid control characters.`,
      }
    );

// ==================================================
// VISITOR INFORMATION
// ==================================================

const contactNameSchema = singleLineText(
  "Name",
  2,
  150
);

const contactEmailSchema = z
  .string({
    error: "Email must be a string.",
  })
  .trim()
  .max(320, {
    message: "Email must not exceed 320 characters.",
  })
  .pipe(z.email({
    message: "Invalid email address.",
  }))
  .transform((value) => value.toLowerCase());

const contactPhoneSchema = z
  .string({
    error: "Phone must be a string.",
  })
  .trim()
  .max(30, {
    message: "Phone must not exceed 30 characters.",
  })
  .refine(
    (value) =>
      value === "" ||
      /^\+?[0-9()\-\s]{6,30}$/.test(value),
    {
      message: "Invalid phone number format.",
    }
  );

const contactCategorySchema = z.enum(
  CONTACT_CATEGORIES,
  {
    error: "Invalid contact category.",
  }
);

const contactSubjectSchema = singleLineText(
  "Subject",
  3,
  250
);

const contactMessageSchema = multilineText(
  "Message",
  10,
  10000
);

// ==================================================
// PUBLIC CONTACT SUBMISSION
// ==================================================

export const createContactSchema = z
  .object({
    name: contactNameSchema,

    email: contactEmailSchema,

    phone: contactPhoneSchema
      .optional()
      .default(""),

    category: contactCategorySchema
      .optional()
      .default("general"),

    subject: contactSubjectSchema,

    message: contactMessageSchema,
  })
  .strict();

// Optional alias for public controllers.

export const submitContactSchema =
  createContactSchema;

// ==================================================
// ADMIN STATUS UPDATE
// ==================================================

export const updateContactStatusSchema = z
  .object({
    status: z.enum(CONTACT_STATUSES, {
      error: "Invalid contact status.",
    }),
  })
  .strict();

// ==================================================
// ADMIN PRIORITY UPDATE
// ==================================================

export const updateContactPrioritySchema = z
  .object({
    priority: z.enum(CONTACT_PRIORITIES, {
      error: "Invalid contact priority.",
    }),
  })
  .strict();

// ==================================================
// ADMIN ASSIGNMENT
// ==================================================

export const assignContactSchema = z
  .object({
    // null explicitly unassigns the message.
    assignedTo: objectIdSchema.nullable(),
  })
  .strict();

// ==================================================
// ADMIN INTERNAL NOTES
// ==================================================

export const updateContactNotesSchema = z
  .object({
    internalNotes: multilineText(
      "Internal notes",
      0,
      5000
    ),
  })
  .strict();

// ==================================================
// COMBINED ADMIN UPDATE
// ==================================================

export const updateContactSchema = z
  .object({
    status: z.enum(CONTACT_STATUSES).optional(),

    priority: z.enum(CONTACT_PRIORITIES).optional(),

    assignedTo: objectIdSchema
      .nullable()
      .optional(),

    internalNotes: multilineText(
      "Internal notes",
      0,
      5000
    ).optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: "At least one field is required.",
    }
  );

// ==================================================
// ADMIN EMAIL REPLY
// ==================================================

export const replyContactSchema = z
  .object({
    body: multilineText(
      "Reply message",
      1,
      10000
    ),
  })
  .strict();

// Recipient email is intentionally excluded.
// The service must obtain it from the saved
// contact message, never from the request body.

// ==================================================
// CONTACT ID ROUTE PARAMS
// ==================================================

export const contactIdParamsSchema = z
  .object({
    id: objectIdSchema,
  })
  .strict();

// ==================================================
// CONTACT REPLY ID ROUTE PARAMS
// ==================================================

export const contactReplyParamsSchema = z
  .object({
    id: objectIdSchema,

    replyId: objectIdSchema,
  })
  .strict();

// ==================================================
// ADMIN LIST QUERY HELPERS
// ==================================================

// Accept only decimal integer query strings.
// Do not use z.coerce.number() here because
// empty strings and booleans can coerce to numbers.

const queryInteger = (defaultValue, max) =>
  z
    .union([
      z
        .string()
        .regex(/^[0-9]+$/, {
          message: "Must be a positive integer.",
        }),
      z.number().int(),
    ])
    .optional()
    .default(defaultValue)
    .pipe(
      z.coerce
        .number()
        .int()
        .min(1)
        .max(max)
    );

const searchSchema = z
  .string()
  .trim()
  .max(150, {
    message: "Search must not exceed 150 characters.",
  })
  .refine(
    (value) =>
      !/[\x00-\x1F\x7F-\x9F]/u.test(value),
    {
      message: "Search contains invalid characters.",
    }
  );

// ==================================================
// ADMIN CONTACT LIST QUERY
// ==================================================

export const contactListQuerySchema = z
  .object({
    page: queryInteger(1, 1000000),

    limit: queryInteger(20, 100),

    search: searchSchema
      .optional()
      .default(""),

    status: z.enum(CONTACT_STATUSES)
      .optional(),

    category: z.enum(CONTACT_CATEGORIES)
      .optional(),

    priority: z.enum(CONTACT_PRIORITIES)
      .optional(),

    assignedTo: objectIdSchema
      .optional(),

    sortBy: z.enum([
      "createdAt",
      "updatedAt",
      "priority",
      "status",
    ])
      .optional()
      .default("createdAt"),

    sortOrder: z.enum([
      "asc",
      "desc",
    ])
      .optional()
      .default("desc"),
  })
  .strict();

// ==================================================
// OPTIONAL ALIASES FOR CONTROLLER CONSISTENCY
// ==================================================

export const contactParamsSchema =
  contactIdParamsSchema;

export const listContactsQuerySchema =
  contactListQuerySchema;

export const createContactReplySchema =
  replyContactSchema;

// ==================================================
// SHARED OBJECT ID VALIDATOR
// ==================================================

export const contactObjectIdSchema =
  objectIdSchema;
