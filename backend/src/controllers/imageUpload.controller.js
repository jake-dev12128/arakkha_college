
import MediaAsset from "../models/mediaAsset.model.js";
import cloudinary from "../config/cloudinary.js";
import logger from "../utils/logger.js";

import {
  uploadImageToCloudinary,
} from "../services/imageUpload.service.js";

// ==========================================
// ROLLBACK CLOUDINARY UPLOAD
// ==========================================

const rollbackCloudinaryUpload = async ({
  publicId,
  requestId,
  category,
}) => {
  try {
    const result = await cloudinary.uploader.destroy(
      publicId,
      {
        resource_type: "image",
        invalidate: true,
      }
    );

    const deletionStatus = result?.result;

    if (
      deletionStatus !== "ok" &&
      deletionStatus !== "not found"
    ) {
      throw new Error(
        `Unexpected Cloudinary deletion result: ${
          deletionStatus || "UNKNOWN"
        }`
      );
    }

    logger.info(
      "Cloudinary upload rolled back",
      {
        requestId,
        category,
        deletionStatus,
      }
    );

    return true;
  } catch (error) {
    logger.error(
      "Cloudinary upload rollback failed",
      {
        requestId,
        category,
        message: error.message,
      }
    );

    return false;
  }
};

// ==========================================
// UPLOAD IMAGE
// ==========================================

export const uploadImageController = async (
  req,
  res,
  next
) => {
  let uploadedImage = null;
  let mediaAssetSaved = false;

  const category = req.params.category;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image file is required.",
        code: "IMAGE_REQUIRED",
      });
    }

    // --------------------------------------
    // VERIFY AUTHENTICATED USER
    // --------------------------------------

    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
        code: "AUTHENTICATION_REQUIRED",
      });
    }

    // --------------------------------------
    // UPLOAD TO CLOUDINARY
    // --------------------------------------

    uploadedImage =
      await uploadImageToCloudinary(
        req.file,
        category
      );

    if (
      !uploadedImage?.publicId ||
      !uploadedImage?.url
    ) {
      throw new Error(
        "Cloudinary upload returned incomplete resource data."
      );
    }

    // --------------------------------------
    // CREATE MEDIA ASSET
    // --------------------------------------

    const mediaAsset =
      await MediaAsset.create({
        publicId: uploadedImage.publicId,
        resourceType: "image",
        secureUrl: uploadedImage.url,
        category,
        bytes: uploadedImage.bytes,
        width: uploadedImage.width,
        height: uploadedImage.height,
        format: uploadedImage.format,
        uploadedBy: req.user._id,
        status: "pending",
      });

    mediaAssetSaved = true;

    // --------------------------------------
    // SUCCESS RESPONSE
    // --------------------------------------

    return res.status(201).json({
      success: true,
      message: "Image uploaded successfully.",
      data: {
        mediaId: mediaAsset._id,
        url: mediaAsset.secureUrl,
        publicId: mediaAsset.publicId,
        resourceType: mediaAsset.resourceType,
        category: mediaAsset.category,
        width: mediaAsset.width,
        height: mediaAsset.height,
        bytes: mediaAsset.bytes,
        format: mediaAsset.format,
        status: mediaAsset.status,
      },
    });
  } catch (error) {
    // --------------------------------------
    // COMPENSATE FAILED DATABASE SAVE
    // --------------------------------------

    if (
      uploadedImage?.publicId &&
      !mediaAssetSaved
    ) {
      await rollbackCloudinaryUpload({
        publicId: uploadedImage.publicId,
        requestId: req.requestId,
        category,
      });
    }

    return next(error);
  }
};
