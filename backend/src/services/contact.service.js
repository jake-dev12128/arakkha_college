
import mongoose from "mongoose";

import {
  createHash,
  randomUUID,
} from "node:crypto";

import Contact from "../models/contact.model.js";

import ContactNotification from "../models/contactNotification.model.js";

import User from "../models/user.model.js";

import AppError from "../utils/AppError.js";

// ==================================================
// ACC CONTACT SERVICE
// ==================================================

const ADMIN_ROLES = new Set([
  "super_admin",
  "admin",
]);

const REPLY_LIMIT = 100;

const PUBLIC_DUPLICATE_WINDOW_MS =
  10 * 60 * 1000;

// ==================================================
// ERROR HELPERS
// ==================================================

const fail = (
  message,
  statusCode = 400,
  code = "CONTACT_ERROR"
) => {
  throw new AppError(
    message,
    statusCode,
    code
  );
};

const isValidId = (value) =>
  mongoose.isObjectIdOrHexString(value);

const isDuplicateKeyError = (error) =>
  error?.code === 11000;

const hashValue = (value) =>
  createHash("sha256")
    .update(value)
    .digest("hex");

const normalizeEmail = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const normalizeText = (value) =>
  String(value || "").trim();

const sameId = (a, b) =>
  Boolean(
    a &&
    b &&
    String(a) === String(b)
  );

// ==================================================
// CONFIGURATION
// ==================================================

// Configure these before enabling notifications.
// Never silently send to an arbitrary address.

const getContactEmailConfig = () => {
  const adminEmail = normalizeEmail(
    process.env.CONTACT_ADMIN_EMAIL
  );

  if (
    !adminEmail ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      adminEmail
    )
  ) {
    fail(
      "Contact notification configuration is unavailable.",
      503,
      "CONTACT_EMAIL_NOT_CONFIGURED"
    );
  }

  return {
    adminEmail,
  };
};

// ==================================================
// REFERENCE GENERATION
// ==================================================

const createReferenceNumber = (
  idempotencyKey = null
) => {
  const year = new Date().getUTCFullYear();

  // Deterministic reference for retries.
  if (idempotencyKey) {
    const digest = hashValue(
      `acc-contact:v1:${idempotencyKey}`
    );

    return `ACC-CON-${year}-${digest.slice(0, 32)}`;
  }

  return `ACC-CON-${year}-${randomUUID()}`;
};

// ==================================================
// IDEMPOTENCY KEY VALIDATION
// ==================================================

const normalizeIdempotencyKey = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (
    typeof value !== "string" ||
    !/^[A-Za-z0-9_-]{16,128}$/.test(value)
  ) {
    fail(
      "Invalid Idempotency-Key.",
      400,
      "INVALID_IDEMPOTENCY_KEY"
    );
  }

  return value;
};

// ==================================================
// PUBLIC CONTACT PAYLOAD
// ==================================================

// Controller must validate with createContactSchema.
// This service also explicitly picks allowed fields.

const normalizeContactInput = (data) => ({
  name: normalizeText(data.name),

  email: normalizeEmail(data.email),

  phone: normalizeText(data.phone),

  category: data.category || "general",

  subject: normalizeText(data.subject),

  message: normalizeText(data.message),
});

const sameContactPayload = (contact, data) =>
  contact.name === data.name &&
  contact.email === data.email &&
  (contact.phone || "") === data.phone &&
  contact.category === data.category &&
  contact.subject === data.subject &&
  contact.message === data.message;

// ==================================================
// NOTIFICATION JOB BUILDERS
// ==================================================

