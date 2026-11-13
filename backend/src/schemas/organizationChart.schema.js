
import { z } from "zod";

// ==========================================
// SHARED VALIDATION HELPERS
// ==========================================

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, {
    message: "Invalid MongoDB ObjectId.",
  });

const titleSchema = z
  .string()
  .trim()
  .min(1, {
    message: "Organization chart title is required.",
  })
  .max(250, {
    message: "Title must not exceed 250 characters.",
  });

const descriptionSchema = z
  .string()
  .trim()
  .max(2000, {
    message: "Description must not exceed 2000 characters.",
  });

// ==========================================
// CREATE / INITIALIZE ORGANIZATION CHART
// ==========================================

export const createOrganizationChartSchema = z
  .object({
    title: titleSchema.default("Organization Chart"),

    description: descriptionSchema.default(""),

    // Reference to an uploaded MediaAsset.
    mediaId: objectIdSchema.optional(),
  })
  .strict();

// ==========================================
// UPDATE ORGANIZATION CHART DRAFT
// ==========================================

export const updateOrganizationChartSchema = z
  .object({
    title: titleSchema.optional(),

    description: descriptionSchema.optional(),

    // null explicitly removes the draft image.
    // It must not remove the published image.
    mediaId: z.union([
      objectIdSchema,
      z.null(),
    ]).optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: "At least one field is required.",
    }
  );

// ==========================================
// PUBLISH ORGANIZATION CHART
// ==========================================

export const publishOrganizationChartSchema = z
  .object({})
  .strict();

// ==========================================
// UNPUBLISH ORGANIZATION CHART
// ==========================================

export const unpublishOrganizationChartSchema = z
  .object({})
  .strict();

// ==========================================
// MEDIA ASSET REFERENCE VALIDATION
// ==========================================

export const organizationChartMediaSchema = z
  .object({
    mediaId: objectIdSchema,
  })
  .strict();

// ==========================================
// OPTIONAL IMAGE REMOVAL VALIDATION
// ==========================================

export const removeOrganizationChartImageSchema = z
  .object({})
  .strict();

// ==========================================
// EXPORT SHARED OBJECT ID VALIDATOR
// ==========================================

export const organizationChartObjectIdSchema =
  objectIdSchema;
