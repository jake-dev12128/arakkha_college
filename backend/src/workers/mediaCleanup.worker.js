
import MediaAsset from "../models/mediaAsset.model.js";

import {
  deleteDetachedNewsImage,
  recoverStuckNewsMedia,
  deleteDetachedUserImage,
  recoverStuckUserMedia,
  deleteDetachedFacultyImage,
  recoverStuckFacultyMedia,
  deleteDetachedCollaborationImage,
  recoverStuckCollaborationMedia,
  deleteDetachedProgramImage,
  recoverStuckProgramMedia,
  deleteDetachedCourseImage,
  recoverStuckCourseMedia,

  // NEW: Organization Chart Cleanup
  deleteDetachedOrganizationChartImage,
  recoverStuckOrganizationChartMedia,
} from "../services/mediaCleanup.service.js";

import {
  deleteDetachedCourseVideo,
  recoverStuckCourseVideos,
} from "../services/courseVideoCleanup.service.js";

import logger from "../utils/logger.js";

// ==========================================
// CONFIGURATION
// ==========================================

const INTERVAL_MS = 60_000;
const BATCH_SIZE = 20;

// Unattached uploads expire after 24 hours.
const PENDING_UPLOAD_TTL_MS =
  24 * 60 * 60 * 1000;

// ==========================================
// CLEANUP CATEGORIES
// ==========================================

const CLEANUP_CATEGORIES = [
  {
    category: "news",
    resourceType: "image",
    label: "News",
    deleteImage: deleteDetachedNewsImage,
    recoverStuck: recoverStuckNewsMedia,
  },
  {
    category: "users",
    resourceType: "image",
    label: "User profile",
    deleteImage: deleteDetachedUserImage,
    recoverStuck: recoverStuckUserMedia,
  },
  {
    category: "faculties",
    resourceType: "image",
    label: "Faculties & Staff",
    deleteImage: deleteDetachedFacultyImage,
    recoverStuck: recoverStuckFacultyMedia,
  },
  {
    category: "collaborations",
    resourceType: "image",
    label: "Collaboration",
    deleteImage: deleteDetachedCollaborationImage,
    recoverStuck: recoverStuckCollaborationMedia,
  },
  {
    category: "programs",
    resourceType: "image",
    label: "Program cover image",
    deleteImage: deleteDetachedProgramImage,
    recoverStuck: recoverStuckProgramMedia,
  },
  {
    category: "thumbnails",
    resourceType: "image",
    label: "Course cover image",
    deleteImage: deleteDetachedCourseImage,
    recoverStuck: recoverStuckCourseMedia,
  },

  // ======================================
  // NEW: ORGANIZATION CHART
  // ======================================
  {
    category: "organization-charts",
    resourceType: "image",
    label: "Organization Chart",
    deleteImage: deleteDetachedOrganizationChartImage,
    recoverStuck: recoverStuckOrganizationChartMedia,
  },

  {
    category: "course-videos",
    resourceType: "video",
    label: "Course videos",
    deleteImage: deleteDetachedCourseVideo,
    recoverStuck: recoverStuckCourseVideos,
  },
];

// ==========================================
// WORKER STATE
// ==========================================

let timer = null;
let running = false;
let stopped = false;

// ==========================================
// RECOVER STUCK CLEANUP LOCKS
// ==========================================

const recoverStuckMedia = async () => {
  for (const config of CLEANUP_CATEGORIES) {
    if (stopped) break;

    try {
      const recovery = await config.recoverStuck();

      if (recovery?.modifiedCount > 0) {
        logger.warn(
          "Stuck media cleanup recovered",
          {
            category: config.category,
            resourceType: config.resourceType,
            count: recovery.modifiedCount,
          }
        );
      }
    } catch (error) {
      logger.error(
        "Media cleanup recovery failed",
        {
          category: config.category,
          resourceType: config.resourceType,
          message: error.message,
        }
      );
    }
  }
};

