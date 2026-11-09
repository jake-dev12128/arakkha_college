
import crypto from "node:crypto";
import mongoose from "mongoose";

import User from "../models/user.model.js";
import News from "../models/news.model.js";
import FacultyMember from "../models/facultyMember.model.js";
import CollaborationPartner from "../models/collaborationPartner.model.js";
import MediaAsset from "../models/mediaAsset.model.js";
import Program from "../models/program.model.js";
import cloudinary from "../config/cloudinary.js";
import logger from "../utils/logger.js";
import Course from "../models/course.model.js";
// ==========================================
// CONFIGURATION
// ==========================================

const MAX_RETRY_DELAY = 60 * 60 * 1000;
const LOCK_TIMEOUT = 5 * 60 * 1000;

// Supported media categories and their
// MongoDB reference fields.
const CATEGORY_CONFIG = {
  news: {
    Model: News,
    mediaIdField: "coverImageMediaId",
    urlField: "coverImage",
  },

  users: {
    Model: User,
    mediaIdField: "profileImageMediaId",
    urlField: "profileImage",
  },

  faculties: {
    Model: FacultyMember,
    mediaIdField: "imageMediaId",
    urlField: "image",
  },

  collaborations: {
    Model: CollaborationPartner,
    mediaIdField: "logoMediaId",
    urlField: "logo",
  },programs: {
  Model: Program,
  mediaIdField: "imageMediaId",
  urlField: "imageUrl",
},thumbnails: {
  Model: Course,
  mediaIdField: "coverImageMediaId",
  urlField: "coverImage",
},
};

// ==========================================
// RETRY SCHEDULING
// ==========================================

const retryAt = (attempts) => {
  const safeAttempts = Math.max(
    Number(attempts) || 1,
    1
  );

  const exponent = Math.min(
    safeAttempts - 1,
    6
  );

  const delay = Math.min(
    60_000 * 2 ** exponent,
    MAX_RETRY_DELAY
  );

  return new Date(Date.now() + delay);
};

// ==========================================
// UNATTACHED FILTER
// ==========================================

