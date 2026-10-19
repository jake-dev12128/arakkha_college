
import mongoose from "mongoose";
import sanitizeHtml from "sanitize-html";

import CollaborationPartner from "../models/collaborationPartner.model.js";

const sanitizeDescription = (html) =>
  sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "strong", "b", "em", "i",
      "u", "s", "h1", "h2", "h3",
      "ul", "ol", "li", "blockquote", "a",
    ],
    allowedAttributes: {
      a: ["href", "title"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          href: attribs.href || "",
          rel: "noopener noreferrer",
        },
      }),
    },
  });

const normalizeData = (data) => {
  const result = { ...data };

  if (result.description !== undefined) {
    result.description = sanitizeDescription(
      result.description
    );
  }

  return result;
};

const assertValidId = (id) => {
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error("Invalid partner ID.");
    error.statusCode = 400;
    error.isOperational = true;
    throw error;
  }
};

const notFound = () => {
  const error = new Error("Collaboration partner not found.");
  error.statusCode = 404;
  error.isOperational = true;
  return error;
};

// ==================================================
// PUBLIC
// ==================================================

export const getPublicPartners = async () => {
  return CollaborationPartner.find({
    isPublished: true,
    isActive: true,
  })
    .select(
      "name type logo shortDescription displayOrder"
    )
    .sort({ displayOrder: 1, _id: 1 })
    .lean();
};

export const getPublicPartnerById = async (id) => {
  assertValidId(id);

  const partner = await CollaborationPartner.findOne({
    _id: id,
    isPublished: true,
    isActive: true,
  })
    .select(
      "name type logo shortDescription description websiteUrl email"
    )
    .lean();

  if (!partner) throw notFound();

  return partner;
};

// ==================================================
// ADMIN
// ==================================================

export const getAllPartners = async () => {
  return CollaborationPartner.find()
    .sort({ displayOrder: 1, _id: 1 })
    .lean();
};

export const getAdminPartnerById = async (id) => {
  assertValidId(id);

  const partner =
    await CollaborationPartner.findById(id).lean();

  if (!partner) throw notFound();

  return partner;
};

export const createPartner = async (data) => {
  return CollaborationPartner.create(
    normalizeData(data)
  );
};

export const updatePartner = async (id, data) => {
  assertValidId(id);

  const partner =
    await CollaborationPartner.findById(id);

  if (!partner) throw notFound();

  Object.assign(partner, normalizeData(data));

  await partner.save();

  return partner;
};

export const setPartnerPublication = async (
  id,
  isPublished
) => {
  assertValidId(id);

  const partner =
    await CollaborationPartner.findById(id);

  if (!partner) throw notFound();

  partner.isPublished = isPublished;
  partner.publishedAt = isPublished
    ? partner.publishedAt || new Date()
    : null;

  await partner.save();

  return partner;
};

export const deletePartner = async (id) => {
  assertValidId(id);

  const partner =
    await CollaborationPartner.findByIdAndDelete(id);

  if (!partner) throw notFound();

  return partner;
};
