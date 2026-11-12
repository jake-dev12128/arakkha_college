
import { Router } from "express";
import { z } from "zod";

import {
  requireAuthentication,
} from "../middleware/auth.middleware.js";

import {
  requireRole,
} from "../middleware/authorization.middleware.js";

import {
  validate,
} from "../middleware/validation.middleware.js";

import {
  courseLessonParamsSchema,
  courseLessonIdParamsSchema,
  createCourseLessonSchema,
  updateCourseLessonSchema,
  courseLessonPublicationSchema,
  courseLessonListSchema,
} from "../schemas/courseLesson.schema.js";

import {
  listLessons,
  createLesson,
  updateLesson,
  setLessonPublication,
  deleteLesson,
} from "../controllers/courseLesson.controller.js";

import {
  getVideoUploadSignature,
  completeVideoUpload,
  removeLessonVideo,
  listMyCourseLessons,
  getLessonPlayback,
} from "../controllers/courseVideo.controller.js";

// ==================================================
// COURSE LESSON MANAGEMENT ROUTER
// ==================================================

const router = Router();

// All lesson management endpoints require
// an authenticated user.

router.use(requireAuthentication);

// Administrators may manage all courses.
// Teachers may manage only courses assigned
// to them, as enforced by the service layer.

router.use(
  requireRole(
    "super_admin",
    "admin",
    "teacher"
  )
);

// ==================================================
// LIST COURSE LESSONS
// ==================================================

router.get(
  "/:courseId/lessons",
  validate(
    courseLessonParamsSchema,
    "params"
  ),
  validate(
    courseLessonListSchema,
    "query"
  ),
  listLessons
);

// ==================================================
// CREATE COURSE LESSON
// ==================================================

router.post(
  "/:courseId/lessons",
  validate(
    courseLessonParamsSchema,
    "params"
  ),
  validate(
    createCourseLessonSchema,
    "body"
  ),
  createLesson
);

// ==================================================
// UPDATE COURSE LESSON
// ==================================================

router.patch(
  "/:courseId/lessons/:lessonId",
  validate(
    courseLessonIdParamsSchema,
    "params"
  ),
  validate(
    updateCourseLessonSchema,
    "body"
  ),
  updateLesson
);

// ==================================================
// PUBLISH / UNPUBLISH COURSE LESSON
// ==================================================

router.patch(
  "/:courseId/lessons/:lessonId/publication",
  validate(
    courseLessonIdParamsSchema,
    "params"
  ),
  validate(
    courseLessonPublicationSchema,
    "body"
  ),
  setLessonPublication
);

// ==================================================
// DELETE COURSE LESSON
// ==================================================

router.delete(
  "/:courseId/lessons/:lessonId",
  validate(
    courseLessonIdParamsSchema,
    "params"
  ),
  deleteLesson
);

// ==================================================
// VIDEO UPLOAD COMPLETION SCHEMA
// ==================================================

const completeVideoSchema = z
  .object({
    intent: z
      .string()
      .min(20)
      .max(4096),
  })
  .strict();

// ==================================================
// REQUEST SIGNED VIDEO UPLOAD
// ==================================================

router.post(
  "/:courseId/lessons/:lessonId/video/signature",
  validate(
    courseLessonIdParamsSchema,
    "params"
  ),
  getVideoUploadSignature
);

// ==================================================
// COMPLETE VIDEO UPLOAD
// ==================================================

router.post(
  "/:courseId/lessons/:lessonId/video/complete",
  validate(
    courseLessonIdParamsSchema,
    "params"
  ),
  validate(
    completeVideoSchema,
    "body"
  ),
  completeVideoUpload
);

// ==================================================
// DETACH LESSON VIDEO
// ==================================================

router.delete(
  "/:courseId/lessons/:lessonId/video",
  validate(
    courseLessonIdParamsSchema,
    "params"
  ),
  removeLessonVideo
);

// ==================================================
// AUTHENTICATED PLAYBACK ROUTER
// ==================================================

export const coursePlaybackRouter = Router();

coursePlaybackRouter.use(
  requireAuthentication
);

coursePlaybackRouter.use(
  requireRole(
    "super_admin",
    "admin",
    "teacher",
    "student"
  )
);

// ==================================================
// LIST ACCESSIBLE COURSE LESSONS
// ==================================================

coursePlaybackRouter.get(
  "/:courseId/lessons",
  validate(
    courseLessonParamsSchema,
    "params"
  ),
  listMyCourseLessons
);

// ==================================================
// GET SECURE VIDEO PLAYBACK
// ==================================================

coursePlaybackRouter.get(
  "/:courseId/lessons/:lessonId/playback",
  validate(
    courseLessonIdParamsSchema,
    "params"
  ),
  getLessonPlayback
);

export default router;
