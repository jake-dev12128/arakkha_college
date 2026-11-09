
import mongoose from "mongoose";
import sanitizeHtml from "sanitize-html";

import FacultyMember from "../models/facultyMember.model.js";
import MediaAsset from "../models/mediaAsset.model.js";

const fail = (
  message,
  statusCode = 400,
  code = "FACULTY_ERROR"
) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.isOperational = true;
  return error;
};

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
    result.description = sanitizeDescription(result.description);
  }

  return result;
};

const assertValidId = (id) => {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw fail(
      "Invalid faculty member ID.",
      400,
      "INVALID_FACULTY_ID"
    );
  }
};

const notFound = () =>
  fail(
    "Faculty member not found.",
    404,
    "FACULTY_NOT_FOUND"
  );

const mediaFilter = {
  category: "faculties",
  resourceType: "image",
};

const unattachedFilter = {
  $or: [
    { attachedTo: { $exists: false } },
    { "attachedTo.documentId": null },
  ],
};

// ==================================================
// ATTACH UPLOADED IMAGE
// ==================================================

const attachMedia = async (
  mediaId,
  memberId,
  actorId,
  session
) => {
  if (!mongoose.isObjectIdOrHexString(mediaId)) {
    throw fail(
      "Invalid imageMediaId.",
      400,
      "INVALID_MEDIA_ID"
    );
  }

  if (!mongoose.isObjectIdOrHexString(actorId)) {
    throw fail(
      "Authentication required.",
      401,
      "AUTH_REQUIRED"
    );
  }

  const media = await MediaAsset.findOne({
    _id: mediaId,
    ...mediaFilter,
    uploadedBy: actorId,
    status: "pending",
    cleanupRequestedAt: null,
    cleanupLockedAt: null,
    ...unattachedFilter,
  }).session(session);

  if (!media) {
    throw fail(
      "Faculty image unavailable or not owned by uploader.",
      409,
      "MEDIA_UNAVAILABLE"
    );
  }

  const result = await MediaAsset.updateOne(
    {
      _id: media._id,
      ...mediaFilter,
      uploadedBy: actorId,
      status: "pending",
      cleanupRequestedAt: null,
      cleanupLockedAt: null,
      ...unattachedFilter,
    },
    {
      $set: {
        status: "attached",
        attachedTo: {
          model: "FacultyMember",
          documentId: memberId,
        },
        cleanupRequestedAt: null,
        cleanupNextRetryAt: null,
        cleanupAttempts: 0,
        cleanupLastError: null,
        cleanupLockedAt: null,
      },
    },
    { session }
  );

  if (result.matchedCount !== 1) {
    throw fail(
      "Faculty image attachment conflict.",
      409,
      "MEDIA_ATTACHMENT_CONFLICT"
    );
  }

  return media.secureUrl;
};

// ==================================================
// DETACH OLD IMAGE
// ==================================================

const detachMedia = async (mediaId, memberId, session) => {
  if (!mediaId) return;

  const now = new Date();

  const result = await MediaAsset.updateOne(
    {
      _id: mediaId,
      ...mediaFilter,
      status: "attached",
      cleanupRequestedAt: null,
      cleanupLockedAt: null,
      "attachedTo.model": "FacultyMember",
      "attachedTo.documentId": memberId,
    },
    {
      $set: {
        status: "pending",
        cleanupRequestedAt: now,
        cleanupNextRetryAt: now,
        cleanupAttempts: 0,
        cleanupLastError: null,
        cleanupLockedAt: null,
      },
      $unset: {
        attachedTo: "",
      },
    },
    { session }
  );

  if (result.matchedCount !== 1) {
    throw fail(
      "Faculty image detachment conflict.",
      409,
      "MEDIA_DETACHMENT_CONFLICT"
    );
  }
};

// ==================================================
// PUBLIC READ
// ==================================================

export const getPublicFacultyMembers = async () =>
  FacultyMember.find({
    isPublished: true,
    isActive: true,
  })
    .select(
      "name position department bio image displayOrder"
    )
    .sort({ displayOrder: 1, _id: 1 })
    .lean();

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
// ADMIN READ
// ==================================================