// ==========================================
// SCHEDULE EXPIRED PENDING UPLOADS
// ==========================================

const scheduleExpiredUploads = async (
  category,
  resourceType = "image"
) => {
  const now = new Date();

  const cutoff = new Date(
    now.getTime() - PENDING_UPLOAD_TTL_MS
  );

  const result = await MediaAsset.updateMany(
    {
      category,
      resourceType,
      status: "pending",

      createdAt: {
        $lte: cutoff,
      },

      cleanupRequestedAt: null,
      cleanupLockedAt: null,

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
    },
    {
      $set: {
        cleanupRequestedAt: now,
        cleanupNextRetryAt: now,
        cleanupAttempts: 0,
        cleanupLastError: null,
      },
    }
  );

  if (result.modifiedCount > 0) {
    logger.info(
      "Expired pending uploads scheduled for cleanup",
      {
        category,
        resourceType,
        count: result.modifiedCount,
        ttlMs: PENDING_UPLOAD_TTL_MS,
      }
    );
  }

  return result;
};

// ==========================================
// FIND ELIGIBLE MEDIA
// ==========================================

const findPendingMedia = async (
  category,
  resourceType = "image"
) => {
  return MediaAsset.find({
    category,
    resourceType,
    status: "pending",

    cleanupRequestedAt: {
      $type: "date",
    },

    cleanupNextRetryAt: {
      $lte: new Date(),
    },

    cleanupLockedAt: null,

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
  })
    .sort({
      cleanupNextRetryAt: 1,
      _id: 1,
    })
    .limit(BATCH_SIZE)
    .select("_id")
    .lean();
};

// ==========================================
// CLEANUP CATEGORY
// ==========================================

const cleanupCategory = async (config) => {
  const mediaAssets = await findPendingMedia(
    config.category,
    config.resourceType
  );

  for (const media of mediaAssets) {
    if (stopped) break;

    try {
      const result = await config.deleteImage(
        media._id
      );

      if (result?.deleted) {
        logger.info(
          "Media cleanup completed",
          {
            category: config.category,
            resourceType: config.resourceType,
            mediaId: String(media._id),
          }
        );
      }
    } catch (error) {
      logger.error(
        "Media cleanup failed",
        {
          category: config.category,
          resourceType: config.resourceType,
          mediaId: String(media._id),
          message: error.message,
        }
      );
    }
  }
};

// ==========================================
// MAIN WORKER
// ==========================================

export const runMediaCleanup = async () => {
  if (running || stopped) return;

  running = true;

  try {
    await recoverStuckMedia();

    for (const config of CLEANUP_CATEGORIES) {
      if (stopped) break;

      try {
        await scheduleExpiredUploads(
          config.category,
          config.resourceType
        );

        if (stopped) break;

        await cleanupCategory(config);
      } catch (error) {
        logger.error(
          "Media cleanup category failed",
          {
            category: config.category,
            resourceType: config.resourceType,
            message: error.message,
          }
        );
      }
    }
  } catch (error) {
    logger.error(
      "Media cleanup worker failed",
      {
        message: error.message,
      }
    );
  } finally {
    running = false;
  }
};

// ==========================================
// START WORKER
// ==========================================

export const startMediaCleanupWorker = () => {
  if (timer) return;

  stopped = false;

  // Run immediately after startup.
  void runMediaCleanup();

  timer = setInterval(() => {
    void runMediaCleanup();
  }, INTERVAL_MS);

  logger.info(
    "Media cleanup worker started",
    {
      intervalMs: INTERVAL_MS,
      batchSize: BATCH_SIZE,
      pendingUploadTtlMs: PENDING_UPLOAD_TTL_MS,
      categories: CLEANUP_CATEGORIES.map(
        (config) => config.category
      ),
    }
  );
};

// ==========================================
// STOP WORKER
// ==========================================

export const stopMediaCleanupWorker = async () => {
  stopped = true;

  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  while (running) {
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
  }

  logger.info(
    "Media cleanup worker stopped"
  );
};
