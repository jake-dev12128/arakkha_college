
import mongoose from "mongoose";
import sanitizeHtml from "sanitize-html";

import CollaborationPartner from "../models/collaborationPartner.model.js";
import MediaAsset from "../models/mediaAsset.model.js";

const fail = (
  message,
  statusCode = 400,
  code = "COLLABORATION_ERROR"
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
    result.description = sanitizeDescription(result.description);
  }

  return result;
};

const assertValidId = (id) => {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw fail("Invalid partner ID.", 400, "INVALID_PARTNER_ID");
  }
};

const notFound = () =>
  fail(
    "Collaboration partner not found.",
    404,
    "PARTNER_NOT_FOUND"
  );

const mediaFilter = {
  category: "collaborations",
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
  partnerId,
  actorId,
  session
) => {
  if (!mongoose.isObjectIdOrHexString(mediaId)) {
    throw fail("Invalid logoMediaId.", 400, "INVALID_MEDIA_ID");
  }

  if (!mongoose.isObjectIdOrHexString(actorId)) {
    throw fail("Authentication required.", 401, "AUTH_REQUIRED");
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
      "Logo unavailable or not owned by uploader.",
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
          model: "CollaborationPartner",
          documentId: partnerId,
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
      "Logo attachment conflict.",
      409,
      "MEDIA_ATTACHMENT_CONFLICT"
    );
  }

  return media.secureUrl;
};

// ==================================================
// DETACH OLD IMAGE
// ==================================================

const detachMedia = async (mediaId, partnerId, session) => {
  if (!mediaId) return;

  const now = new Date();

  const result = await MediaAsset.updateOne(
    {
      _id: mediaId,
      ...mediaFilter,
      status: "attached",
      cleanupRequestedAt: null,
      cleanupLockedAt: null,
      "attachedTo.model": "CollaborationPartner",
      "attachedTo.documentId": partnerId,
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
      "Logo detachment conflict.",
      409,
      "MEDIA_DETACHMENT_CONFLICT"
    );
  }
};

// ==================================================
// PUBLIC READ
// ==================================================

export const getPublicPartners = async () =>
  CollaborationPartner.find({
    isPublished: true,
    isActive: true,
  })
    .select("name type logo shortDescription displayOrder")
    .sort({ displayOrder: 1, _id: 1 })
    .lean();

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
// ADMIN READ
// ==================================================

export const getAllPartners = async () =>
  CollaborationPartner.find()
    .sort({ displayOrder: 1, _id: 1 })
    .lean();

export const getAdminPartnerById = async (id) => {
  assertValidId(id);

  const partner = await CollaborationPartner.findById(id).lean();

  if (!partner) throw notFound();

  return partner;
};

// ==================================================
// CREATE
// ==================================================

export const createPartner = async (data, actorId) => {
  const payload = normalizeData(data);
  const mediaId = payload.logoMediaId;

  delete payload.logoMediaId;

  let created = null;

  await mongoose.connection.transaction(async (session) => {
    const partner = new CollaborationPartner(payload);

    if (mediaId) {
      const url = await attachMedia(
        mediaId,
        partner._id,
        actorId,
        session
      );

      if (payload.logo && payload.logo !== url) {
        throw fail(
          "Logo URL and media ID do not match.",
          409,
          "MEDIA_URL_MISMATCH"
        );
      }

      partner.logo = url;
      partner.logoMediaId = mediaId;
    }

    await partner.save({ session });
    created = partner;
  });

  return created;
};

// ==================================================
// UPDATE / REPLACE / REMOVE
// ==================================================

export const updatePartner = async (
  id,
  data,
  actorId
) => {
  assertValidId(id);

  const payload = normalizeData(data);

  const hasMediaId = Object.prototype.hasOwnProperty.call(
    payload,
    "logoMediaId"
  );

  const requestedMediaId = payload.logoMediaId;

  delete payload.logoMediaId;

  let updated = null;

  await mongoose.connection.transaction(async (session) => {
    const partner = await CollaborationPartner.findById(id)
      .session(session);

    if (!partner) throw notFound();

    const previousMediaId = partner.logoMediaId;

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
          "attachedTo.model": "CollaborationPartner",
          "attachedTo.documentId": partner._id,
        }).session(session);

        if (!media || media.secureUrl !== partner.logo) {
          throw fail(
            "Current logo state is inconsistent.",
            409,
            "MEDIA_STATE_CONFLICT"
          );
        }

        if (
          payload.logo !== undefined &&
          payload.logo !== media.secureUrl
        ) {
          throw fail(
            "Logo URL and media ID do not match.",
            409,
            "MEDIA_URL_MISMATCH"
          );
        }
      } else {
        let nextUrl = "";

        if (requestedMediaId) {
          nextUrl = await attachMedia(
            requestedMediaId,
            partner._id,
            actorId,
            session
          );

          if (payload.logo && payload.logo !== nextUrl) {
            throw fail(
              "Logo URL and media ID do not match.",
              409,
              "MEDIA_URL_MISMATCH"
            );
          }
        }

        if (previousMediaId) {
          await detachMedia(
            previousMediaId,
            partner._id,
            session
          );
        }

        partner.logo = nextUrl;
        partner.logoMediaId = requestedMediaId || null;
      }

      delete payload.logo;
    } else if (
      payload.logo !== undefined &&
      previousMediaId
    ) {
      if (payload.logo !== partner.logo) {
        throw fail(
          "Use logoMediaId to replace or remove a managed logo.",
          409,
          "MEDIA_ID_REQUIRED"
        );
      }
    }

    Object.assign(partner, payload);

    await partner.save({ session });
    updated = partner;
  });

  return updated;
};

// ==================================================
// PUBLISH / UNPUBLISH
// ==================================================

export const setPartnerPublication = async (
  id,
  isPublished
) => {
  assertValidId(id);

  const partner = await CollaborationPartner.findById(id);

  if (!partner) throw notFound();

  partner.isPublished = isPublished;
  partner.publishedAt = isPublished
    ? partner.publishedAt || new Date()
    : null;

  await partner.save();

  return partner;
};

// ==================================================
// DELETE
// ==================================================

export const deletePartner = async (id) => {
  assertValidId(id);

  let deleted = null;

  await mongoose.connection.transaction(async (session) => {
    const partner = await CollaborationPartner.findById(id)
      .session(session);

    if (!partner) throw notFound();

    if (partner.logoMediaId) {
      await detachMedia(
        partner.logoMediaId,
        partner._id,
        session
      );
    }

    await partner.deleteOne({ session });
    deleted = partner;
  });

  return deleted;
};
