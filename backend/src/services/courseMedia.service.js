
import mongoose from "mongoose";

import MediaAsset from "../models/mediaAsset.model.js";
import AppError from "../utils/AppError.js";

const fail = (
  message,
  code = "COURSE_MEDIA_ERROR"
) => {
  throw new AppError(message, 409, code);
};

const mediaFilter = {
  category: "thumbnails",
  resourceType: "image",
};

export const attachCourseImage = async (
  mediaId,
  courseId,
  actorId,
  session
) => {
  if (
    !mongoose.isObjectIdOrHexString(mediaId) ||
    !mongoose.isObjectIdOrHexString(actorId)
  ) {
    fail(
      "Invalid media or uploader ID.",
      "INVALID_MEDIA_ID"
    );
  }

  const media = await MediaAsset.findOneAndUpdate(
    {
      _id: mediaId,
      ...mediaFilter,
      uploadedBy: actorId,
      status: "pending",
      cleanupRequestedAt: null,
      cleanupLockedAt: null,
      $or: [
        { attachedTo: { $exists: false } },
        { "attachedTo.documentId": null },
      ],
    },
    {
      $set: {
        status: "attached",
        attachedTo: {
          model: "Course",
          documentId: courseId,
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
      "Course image is unavailable or not owned by uploader.",
      "COURSE_MEDIA_UNAVAILABLE"
    );
  }

  return media.secureUrl;
};

export const verifyCurrentCourseImage = async (
  mediaId,
  courseId,
  expectedUrl,
  session
) => {
  const media = await MediaAsset.findOne({
    _id: mediaId,
    ...mediaFilter,
    status: "attached",
    cleanupRequestedAt: null,
    cleanupLockedAt: null,
    "attachedTo.model": "Course",
    "attachedTo.documentId": courseId,
  }).session(session);

  if (!media || media.secureUrl !== expectedUrl) {
    fail(
      "Current course image state is inconsistent.",
      "COURSE_MEDIA_STATE_CONFLICT"
    );
  }

  return media;
};

export const detachCourseImage = async (
  mediaId,
  courseId,
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
      "attachedTo.model": "Course",
      "attachedTo.documentId": courseId,
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
      "Course image detachment conflict.",
      "COURSE_MEDIA_DETACHMENT_CONFLICT"
    );
  }
};
