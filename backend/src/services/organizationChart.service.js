
import mongoose from "mongoose";

import OrganizationChart from "../models/organizationChart.model.js";
import MediaAsset from "../models/mediaAsset.model.js";
import AppError from "../utils/AppError.js";

// ==========================================
// CONFIGURATION
// ==========================================

const CHART_KEY = "main";
const MEDIA_CATEGORY = "organization-charts";
const MEDIA_MODEL = "OrganizationChart";

const fail = (
  message,
  statusCode = 409,
  code = "ORGANIZATION_CHART_ERROR"
) => {
  throw new AppError(message, statusCode, code);
};

const isValidId = (value) =>
  mongoose.isObjectIdOrHexString(value);

const sameId = (a, b) =>
  Boolean(a && b && String(a) === String(b));

const mediaFilter = {
  category: MEDIA_CATEGORY,
  resourceType: "image",
};

const unattachedFilter = {
  $or: [
    { attachedTo: { $exists: false } },
    { "attachedTo.documentId": null },
  ],
};

// ==========================================
// IMAGE SNAPSHOT
// ==========================================

const imageSnapshot = (media) => ({
  mediaId: media._id,
  url: media.secureUrl,
  publicId: media.publicId,
  width: media.width ?? null,
  height: media.height ?? null,
});

// ==========================================
// VALIDATE ACTOR
// ==========================================

const validateActor = (actorId) => {
  if (!isValidId(actorId)) {
    fail(
      "Valid authenticated user is required.",
      401,
      "AUTHENTICATION_REQUIRED"
    );
  }
};

// ==========================================
// ENSURE SINGLE CHART DOCUMENT
// ==========================================

const ensureChart = async (actorId, session) => {
  validateActor(actorId);

  return OrganizationChart.findOneAndUpdate(
    { key: CHART_KEY },
    {
      $setOnInsert: {
        key: CHART_KEY,
        title: "Organization Chart",
        description: "",
        createdBy: actorId,
        updatedBy: actorId,
      },
    },
    {
      upsert: true,
      returnDocument: "after",
      session,
      setDefaultsOnInsert: true,
    }
  );
};

// ==========================================
// VALIDATE EXISTING ATTACHED IMAGE
// ==========================================

const verifyAttachedImage = async ({
  image,
  chartId,
  session,
}) => {
  if (!image?.mediaId) return null;

  const media = await MediaAsset.findOne({
    _id: image.mediaId,
    ...mediaFilter,
    status: "attached",
    cleanupRequestedAt: null,
    cleanupLockedAt: null,
    "attachedTo.model": MEDIA_MODEL,
    "attachedTo.documentId": chartId,
  }).session(session);

  if (
    !media ||
    media.secureUrl !== image.url ||
    media.publicId !== image.publicId
  ) {
    fail(
      "Organization chart media state is inconsistent.",
      409,
      "ORGANIZATION_CHART_MEDIA_CONFLICT"
    );
  }

  return media;
};

// ==========================================
// ATTACH UPLOADED MEDIA
// ==========================================

const attachImage = async ({
  mediaId,
  chartId,
  actorId,
  session,
}) => {
  if (!isValidId(mediaId)) {
    fail("Invalid media ID.", 400, "INVALID_MEDIA_ID");
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
          model: MEDIA_MODEL,
          documentId: chartId,
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
      "Image is unavailable, already attached, or not owned by uploader.",
      409,
      "ORGANIZATION_CHART_MEDIA_UNAVAILABLE"
    );
  }

  return imageSnapshot(media);
};

// ==========================================
// DETACH UNUSED MEDIA
// ==========================================

const detachImage = async ({
  image,
  chartId,
  session,
}) => {
  if (!image?.mediaId) return;

  const now = new Date();

  const result = await MediaAsset.updateOne(
    {
      _id: image.mediaId,
      ...mediaFilter,
      status: "attached",
      cleanupRequestedAt: null,
      cleanupLockedAt: null,
      "attachedTo.model": MEDIA_MODEL,
      "attachedTo.documentId": chartId,
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
      "Organization chart image detachment conflict.",
      409,
      "ORGANIZATION_CHART_DETACH_CONFLICT"
    );
  }
};

// ==========================================
// CHECK IMAGE REFERENCES
// ==========================================

const imageStillReferenced = (chart, image) => {
  if (!image?.mediaId) return false;

  return (
    sameId(chart.draftImage?.mediaId, image.mediaId) ||
    sameId(chart.publishedImage?.mediaId, image.mediaId)
  );
};

// ==========================================
// DETACH ONLY WHEN UNUSED
// ==========================================

const detachIfUnused = async ({
  chart,
  oldImage,
  session,
}) => {
  if (!oldImage?.mediaId) return;

  if (imageStillReferenced(chart, oldImage)) {
    return;
  }

  await detachImage({
    image: oldImage,
    chartId: chart._id,
    session,
  });
};

// ==========================================
// DATABASE TRANSACTION
// ==========================================

const runTransaction = async (callback) => {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(
      async () => {
        result = await callback(session);
      },
      {
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
      }
    );

    return result;
  } finally {
    await session.endSession();
  }
};

// ==========================================
// GET ADMIN ORGANIZATION CHART
// ==========================================

export const getAdminOrganizationChart = async () => {
  return OrganizationChart.findOne({
    key: CHART_KEY,
  }).lean();
};

// ==========================================
// GET PUBLIC ORGANIZATION CHART
// ==========================================