const isUnattached = {
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
// VALIDATE MEDIA ID
// ==========================================

const isValidMediaId = (mediaId) => {
  return Boolean(
    mediaId &&
    mongoose.isObjectIdOrHexString(mediaId)
  );
};

// ==========================================
// CHECK DOCUMENT REFERENCES
// ==========================================

const isMediaReferenced = async (media) => {
  const config = CATEGORY_CONFIG[media.category];

  if (!config) {
    throw new Error(
      `Unsupported media category: ${media.category}`
    );
  }

  const referenceFilter = {
    $or: [
      {
        [config.mediaIdField]: media._id,
      },
      {
        [config.urlField]: media.secureUrl,
      },
    ],
  };

  const referenced = await config.Model.exists(
    referenceFilter
  );

  return Boolean(referenced);
};

// ==========================================
// LOCK OWNERSHIP FILTER
// ==========================================

const lockFilter = (media) => ({
  _id: media._id,
  category: media.category,
  resourceType: "image",
  status: "deleting",
  cleanupLockToken: media.cleanupLockToken,
});

// ==========================================
// RESTORE FAILED CLEANUP
// ==========================================

const restorePending = async (
  media,
  message
) => {
  const result = await MediaAsset.updateOne(
    lockFilter(media),
    {
      $set: {
        status: "pending",
        cleanupLockedAt: null,
        cleanupLockToken: null,
        cleanupLastError: String(message).slice(
          0,
          1000
        ),
        cleanupNextRetryAt: retryAt(
          media.cleanupAttempts
        ),
      },
    }
  );

  if (result.modifiedCount !== 1) {
    logger.warn(
      "Media cleanup state could not be restored",
      {
        mediaId: String(media._id),
        category: media.category,
      }
    );
  }

  return result;
};

// ==========================================
// ATOMICALLY CLAIM CLEANUP
// ==========================================

const claimMediaForDeletion = async (
  mediaId,
  category
) => {
  const now = new Date();
  const token = crypto.randomUUID();

  return MediaAsset.findOneAndUpdate(
    {
      _id: mediaId,
      category,
      resourceType: "image",
      status: "pending",

      cleanupRequestedAt: {
        $type: "date",
      },

      cleanupNextRetryAt: {
        $lte: now,
      },

      cleanupLockedAt: null,

      ...isUnattached,
    },
    {
      $set: {
        status: "deleting",
        cleanupLockedAt: now,
        cleanupLockToken: token,
      },

      $inc: {
        cleanupAttempts: 1,
      },
    },
    {
      returnDocument: "after",
    }
  ).select("+cleanupLockToken");
};

// ==========================================
// DELETE DETACHED IMAGE
// ==========================================

const deleteDetachedImage = async (
  mediaId,
  category
) => {
  if (!isValidMediaId(mediaId)) {
    return {
      deleted: false,
      reason: "INVALID_MEDIA_ID",
    };
  }

  if (!CATEGORY_CONFIG[category]) {
    return {
      deleted: false,
      reason: "UNSUPPORTED_CATEGORY",
    };
  }

  const media = await claimMediaForDeletion(
    mediaId,
    category
  );

  if (!media) {
    return {
      deleted: false,
      reason: "NOT_ELIGIBLE_OR_NOT_DUE",
    };
  }

  try {
    // ======================================
    // CHECK DATABASE REFERENCES
    // ======================================

    const referenced =
      await isMediaReferenced(media);

    if (referenced) {
      await restorePending(
        media,
        "STILL_REFERENCED"
      );

      logger.warn(
        "Referenced media deletion skipped",
        {
          mediaId: String(media._id),
          category,
        }
      );

      return {
        deleted: false,
        reason: "STILL_REFERENCED",
      };
    }

    // ======================================
    // CONFIRM LOCK OWNERSHIP
    // ======================================

    const stillOwned = await MediaAsset.exists({
      ...lockFilter(media),
      ...isUnattached,
    });

    if (!stillOwned) {
      return {
        deleted: false,
        reason: "LOCK_LOST",
      };
    }

    // ======================================
    // DELETE FROM CLOUDINARY
    // ======================================

    const cloudinaryResult =
      await cloudinary.uploader.destroy(
        media.publicId,
        {
          resource_type: "image",
          invalidate: true,
        }
      );

    const result = cloudinaryResult?.result;

    if (
      result !== "ok" &&
      result !== "not found"
    ) {
      throw new Error(
        `Cloudinary deletion failed: ${
          result || "UNKNOWN_RESULT"
        }`
      );
    }

    // ======================================
    // DELETE MEDIA ASSET RECORD
    // ======================================

    const deletion =
      await MediaAsset.deleteOne({
        ...lockFilter(media),
        ...isUnattached,
      });

    if (deletion.deletedCount !== 1) {
      throw new Error(
        "MediaAsset deletion did not complete."
      );
    }

    logger.info(
      "Detached media deleted successfully",
      {
        mediaId: String(media._id),
        category,
      }
    );

    return {
      deleted: true,
      mediaId: String(media._id),
    };
  } catch (error) {
    // ======================================
    // RETRY FAILED CLEANUP
    // ======================================

    try {
      await restorePending(
        media,
        error.message
      );
    } catch (recoveryError) {
      logger.error(
        "Media cleanup recovery failed",
        {
          mediaId: String(media._id),
          category,
          message: recoveryError.message,
        }
      );
    }

    logger.error(
      "Detached media deletion failed",
      {
        mediaId: String(media._id),
        category,
        message: error.message,
      }
    );

    throw error;
  }
};

// ==========================================
// RECOVER EXPIRED CLEANUP LOCKS
// ==========================================

const recoverStuckMedia = async (
  category
) => {
  if (!CATEGORY_CONFIG[category]) {
    throw new Error(
      `Unsupported cleanup category: ${category}`
    );
  }

  const now = new Date();

  const cutoff = new Date(
    now.getTime() - LOCK_TIMEOUT
  );

  const result = await MediaAsset.updateMany(
    {
      category,
      resourceType: "image",
      status: "deleting",

      cleanupRequestedAt: {
        $type: "date",
      },

      cleanupLockedAt: {
        $lte: cutoff,
      },
    },
    {
      $set: {
        status: "pending",
        cleanupLockedAt: null,
        cleanupLockToken: null,
        cleanupNextRetryAt: now,
        cleanupLastError:
          "Recovered from expired cleanup lock",
      },
    }
  );

  if (result.modifiedCount > 0) {
    logger.warn(
      "Expired media cleanup locks recovered",
      {
        category,
        count: result.modifiedCount,
      }
    );
  }

  return result;
};

// ==========================================
// NEWS IMAGE CLEANUP
// ==========================================

export const deleteDetachedNewsImage = async (
  mediaId
) => {
  return deleteDetachedImage(
    mediaId,
    "news"
  );
};

export const recoverStuckNewsMedia =
  async () => {
    return recoverStuckMedia("news");
  };

// ==========================================
// USER PROFILE IMAGE CLEANUP
// ==========================================

export const deleteDetachedUserImage = async (
  mediaId
) => {
  return deleteDetachedImage(
    mediaId,
    "users"
  );
};

export const recoverStuckUserMedia =
  async () => {
    return recoverStuckMedia("users");
  };

// ==========================================
// FACULTY IMAGE CLEANUP
// ==========================================

export const deleteDetachedFacultyImage = async (
  mediaId
) => {
  return deleteDetachedImage(
    mediaId,
    "faculties"
  );
};

export const recoverStuckFacultyMedia =
  async () => {
    return recoverStuckMedia("faculties");
  };

// ==========================================
// COLLABORATION IMAGE CLEANUP
// ==========================================

export const deleteDetachedCollaborationImage =
  async (mediaId) => {
    return deleteDetachedImage(
      mediaId,
      "collaborations"
    );
  };

export const recoverStuckCollaborationMedia =
  async () => {
    return recoverStuckMedia(
      "collaborations"
    );
  };
// ==========================================
// PROGRAM IMAGE CLEANUP
// ==========================================

export const deleteDetachedProgramImage = async (
  mediaId
) => {
  return deleteDetachedImage(
    mediaId,
    "programs"
  );
};

export const recoverStuckProgramMedia = async () => {
  return recoverStuckMedia("programs");
};// ==========================================
// COURSE COVER IMAGE CLEANUP
// ==========================================

export const deleteDetachedCourseImage = async (
  mediaId
) => {
  return deleteDetachedImage(
    mediaId,
    "thumbnails"
  );
};

export const recoverStuckCourseMedia =
  async () => {
    return recoverStuckMedia(
      "thumbnails"
    );
  };