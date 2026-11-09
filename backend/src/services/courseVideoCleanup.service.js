
import crypto from "node:crypto";
import mongoose from "mongoose";

import MediaAsset from "../models/mediaAsset.model.js";
import CourseLesson from "../models/courseLesson.model.js";
import cloudinary from "../config/cloudinary.js";
import logger from "../utils/logger.js";

const CATEGORY = "course-videos";
const RESOURCE_TYPE = "video";
const LOCK_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_RETRY_DELAY_MS = 60 * 60 * 1000;

const unattached = {
  $or: [
    { attachedTo: { $exists: false } },
    { "attachedTo.documentId": null },
  ],
};

const retryAt = (attempts) => {
  const exponent = Math.min(
    Math.max(Number(attempts) || 1, 1) - 1,
    6
  );

  const delay = Math.min(
    60_000 * 2 ** exponent,
    MAX_RETRY_DELAY_MS
  );

  return new Date(Date.now() + delay);
};

const ownedLock = (media) => ({
  _id: media._id,
  category: CATEGORY,
  resourceType: RESOURCE_TYPE,
  status: "deleting",
  cleanupLockToken: media.cleanupLockToken,
});

const restorePending = async (media, message) => {
  const result = await MediaAsset.updateOne(
    ownedLock(media),
    {
      $set: {
        status: "pending",
        cleanupLockedAt: null,
        cleanupLockToken: null,
        cleanupLastError: String(message).slice(0, 1000),
        cleanupNextRetryAt: retryAt(media.cleanupAttempts),
      },
    }
  );

  if (result.matchedCount !== 1) {
    logger.warn("Video cleanup lock no longer owned", {
      mediaId: String(media._id),
    });
  }
};

export const deleteDetachedCourseVideo = async (mediaId) => {
  if (!mongoose.isObjectIdOrHexString(mediaId)) {
    return {
      deleted: false,
      reason: "INVALID_MEDIA_ID",
    };
  }

  const now = new Date();
  const lockToken = crypto.randomUUID();

  const media = await MediaAsset.findOneAndUpdate(
    {
      _id: mediaId,
      category: CATEGORY,
      resourceType: RESOURCE_TYPE,
      status: "pending",
      cleanupRequestedAt: { $type: "date" },
      cleanupNextRetryAt: { $lte: now },
      cleanupLockedAt: null,
      ...unattached,
    },
    {
      $set: {
        status: "deleting",
        cleanupLockedAt: now,
        cleanupLockToken: lockToken,
      },
      $inc: {
        cleanupAttempts: 1,
      },
    },
    {
      returnDocument: "after",
    }
  ).select("+cleanupLockToken");

  if (!media) {
    return {
      deleted: false,
      reason: "NOT_ELIGIBLE_OR_NOT_DUE",
    };
  }

  try {
    // Check the actual lesson reference, including
    // unpublished lessons.
    const referenced = await CourseLesson.exists({
      videoMediaId: media._id,
    });

    if (referenced) {
      await restorePending(media, "STILL_REFERENCED");

      return {
        deleted: false,
        reason: "STILL_REFERENCED",
      };
    }

    const stillOwned = await MediaAsset.exists({
      ...ownedLock(media),
      ...unattached,
    });

    if (!stillOwned) {
      return {
        deleted: false,
        reason: "LOCK_LOST",
      };
    }

    // Authenticated videos must be deleted using
    // the correct Cloudinary delivery type.
    const response = await cloudinary.uploader.destroy(
      media.publicId,
      {
        resource_type: "video",
        type: "authenticated",
        invalidate: true,
      }
    );

    if (
      response?.result !== "ok" &&
      response?.result !== "not found"
    ) {
      throw new Error(
        `Cloudinary video deletion failed: ${
          response?.result || "UNKNOWN"
        }`
      );
    }

    const deletion = await MediaAsset.deleteOne({
      ...ownedLock(media),
      ...unattached,
    });

    if (deletion.deletedCount !== 1) {
      throw new Error(
        "MediaAsset deletion did not complete."
      );
    }

    logger.info("Course video cleanup completed", {
      mediaId: String(media._id),
    });

    return {
      deleted: true,
      mediaId: String(media._id),
    };
  } catch (error) {
    try {
      await restorePending(media, error.message);
    } catch (restoreError) {
      logger.error("Video cleanup recovery failed", {
        mediaId: String(media._id),
        message: restoreError.message,
      });
    }

    logger.error("Course video cleanup failed", {
      mediaId: String(media._id),
      message: error.message,
    });

    throw error;
  }
};

export const recoverStuckCourseVideos = async () => {
  const now = new Date();
  const cutoff = new Date(
    now.getTime() - LOCK_TIMEOUT_MS
  );

  return MediaAsset.updateMany(
    {
      category: CATEGORY,
      resourceType: RESOURCE_TYPE,
      status: "deleting",
      cleanupRequestedAt: { $type: "date" },
      cleanupLockedAt: { $lte: cutoff },
    },
    {
      $set: {
        status: "pending",
        cleanupLockedAt: null,
        cleanupLockToken: null,
        cleanupNextRetryAt: now,
        cleanupLastError:
          "Recovered expired video cleanup lock",
      },
    }
  );
};