const buildInitialJobs = ({
  contact,
  adminEmail,
}) => {
  const reference = contact.referenceNumber;

  const adminBody = [
    "New ACC Contact Inquiry",
    "",
    `Reference: ${reference}`,
    `Name: ${contact.name}`,
    `Email: ${contact.email}`,
    `Phone: ${contact.phone || "Not provided"}`,
    `Category: ${contact.category}`,
    `Subject: ${contact.subject}`,
    "",
    "Message:",
    contact.message,
    "",
    "Review this inquiry in the ACC Admin Dashboard.",
  ].join("\n");

  const confirmationBody = [
    `Dear ${contact.name},`,
    "",
    "Thank you for contacting ACC Computer College.",
    "",
    "We have received your inquiry.",
    "Our team will review your message.",
    "",
    `Reference: ${reference}`,
    "",
    "Best regards,",
    "ACC Computer College",
  ].join("\n");

  return [
    {
      contact: contact._id,
      type: "admin_notification",

      idempotencyKey:
        `contact:${contact._id}:admin_notification:v1`,

      recipientEmail: adminEmail,

      subject:
        `New ACC Inquiry: ${contact.subject}`,

      textBody: adminBody,

      status: "pending",
    },
    {
      contact: contact._id,
      type: "visitor_confirmation",

      idempotencyKey:
        `contact:${contact._id}:visitor_confirmation:v1`,

      recipientEmail: contact.email,

      subject:
        "ACC Computer College — Inquiry Received",

      textBody: confirmationBody,

      status: "pending",
    },
  ];
};

// ==================================================
// PUBLIC SUBMISSION
// ==================================================

export const submitContact = async (
  input,
  options = {}
) => {
  const data = normalizeContactInput(input);

  const idempotencyKey =
    normalizeIdempotencyKey(
      options.idempotencyKey
    );

  const { adminEmail } =
    getContactEmailConfig();

  const referenceNumber =
    createReferenceNumber(idempotencyKey);

  // Fast path for a repeated request.
  if (idempotencyKey) {
    const existing = await Contact.findOne({
      referenceNumber,
    }).lean();

    if (existing) {
      if (!sameContactPayload(existing, data)) {
        fail(
          "Idempotency key was already used for a different request.",
          409,
          "CONTACT_IDEMPOTENCY_CONFLICT"
        );
      }

      return {
        contact: existing,
        duplicate: true,
      };
    }
  }

  // Optional short-window duplicate detection.
  // This is not a replacement for a client
  // Idempotency-Key.
  if (!idempotencyKey) {
    const cutoff = new Date(
      Date.now() -
      PUBLIC_DUPLICATE_WINDOW_MS
    );

    const recent = await Contact.findOne({
      email: data.email,
      subject: data.subject,
      message: data.message,
      createdAt: {
        $gte: cutoff,
      },
    }).lean();

    if (
      recent &&
      sameContactPayload(recent, data)
    ) {
      return {
        contact: recent,
        duplicate: true,
      };
    }
  }

  const session = await mongoose.startSession();

  try {
    let createdContact = null;

    await session.withTransaction(
      async () => {
        const [contact] = await Contact.create(
          [
            {
              ...data,
              referenceNumber,
              status: "new",
              priority: "normal",
            },
          ],
          { session }
        );

        const jobs = buildInitialJobs({
          contact,
          adminEmail,
        });

        await ContactNotification.create(
          jobs,
          { session }
        );

        createdContact = contact;
      },
      {
        readPreference: "primary",
        readConcern: {
          level: "snapshot",
        },
        writeConcern: {
          w: "majority",
        },
      }
    );

    return {
      contact: createdContact,
      duplicate: false,
    };
  } catch (error) {
    if (
      idempotencyKey &&
      isDuplicateKeyError(error)
    ) {
      const existing = await Contact.findOne({
        referenceNumber,
      }).lean();

      if (existing) {
        if (!sameContactPayload(existing, data)) {
          fail(
            "Idempotency key was already used for a different request.",
            409,
            "CONTACT_IDEMPOTENCY_CONFLICT"
          );
        }

        return {
          contact: existing,
          duplicate: true,
        };
      }
    }

    throw error;
  } finally {
    await session.endSession();
  }
};

// ==================================================
// ADMIN AUTHORIZATION
// ==================================================

