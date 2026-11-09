
import mongoose from "mongoose";

import MediaAsset from "../models/mediaAsset.model.js";
import AppError from "../utils/AppError.js";

const fail = (message, code = "PROGRAM_MEDIA_ERROR") => {
  throw new AppError(message, 409, code);
};

const mediaFilter = {
  category: "programs",
  resourceType: "image",
};

const unattachedFilter = {
  $or: [
    { attachedTo: { $exists: false } },
    { "attachedTo.documentId": null },
  ],
};

export const attachProgramImage = async (
  mediaId,
  programId,
  actorId,
  session
) => {
  if (
    !mongoose.isObjectIdOrHexString(mediaId) ||
    !mongoose.isObjectIdOrHexString(actorId)
  ) {
    fail("Invalid media or uploader ID.", "INVALID_MEDIA_ID");
  }

  const media = await MediaAsset.findOneAndUpdate(
    {
      _id: mediaId,
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
          model: "Program",
          documentId: programId,
        },
        cleanupRequestedAt: null,
        cleanupNextRetryAt: null,
        cleanupAttempts: 0,
        cleanupLastError: null,
        cleanupLockedAt: null,
        cleanupLockToken: null,
      },
    },
    {
      session,
      returnDocument: "after",
    }
  );

  if (!media) {
    fail(
      "Image unavailable or not owned by uploader.",
      "PROGRAM_MEDIA_UNAVAILABLE"
    );
  }

  return media.secureUrl;
};

export const verifyCurrentProgramImage = async (
  mediaId,
  programId,
  expectedUrl,
  session
) => {
  const media = await MediaAsset.findOne({
    _id: mediaId,
    ...mediaFilter,
    status: "attached",
    cleanupRequestedAt: null,
    cleanupLockedAt: null,
    "attachedTo.model": "Program",
    "attachedTo.documentId": programId,
  }).session(session);

  if (!media || media.secureUrl !== expectedUrl) {
    fail(
      "Current program image state is inconsistent.",
      "PROGRAM_MEDIA_STATE_CONFLICT"
    );
  }

  return media;
};

export const detachProgramImage = async (
  mediaId,
  programId,
  session
) => {
  if (!mediaId) return;

  const now = new Date();

  const result = await MediaAsset.updateOne(
    {
      _id: mediaId,
      ...mediaFilter,
      status: "attached",
      cleanupRequestedAt: null,
      cleanupLockedAt: null,
      "attachedTo.model": "Program",
      "attachedTo.documentId": programId,
    },
    {
      $set: {
        status: "pending",
        cleanupRequestedAt: now,
        cleanupNextRetryAt: now,
        cleanupAttempts: 0,
        cleanupLastError: null,
        cleanupLockedAt: null,
        cleanupLockToken: null,
      },
      $unset: {
        attachedTo: "",
      },
    },
    { session }
  );

  if (result.matchedCount !== 1) {
    fail(
      "Program image detachment conflict.",
      "PROGRAM_MEDIA_DETACHMENT_CONFLICT"
    );
  }
};
