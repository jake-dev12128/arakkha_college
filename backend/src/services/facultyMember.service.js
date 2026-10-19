
import mongoose from "mongoose";
import sanitizeHtml from "sanitize-html";

import FacultyMember from "../models/facultyMember.model.js";

const sanitizeDescription = (html) =>
  sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "strong", "b", "em", "i",
      "u", "s", "h1", "h2", "h3",
      "ul", "ol", "li", "blockquote", "a",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
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
    const error = new Error("Invalid faculty member ID.");
    error.statusCode = 400;
    throw error;
  }
};

const notFound = () => {
  const error = new Error("Faculty member not found.");
  error.statusCode = 404;
  return error;
};

// ==================================================
// PUBLIC
// ==================================================

export const getPublicFacultyMembers = async () => {
  return FacultyMember.find({
    isPublished: true,
    isActive: true,
  })
    .select(
      "name position department bio image displayOrder"
    )
    .sort({ displayOrder: 1, _id: 1 })
    .lean();
};

export const getPublicFacultyMemberById = async (id) => {
  assertValidId(id);

  const member = await FacultyMember.findOne({
    _id: id,
    isPublished: true,
    isActive: true,
  })
    .select(
      "name position department bio description email linkedinUrl websiteUrl image"
    )
    .lean();

  if (!member) throw notFound();

  return member;
};

// ==================================================
// ADMIN
// ==================================================

export const getAllFacultyMembers = async () => {
  return FacultyMember.find()
    .sort({ displayOrder: 1, _id: 1 })
    .lean();
};

export const getAdminFacultyMemberById = async (id) => {
  assertValidId(id);

  const member = await FacultyMember.findById(id).lean();

  if (!member) throw notFound();

  return member;
};

export const createFacultyMember = async (data) => {
  return FacultyMember.create(normalizeData(data));
};

export const updateFacultyMember = async (id, data) => {
  assertValidId(id);

  const member = await FacultyMember.findById(id);

  if (!member) throw notFound();

  Object.assign(member, normalizeData(data));

  await member.save();

  return member;
};

export const setFacultyPublication = async (
  id,
  isPublished
) => {
  assertValidId(id);

  const member = await FacultyMember.findById(id);

  if (!member) throw notFound();

  member.isPublished = isPublished;
  member.publishedAt = isPublished
    ? member.publishedAt || new Date()
    : null;

  await member.save();

  return member;
};

export const deleteFacultyMember = async (id) => {
  assertValidId(id);

  const member = await FacultyMember.findByIdAndDelete(id);

  if (!member) throw notFound();

  return member;
};
