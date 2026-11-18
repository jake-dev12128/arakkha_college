
import AppError from "../utils/AppError.js";

import {
  createContactSchema,
  contactListQuerySchema,
  contactIdParamsSchema,
  updateContactSchema,
  replyContactSchema,
} from "../schemas/contact.schema.js";

import {
  submitContact,
  listContacts,
  getContactDetail,
  updateContact,
  prepareContactReply,
} from "../services/contact.service.js";

// ==================================================
// ACC CONTACT CONTROLLER
// ==================================================

// Route handlers are async.
// Wrap them with asyncHandler in contact.routes.js.

// ==================================================
// VALIDATION HELPER
// ==================================================

const validate = (schema, value) => {
  const parsed = schema.safeParse(value);

  if (parsed.success) {
    return parsed.data;
  }

  const error = new AppError(
    "Validation failed.",
    400,
    "VALIDATION_ERROR"
  );

  error.errors = parsed.error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));

  throw error;
};

// ==================================================
// AUTHENTICATED ACTOR
// ==================================================

const actorId = (req) => {
  if (!req.user?._id) {
    throw new AppError(
      "Authentication required.",
      401,
      "AUTHENTICATION_REQUIRED"
    );
  }

  return req.user._id;
};

// ==================================================
// CONTACT ID VALIDATION
// ==================================================

const contactId = (req) =>
  validate(contactIdParamsSchema, {
    id: req.params.id,
  }).id;

// ==================================================
// IDEMPOTENCY KEY
// ==================================================

const idempotencyKey = (req) => {
  const value = req.get("Idempotency-Key");

  return value === undefined ? null : value;
};

// ==================================================
// SUCCESS RESPONSE HELPER
// ==================================================

const send = (res, data, statusCode = 200) =>
  res.status(statusCode).json({
    success: true,
    data,
  });

// ==================================================
// PUBLIC CONTACT SUBMISSION
// POST /api/v1/public/contact
// ==================================================

export const publicSubmitContact = async (
  req,
  res
) => {
  const payload = validate(
    createContactSchema,
    req.body
  );

  const result = await submitContact(
    payload,
    {
      idempotencyKey: idempotencyKey(req),
    }
  );

  // Never expose the full Contact document
  // or internal notification jobs publicly.

  return send(
    res,
    {
      referenceNumber:
        result.contact.referenceNumber,

      duplicate: result.duplicate,

      message:
        "Your inquiry has been received.",
    },
    result.duplicate ? 200 : 201
  );
};

// ==================================================
// ADMIN CONTACT LIST
// GET /api/v1/admin/contacts
// ==================================================

export const adminListContacts = async (
  req,
  res
) => {
  const query = validate(
    contactListQuerySchema,
    req.query
  );

  const result = await listContacts(
    actorId(req),
    query
  );

  return send(res, result);
};

// ==================================================
// ADMIN CONTACT DETAIL
// GET /api/v1/admin/contacts/:id
// ==================================================

export const adminGetContact = async (
  req,
  res
) => {
  const result = await getContactDetail(
    actorId(req),
    contactId(req)
  );

  return send(res, {
    contact: result,
  });
};

// ==================================================
// ADMIN CONTACT UPDATE
// PATCH /api/v1/admin/contacts/:id
// ==================================================

export const adminUpdateContact = async (
  req,
  res
) => {
  const payload = validate(
    updateContactSchema,
    req.body
  );

  const result = await updateContact(
    actorId(req),
    contactId(req),
    payload
  );

  return send(res, {
    contact: result,
  });
};

// ==================================================
// ADMIN CONTACT REPLY
// POST /api/v1/admin/contacts/:id/replies
// ==================================================

export const adminReplyContact = async (
  req,
  res
) => {
  const payload = validate(
    replyContactSchema,
    req.body
  );

  const result = await prepareContactReply(
    actorId(req),
    contactId(req),
    payload,
    {
      idempotencyKey: idempotencyKey(req),
    }
  );

  return send(
    res,
    {
      referenceNumber:
        result.contact.referenceNumber,

      replyId: result.reply._id,

      deliveryStatus:
        result.reply.deliveryStatus,

      duplicate: result.duplicate,

      message:
        "Reply queued for email delivery.",
    },
    result.duplicate ? 200 : 202
  );
};