const requireAdminActor = async (actorId) => {
  if (!isValidId(actorId)) {
    fail(
      "Authentication required.",
      401,
      "AUTHENTICATION_REQUIRED"
    );
  }

  const actor = await User.findById(actorId)
    .select("_id role isActive")
    .lean();

  if (
    !actor ||
    !actor.isActive ||
    !ADMIN_ROLES.has(actor.role)
  ) {
    fail(
      "You do not have permission to access this resource.",
      403,
      "CONTACT_FORBIDDEN"
    );
  }

  return actor;
};

const getContactOrFail = async (
  contactId,
  session = null
) => {
  if (!isValidId(contactId)) {
    fail(
      "Invalid contact ID.",
      400,
      "INVALID_CONTACT_ID"
    );
  }

  const query = Contact.findById(contactId);

  if (session) {
    query.session(session);
  }

  const contact = await query;

  if (!contact) {
    fail(
      "Contact message not found.",
      404,
      "CONTACT_NOT_FOUND"
    );
  }

  return contact;
};

// ==================================================
// ADMIN LIST
// ==================================================

export const listContacts = async (
  actorId,
  query = {}
) => {
  await requireAdminActor(actorId);

  const {
    page = 1,
    limit = 20,
    search = "",
    status,
    category,
    priority,
    assignedTo,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  const safePage = Math.max(
    1,
    Math.min(1000000, Number(page) || 1)
  );

  const safeLimit = Math.max(
    1,
    Math.min(100, Number(limit) || 20)
  );

  const filter = {};

  if (status) filter.status = status;
  if (category) filter.category = category;
  if (priority) filter.priority = priority;

  if (assignedTo) {
    if (!isValidId(assignedTo)) {
      fail(
        "Invalid assigned user ID.",
        400,
        "INVALID_ASSIGNED_USER"
      );
    }

    filter.assignedTo = assignedTo;
  }

  const safeSearch = normalizeText(search)
    .slice(0, 150);

  if (safeSearch) {
    const escaped = safeSearch.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const regex = new RegExp(escaped, "i");

    filter.$or = [
      { referenceNumber: regex },
      { name: regex },
      { email: regex },
      { subject: regex },
    ];
  }

  const allowedSortFields = new Set([
    "createdAt",
    "updatedAt",
    "priority",
    "status",
  ]);

  const field = allowedSortFields.has(sortBy)
    ? sortBy
    : "createdAt";

  const direction =
    sortOrder === "asc" ? 1 : -1;

  const skip = (safePage - 1) * safeLimit;

  const [items, total] = await Promise.all([
    Contact.find(filter)
      .select("-replies -internalNotes")
      .sort({
        [field]: direction,
        _id: -1,
      })
      .skip(skip)
      .limit(safeLimit)
      .lean(),

    Contact.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(
        total / safeLimit
      ),
    },
  };
};

// ==================================================
// ADMIN CONTACT DETAIL
// ==================================================

export const getContactDetail = async (
  actorId,
  contactId
) => {
  await requireAdminActor(actorId);

  const contact = await getContactOrFail(
    contactId
  );

  if (!contact.firstViewedAt) {
    await Contact.updateOne(
      {
        _id: contact._id,
        firstViewedAt: null,
      },
      {
        $set: {
          firstViewedAt: new Date(),
          firstViewedBy: actorId,
        },
      }
    );
  }

  return Contact.findById(contactId)
    .populate(
      "assignedTo",
      "firstName lastName email role"
    )
    .populate(
      "replies.repliedBy",
      "firstName lastName email"
    )
    .lean();
};

// ==================================================
// ADMIN ASSIGNMENT VALIDATION
// ==================================================

const validateAssignee = async (
  assignedTo,
  session
) => {
  if (assignedTo === null) return;

  if (!isValidId(assignedTo)) {
    fail(
      "Invalid assigned user ID.",
      400,
      "INVALID_ASSIGNED_USER"
    );
  }

  const user = await User.findOne({
    _id: assignedTo,
    isActive: true,
    role: {
      $in: ["super_admin", "admin"],
    },
  }).session(session);

  if (!user) {
    fail(
      "Assigned user must be an active administrator.",
      400,
      "INVALID_CONTACT_ASSIGNEE"
    );
  }
};

// ==================================================
// ADMIN CONTACT UPDATE
// ==================================================

export const updateContact = async (
  actorId,
  contactId,
  input
) => {
  await requireAdminActor(actorId);

  if (!input || Object.keys(input).length === 0) {
    fail(
      "At least one update field is required.",
      400,
      "EMPTY_CONTACT_UPDATE"
    );
  }

  const allowedFields = new Set([
    "status",
    "priority",
    "assignedTo",
    "internalNotes",
  ]);

  for (const key of Object.keys(input)) {
    if (!allowedFields.has(key)) {
      fail(
        `Field ${key} cannot be updated.`,
        400,
        "INVALID_CONTACT_UPDATE"
      );
    }
  }

  const session = await mongoose.startSession();

  try {
    let updated = null;

    await session.withTransaction(
      async () => {
        const contact = await getContactOrFail(
          contactId,
          session
        );

        if (
          Object.hasOwn(input, "assignedTo")
        ) {
          await validateAssignee(
            input.assignedTo,
            session
          );
        }

        if (
          Object.hasOwn(input, "status")
        ) {
          const transitions = {
            new: [
              "new",
              "in_progress",
              "closed",
            ],
            in_progress: [
              "in_progress",
              "replied",
              "closed",
            ],
            replied: [
              "replied",
              "in_progress",
              "closed",
            ],
            closed: [
              "closed",
              "in_progress",
            ],
          };

          const allowed =
            transitions[contact.status] || [];

          if (!allowed.includes(input.status)) {
            fail(
              "Invalid contact status transition.",
              409,
              "CONTACT_STATUS_CONFLICT"
            );
          }

          // A reply must exist before a contact
          // can be manually marked as replied.
          if (
            input.status === "replied" &&
            !contact.replies.some(
              (reply) =>
                ["sent", "delivered"].includes(
                  reply.deliveryStatus
                )
            )
          ) {
            fail(
              "A successfully sent reply is required.",
              409,
              "CONTACT_REPLY_REQUIRED"
            );
          }

          contact.status = input.status;

          if (input.status === "closed") {
            if (!contact.closedAt) {
              contact.closedAt = new Date();
              contact.closedBy = actorId;
            }
          } else {
            contact.closedAt = null;
            contact.closedBy = null;
          }
        }

        if (
          Object.hasOwn(input, "priority")
        ) {
          contact.priority = input.priority;
        }

        if (
          Object.hasOwn(input, "assignedTo")
        ) {
          contact.assignedTo = input.assignedTo;
        }

        if (
          Object.hasOwn(input, "internalNotes")
        ) {
          contact.internalNotes =
            input.internalNotes;
        }

        contact.updatedBy = actorId;

        await contact.save({ session });

        updated = contact;
      },
      {
        readPreference: "primary",
        readConcern: {
          level: "snapshot",
        },
        writeConcern: {
          w: "majority",
        },
      }
    );

    return updated;
  } finally {
    await session.endSession();
  }
};

// ==================================================
// ADMIN REPLY PREPARATION
// ==================================================

// This function only queues the reply.
// The worker will send it using Resend.
//
// Caller must supply a stable Idempotency-Key.
// A retry must reuse the same key.

export const prepareContactReply = async (
  actorId,
  contactId,
  input,
  options = {}
) => {
  await requireAdminActor(actorId);

  const requestKey = normalizeIdempotencyKey(
    options.idempotencyKey
  );

  if (!requestKey) {
    fail(
      "Idempotency-Key is required for replies.",
      400,
      "REPLY_IDEMPOTENCY_KEY_REQUIRED"
    );
  }

  const body = normalizeText(input.body);

  if (!body || body.length > 10000) {
    fail(
      "Reply message must contain 1 to 10000 characters.",
      400,
      "INVALID_CONTACT_REPLY"
    );
  }

  if (!isValidId(contactId)) {
    fail(
      "Invalid contact ID.",
      400,
      "INVALID_CONTACT_ID"
    );
  }

  const jobKey =
    `contact:${contactId}:reply:${hashValue(requestKey)}`;

  // Fast path: previously queued reply.
  const existingJob =
    await ContactNotification.findOne({
      idempotencyKey: jobKey,
    }).lean();

  if (existingJob) {
    const existingContact =
      await getContactOrFail(contactId);

    const existingReply =
      existingContact.replies.id(
        existingJob.replyId
      );

    if (
      !existingReply ||
      existingReply.body !== body ||
      !sameId(
        existingReply.repliedBy,
        actorId
      )
    ) {
      fail(
        "Idempotency key was already used for a different reply.",
        409,
        "CONTACT_REPLY_CONFLICT"
      );
    }

    return {
      contact: existingContact,
      reply: existingReply,
      notification: existingJob,
      duplicate: true,
    };
  }

  const session = await mongoose.startSession();

  try {
    let result = null;

    await session.withTransaction(
      async () => {
        const contact = await getContactOrFail(
          contactId,
          session
        );

        if (contact.status === "closed") {
          fail(
            "Reopen this contact before replying.",
            409,
            "CONTACT_CLOSED"
          );
        }

        if (
          contact.replies.length >= REPLY_LIMIT
        ) {
          fail(
            "Contact reply history limit reached.",
            409,
            "CONTACT_REPLY_LIMIT"
          );
        }

        const replyId =
          new mongoose.Types.ObjectId();

        const reply = {
          _id: replyId,
          body,
          repliedBy: actorId,
          recipientEmail: contact.email,
          deliveryStatus: "pending",
        };

        contact.replies.push(reply);

        if (contact.status === "new") {
          contact.status = "in_progress";
        }

        contact.updatedBy = actorId;

        await contact.save({ session });

        const [job] =
          await ContactNotification.create(
            [
              {
                contact: contact._id,
                type: "admin_reply",
                replyId,

                idempotencyKey: jobKey,

                recipientEmail:
                  contact.email,

                subject:
                  `Re: ${contact.subject} [${contact.referenceNumber}]`,

                textBody: [
                  body,
                  "",
                  "Best regards,",
                  "ACC Computer College",
                  "",
                  `Reference: ${contact.referenceNumber}`,
                ].join("\n"),

                status: "pending",
                createdBy: actorId,
              },
            ],
            { session }
          );

        result = {
          contact,
          reply: contact.replies.id(replyId),
          notification: job,
          duplicate: false,
        };
      },
      {
        readPreference: "primary",
        readConcern: {
          level: "snapshot",
        },
        writeConcern: {
          w: "majority",
        },
      }
    );

    return result;
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const job =
        await ContactNotification.findOne({
          idempotencyKey: jobKey,
        }).lean();

      if (job) {
        const contact =
          await getContactOrFail(contactId);

        const reply =
          contact.replies.id(job.replyId);

        if (
          !reply ||
          reply.body !== body ||
          !sameId(reply.repliedBy, actorId)
        ) {
          fail(
            "Idempotency key was already used for a different reply.",
            409,
            "CONTACT_REPLY_CONFLICT"
          );
        }

        return {
          contact,
          reply,
          notification: job,
          duplicate: true,
        };
      }
    }

    throw error;
  } finally {
    await session.endSession();
  }
};

// ==================================================
// EXPORT ALIASES
// ==================================================

export const createContact = submitContact;

export const listAdminContacts = listContacts;

export const getAdminContact =
  getContactDetail;

export const updateAdminContact =
  updateContact;

export const queueContactReply =
  prepareContactReply;