export const getPublicOrganizationChart = async () => {
  const chart = await OrganizationChart.findOne({
    key: CHART_KEY,
    isPublished: true,
    "publishedImage.mediaId": { $ne: null },
  })
    .select(
      "title description publishedTitle publishedDescription publishedImage publishedAt"
    )
    .lean();

  if (!chart?.publishedImage?.url) {
    return null;
  }

  // ========================================
  // PUBLISHED METADATA
  // ========================================
  // Legacy fallback supports records created
  // before published metadata was introduced.
  //
  // Backfill existing published records before
  // relying on full draft/public isolation.
  // ========================================

  const publicTitle =
    chart.publishedTitle ??
    chart.title;

  const publicDescription =
    chart.publishedDescription ??
    chart.description;

  return {
    title: publicTitle,
    description: publicDescription,
    imageUrl: chart.publishedImage.url,
    width: chart.publishedImage.width,
    height: chart.publishedImage.height,
    publishedAt: chart.publishedAt,
  };
};

// ==========================================
// CREATE / INITIALIZE CHART
// ==========================================

export const createOrganizationChart = async ({
  actorId,
  title = "Organization Chart",
  description = "",
  mediaId,
}) => {
  validateActor(actorId);

  return runTransaction(async (session) => {
    const existing = await OrganizationChart.findOne({
      key: CHART_KEY,
    }).session(session);

    if (existing) {
      fail(
        "Organization chart already exists.",
        409,
        "ORGANIZATION_CHART_ALREADY_EXISTS"
      );
    }

    const chart = await ensureChart(actorId, session);

    if (mediaId) {
      chart.draftImage = await attachImage({
        mediaId,
        chartId: chart._id,
        actorId,
        session,
      });
    }

    chart.title = title;
    chart.description = description;
    chart.updatedBy = actorId;

    await chart.save({ session });

    return chart.toObject();
  });
};

// ==========================================
// UPDATE ORGANIZATION CHART DRAFT
// ==========================================

export const updateOrganizationChart = async ({
  actorId,
  title,
  description,
  mediaId,
}) => {
  validateActor(actorId);

  return runTransaction(async (session) => {
    const chart = await ensureChart(actorId, session);

    const oldDraft = chart.draftImage
      ? chart.draftImage.toObject()
      : null;

    if (title !== undefined) {
      chart.title = title;
    }

    if (description !== undefined) {
      chart.description = description;
    }

    if (mediaId !== undefined) {
      if (mediaId === null) {
        chart.draftImage = null;
      } else if (
        !sameId(oldDraft?.mediaId, mediaId)
      ) {
        // Existing published media may be reused
        // without attaching it a second time.
        if (
          sameId(chart.publishedImage?.mediaId, mediaId)
        ) {
          await verifyAttachedImage({
            image: chart.publishedImage,
            chartId: chart._id,
            session,
          });

          chart.draftImage =
            chart.publishedImage.toObject();
        } else {
          chart.draftImage = await attachImage({
            mediaId,
            chartId: chart._id,
            actorId,
            session,
          });
        }
      } else {
        await verifyAttachedImage({
          image: chart.draftImage,
          chartId: chart._id,
          session,
        });
      }
    }

    chart.updatedBy = actorId;

    await chart.save({ session });

    await detachIfUnused({
      chart,
      oldImage: oldDraft,
      session,
    });

    return chart.toObject();
  });
};

// ==========================================
// PUBLISH ORGANIZATION CHART
// ==========================================

export const publishOrganizationChart = async ({
  actorId,
}) => {
  validateActor(actorId);

  return runTransaction(async (session) => {
    const chart = await OrganizationChart.findOne({
      key: CHART_KEY,
    }).session(session);

    if (!chart) {
      fail(
        "Organization chart not found.",
        404,
        "ORGANIZATION_CHART_NOT_FOUND"
      );
    }

    if (!chart.draftImage?.mediaId) {
      fail(
        "Upload an organization chart image before publishing.",
        400,
        "ORGANIZATION_CHART_IMAGE_REQUIRED"
      );
    }

    await verifyAttachedImage({
      image: chart.draftImage,
      chartId: chart._id,
      session,
    });

    const oldPublished = chart.publishedImage
      ? chart.publishedImage.toObject()
      : null;

    // ========================================
    // SNAPSHOT DRAFT IMAGE
    // ========================================

    chart.publishedImage =
      chart.draftImage.toObject();

    // ========================================
    // SNAPSHOT DRAFT METADATA
    // ========================================
    // Public title and description are updated
    // only when the chart is published.
    // ========================================

    chart.publishedTitle = chart.title;
    chart.publishedDescription =
      chart.description ?? "";

    // ========================================
    // PUBLICATION STATUS
    // ========================================

    chart.isPublished = true;
    chart.publishedAt = new Date();
    chart.updatedBy = actorId;

    await chart.save({ session });

    await detachIfUnused({
      chart,
      oldImage: oldPublished,
      session,
    });

    return chart.toObject();
  });
};

// ==========================================
// UNPUBLISH ORGANIZATION CHART
// ==========================================

export const unpublishOrganizationChart = async ({
  actorId,
}) => {
  validateActor(actorId);

  return runTransaction(async (session) => {
    const chart = await OrganizationChart.findOne({
      key: CHART_KEY,
    }).session(session);

    if (!chart) {
      fail(
        "Organization chart not found.",
        404,
        "ORGANIZATION_CHART_NOT_FOUND"
      );
    }

    chart.isPublished = false;
    chart.updatedBy = actorId;

    // Preserve publishedImage for later reuse.
    // Do not detach it on unpublish.
    await chart.save({ session });

    return chart.toObject();
  });
};

// ==========================================
// REMOVE DRAFT IMAGE
// ==========================================

export const removeOrganizationChartDraftImage =
  async ({ actorId }) => {
    return updateOrganizationChart({
      actorId,
      mediaId: null,
    });
  };