export const getAllFacultyMembers = async () =>
  FacultyMember.find()
    .sort({ displayOrder: 1, _id: 1 })
    .lean();

export const getAdminFacultyMemberById = async (id) => {
  assertValidId(id);

  const member = await FacultyMember.findById(id).lean();

  if (!member) throw notFound();

  return member;
};

// ==================================================
// CREATE
// ==================================================

export const createFacultyMember = async (
  data,
  actorId
) => {
  const payload = normalizeData(data);
  const mediaId = payload.imageMediaId;

  delete payload.imageMediaId;

  let created = null;

  await mongoose.connection.transaction(async (session) => {
    const member = new FacultyMember(payload);

    if (mediaId) {
      const url = await attachMedia(
        mediaId,
        member._id,
        actorId,
        session
      );

      if (payload.image && payload.image !== url) {
        throw fail(
          "Image URL and media ID do not match.",
          409,
          "MEDIA_URL_MISMATCH"
        );
      }

      member.image = url;
      member.imageMediaId = mediaId;
    }

    await member.save({ session });
    created = member;
  });

  return created;
};

// ==================================================
// UPDATE / REPLACE / REMOVE
// ==================================================

export const updateFacultyMember = async (
  id,
  data,
  actorId
) => {
  assertValidId(id);

  const payload = normalizeData(data);

  const hasMediaId = Object.prototype.hasOwnProperty.call(
    payload,
    "imageMediaId"
  );

  const requestedMediaId = payload.imageMediaId;

  delete payload.imageMediaId;

  let updated = null;

  await mongoose.connection.transaction(async (session) => {
    const member = await FacultyMember.findById(id)
      .session(session);

    if (!member) throw notFound();

    const previousMediaId = member.imageMediaId;

    if (hasMediaId) {
      if (
        requestedMediaId &&
        String(requestedMediaId) ===
          String(previousMediaId || "")
      ) {
        const media = await MediaAsset.findOne({
          _id: requestedMediaId,
          ...mediaFilter,
          status: "attached",
          cleanupRequestedAt: null,
          cleanupLockedAt: null,
          "attachedTo.model": "FacultyMember",
          "attachedTo.documentId": member._id,
        }).session(session);

        if (!media || media.secureUrl !== member.image) {
          throw fail(
            "Current image state is inconsistent.",
            409,
            "MEDIA_STATE_CONFLICT"
          );
        }

        if (
          payload.image !== undefined &&
          payload.image !== media.secureUrl
        ) {
          throw fail(
            "Image URL and media ID do not match.",
            409,
            "MEDIA_URL_MISMATCH"
          );
        }
      } else {
        let nextUrl = "";

        if (requestedMediaId) {
          nextUrl = await attachMedia(
            requestedMediaId,
            member._id,
            actorId,
            session
          );

          if (payload.image && payload.image !== nextUrl) {
            throw fail(
              "Image URL and media ID do not match.",
              409,
              "MEDIA_URL_MISMATCH"
            );
          }
        }

        if (previousMediaId) {
          await detachMedia(
            previousMediaId,
            member._id,
            session
          );
        }

        member.image = nextUrl;
        member.imageMediaId = requestedMediaId || null;
      }

      delete payload.image;
    } else if (
      payload.image !== undefined &&
      previousMediaId
    ) {
      if (payload.image !== member.image) {
        throw fail(
          "Use imageMediaId to replace or remove a managed image.",
          409,
          "MEDIA_ID_REQUIRED"
        );
      }
    }

    Object.assign(member, payload);

    await member.save({ session });
    updated = member;
  });

  return updated;
};

// ==================================================
// PUBLISH / UNPUBLISH
// ==================================================

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

// ==================================================
// DELETE
// ==================================================

export const deleteFacultyMember = async (id) => {
  assertValidId(id);

  let deleted = null;

  await mongoose.connection.transaction(async (session) => {
    const member = await FacultyMember.findById(id)
      .session(session);

    if (!member) throw notFound();

    if (member.imageMediaId) {
      await detachMedia(
        member.imageMediaId,
        member._id,
        session
      );
    }

    await member.deleteOne({ session });
    deleted = member;
  });

  return deleted;
};
