
import mongoose from "mongoose";

import User from "../models/user.model.js";
import MediaAsset from "../models/mediaAsset.model.js";

const fail = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

// ==========================================
// UPDATE MY PROFILE IMAGE
// ==========================================
export const updateMyProfileImage = async ({ userId, mediaId }) => {
  if (!mongoose.isObjectIdOrHexString(mediaId)) {
    throw profileImageError("Invalid media ID.");
  }

  let previousMediaId = null;
  let updatedUser = null;

  await mongoose.connection.transaction(async (session) => {
    const user = await User.findById(userId).session(session);

    if (!user || !user.isActive) {
      throw fail("Active user not found.", 404);
    }

    const media = await MediaAsset.findById(mediaId).session(session);

    if (!media) {
      throw fail("Image not found.", 404);
    }

    if (media.category !== "users" || media.resourceType !== "image") {
      throw fail("Invalid profile image.");
    }

    if (String(media.uploadedBy) !== String(user._id)) {
      throw fail("You do not own this image.", 403);
    }

    const sameImage =
      String(user.profileImageMediaId || "") === String(media._id);

    if (sameImage) {
      if (
        media.status !== "attached" ||
        media.attachedTo?.model !== "User" ||
        String(media.attachedTo?.documentId) !== String(user._id)
      ) {
        throw fail("Profile image state is inconsistent.", 409);
      }

      updatedUser = user.toObject();
      return;
    }

    if (media.status !== "pending") {
      throw fail("Image is not available for attachment.", 409);
    }

    if (media.cleanupRequestedAt || media.attachedTo?.documentId) {
      throw fail("Image is not available for attachment.", 409);
    }

    const attached = await MediaAsset.updateOne(
      {
        _id: media._id,
        uploadedBy: user._id,
        category: "users",
        resourceType: "image",
        status: "pending",
        cleanupRequestedAt: null,
        $or: [
          { attachedTo: { $exists: false } },
          { "attachedTo.documentId": null },
        ],
      },
      {
        $set: {
          status: "attached",
          attachedTo: {
            model: "User",
            documentId: user._id,
          },
          cleanupRequestedAt: null,
          cleanupNextRetryAt: null,
          cleanupAttempts: 0,
          cleanupLastError: null,
          cleanupLockedAt: null,
        },
      },
      { session },
    );

    if (attached.matchedCount !== 1) {
      throw fail("Image attachment conflict.", 409);
    }

    previousMediaId = user.profileImageMediaId || null;

    user.profileImage = media.secureUrl;
    user.profileImageMediaId = media._id;

    await user.save({ session });

    if (previousMediaId) {
      const detached = await MediaAsset.updateOne(
        {
          _id: previousMediaId,
          status: "attached",
          "attachedTo.model": "User",
          "attachedTo.documentId": user._id,
        },
        {
          $set: {
            status: "pending",
            cleanupRequestedAt: new Date(),
            cleanupNextRetryAt: new Date(),
            cleanupAttempts: 0,
            cleanupLastError: null,
            cleanupLockedAt: null,
          },
          $unset: {
            attachedTo: "",
          },
        },
        { session },
      );

      if (detached.matchedCount !== 1) {
        throw fail("Previous image detachment failed.", 409);
      }
    }

    updatedUser = user.toObject();
  });

  return {
    user: {
      _id: updatedUser._id,
      role: updatedUser.role,
      profileImage: updatedUser.profileImage,
      profileImageMediaId: updatedUser.profileImageMediaId,
    },
    previousMediaId,
  };
};

