
import { asyncHandler } from "../utils/asyncHandler.js";

import {
  issueLessonVideoUpload,
  completeLessonVideoUpload,
  detachLessonVideo,
  getAccessibleCourseLessons,
  getCourseLessonPlayback,
} from "../services/courseVideo.service.js";

const send = (res, data, status = 200) =>
  res.status(status).json({
    success: true,
    data,
  });

// ==========================================
// VIDEO UPLOAD SIGNATURE — ADMIN
// ==========================================

export const getVideoUploadSignature = asyncHandler(
  async (req, res) => {
    const result = await issueLessonVideoUpload(
      req.params.courseId,
      req.params.lessonId,
      req.user._id
    );

    return send(res, result);
  }
);

// ==========================================
// COMPLETE VIDEO UPLOAD — ADMIN
// ==========================================

export const completeVideoUpload = asyncHandler(
  async (req, res) => {
    const result = await completeLessonVideoUpload({
      courseId: req.params.courseId,
      lessonId: req.params.lessonId,
      actorId: req.user._id,
      intent: req.body.intent,
    });

    return send(res, result, 201);
  }
);

// ==========================================
// DETACH VIDEO — ADMIN
// ==========================================

export const removeLessonVideo = asyncHandler(
  async (req, res) => {
    const result = await detachLessonVideo({
      courseId: req.params.courseId,
      lessonId: req.params.lessonId,
    });

    return send(res, result);
  }
);

// ==========================================
// ACCESSIBLE LESSONS — AUTHENTICATED USERS
// ==========================================

export const listMyCourseLessons = asyncHandler(
  async (req, res) => {
    const lessons = await getAccessibleCourseLessons(
      req.params.courseId,
      req.user
    );

    res.set("Cache-Control", "no-store");

    return send(res, lessons);
  }
);

// ==========================================
// SECURE VIDEO PLAYBACK
// ==========================================

export const getLessonPlayback = asyncHandler(
  async (req, res) => {
    const result = await getCourseLessonPlayback({
      courseId: req.params.courseId,
      lessonId: req.params.lessonId,
      user: req.user,
    });

    res.set("Cache-Control", "no-store");
    res.set("Pragma", "no-cache");

    return send(res, result);
  }
);
