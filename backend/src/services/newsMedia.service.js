
import mongoose from "mongoose";
import MediaAsset from "../models/mediaAsset.model.js";

// ==========================================
// ERROR HELPER
// ==========================================

const fail = (message, statusCode = 400) => {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.isOperational = true;

  return error;
};

// ==========================================
// UNATTACHED MEDIA FILTER
// ==========================================

const unattachedFilter = {
  $or: [
    {
      attachedTo: {
        $exists: false,
      },
    },
    {
      "attachedTo.documentId": null,
    },
  ],
};

// ==========================================
// VALIDATE NEWS MEDIA
// ==========================================

export const validateNewsMedia = async ({
  mediaId,
  imageUrl,
  userId,
  newsId,
  session,
}) => {
  if (!mediaId) {
    throw fail("Media ID is required.");
  }

  if (!mongoose.isObjectIdOrHexString(mediaId)) {
    throw fail("Invalid media ID.");
  }

  if (!mongoose.isObjectIdOrHexString(userId)) {
    throw fail("Invalid uploader ID.");
  }

  const media = await MediaAsset.findById(
    mediaId
  ).session(session);

  if (!media) {
    throw fail("Media asset not found.", 404);
  }

  if (
    media.category !== "news" ||
    media.resourceType !== "image"
  ) {
    throw fail("Media asset is not a News image.");
  }

  if (media.secureUrl !== imageUrl) {
    throw fail(
      "Image URL does not match the media asset."
    );
  }

  const attachedToSameNews =
    media.status === "attached" &&
    media.attachedTo?.model === "News" &&
    String(media.attachedTo?.documentId) ===
      String(newsId);

  // Existing attached media may be reused
  // only by the same News record.
  if (
    !attachedToSameNews &&
    String(media.uploadedBy) !== String(userId)
  ) {
    throw fail(
      "You do not own this uploaded image.",
      403
    );
  }

  if (media.status === "deleting") {
    throw fail(
      "Media asset is being deleted.",
      409
    );
  }

  if (media.status === "attached") {
    if (!attachedToSameNews) {
      throw fail(
        "Media asset is already attached to another record.",
        409
      );
    }

    if (media.cleanupRequestedAt) {
      throw fail(
        "Attached media has an invalid cleanup state.",
        409
      );
    }

    return media;
  }

  if (media.status !== "pending") {
    throw fail(
      "Media asset is not available.",
      409
    );
  }

  // Prevent attaching media that has already
  // been scheduled for deletion.
  if (
    media.cleanupRequestedAt ||
    media.cleanupLockedAt ||
    media.attachedTo?.documentId
  ) {
    throw fail(
      "Media asset is scheduled for cleanup or already attached.",
      409
    );
  }

  return media;
};

// ==========================================
// ATTACH NEWS MEDIA
// ==========================================

export const attachNewsMedia = async ({
  media,
  newsId,
  session,
}) => {
  if (!media?._id) {
    throw fail("Media asset is required.");
  }

  if (!mongoose.isObjectIdOrHexString(newsId)) {
    throw fail("Invalid News ID.");
  }

  const isAlreadyAttached =
    media.status === "attached";

  const filter = isAlreadyAttached
    ? {
        _id: media._id,
        category: "news",
        resourceType: "image",
        status: "attached",
        "attachedTo.model": "News",
        "attachedTo.documentId": newsId,
        cleanupRequestedAt: null,
        cleanupLockedAt: null,
      }
    : {
        _id: media._id,
        category: "news",
        resourceType: "image",
        uploadedBy: media.uploadedBy,
        status: "pending",
        cleanupRequestedAt: null,
        cleanupLockedAt: null,
        ...unattachedFilter,
      };

  const result = await MediaAsset.updateOne(
    filter,
    {
      $set: {
        status: "attached",
        attachedTo: {
          model: "News",
          documentId: newsId,
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
      "Media asset changed during attachment.",
      409
    );
  }

  return {
    attached: true,
    mediaId: media._id,
  };
};

// ==========================================
// DETACH NEWS MEDIA
// ==========================================

export const detachNewsMedia = async ({
  mediaId,
  newsId,
  session,
}) => {
  if (!mediaId) {
    return {
      detached: false,
    };
  }

  if (
    !mongoose.isObjectIdOrHexString(mediaId) ||
    !mongoose.isObjectIdOrHexString(newsId)
  ) {
    throw fail("Invalid media or News ID.");
  }

  const now = new Date();

  const result = await MediaAsset.updateOne(
    {
      _id: mediaId,
      category: "news",
      resourceType: "image",
      status: "attached",
      "attachedTo.model": "News",
      "attachedTo.documentId": newsId,
      cleanupRequestedAt: null,
      cleanupLockedAt: null,
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
      "News media detachment failed.",
      409
    );
  }

  return {
    detached: true,
    mediaId,
  };
};
