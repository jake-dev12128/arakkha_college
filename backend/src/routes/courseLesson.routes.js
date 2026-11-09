
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

// ==========================================
// ADMIN COURSE LESSON ROUTER
// ==========================================

const router = Router();

router.use(requireAuthentication);

router.use(
  requireRole("super_admin", "admin")
);

// ==========================================
// ADMIN LESSON CRUD
// ==========================================

router.get(
  "/:courseId/lessons",
  validate(courseLessonParamsSchema, "params"),
  validate(courseLessonListSchema, "query"),
  listLessons
);

router.post(
  "/:courseId/lessons",
  validate(courseLessonParamsSchema, "params"),
  validate(createCourseLessonSchema, "body"),
  createLesson
);

router.patch(
  "/:courseId/lessons/:lessonId",
  validate(courseLessonIdParamsSchema, "params"),
  validate(updateCourseLessonSchema, "body"),
  updateLesson
);

router.patch(
  "/:courseId/lessons/:lessonId/publication",
  validate(courseLessonIdParamsSchema, "params"),
  validate(courseLessonPublicationSchema, "body"),
  setLessonPublication
);

router.delete(
  "/:courseId/lessons/:lessonId",
  validate(courseLessonIdParamsSchema, "params"),
  deleteLesson
);

// ==========================================
// ADMIN VIDEO UPLOAD VALIDATION
// ==========================================

const completeVideoSchema = z
  .object({
    intent: z.string().min(20).max(4096),
  })
  .strict();

// ==========================================
// ADMIN VIDEO UPLOAD ROUTES
// ==========================================

router.post(
  "/:courseId/lessons/:lessonId/video/signature",
  validate(courseLessonIdParamsSchema, "params"),
  getVideoUploadSignature
);

router.post(
  "/:courseId/lessons/:lessonId/video/complete",
  validate(courseLessonIdParamsSchema, "params"),
  validate(completeVideoSchema, "body"),
  completeVideoUpload
);

router.delete(
  "/:courseId/lessons/:lessonId/video",
  validate(courseLessonIdParamsSchema, "params"),
  removeLessonVideo
);

// ==========================================
// AUTHENTICATED PLAYBACK ROUTER
// ==========================================

export const coursePlaybackRouter = Router();

coursePlaybackRouter.use(requireAuthentication);

coursePlaybackRouter.use(
  requireRole(
    "super_admin",
    "admin",
    "teacher",
    "student"
  )
);

// ==========================================
// ACCESSIBLE LESSON LIST
// ==========================================

coursePlaybackRouter.get(
  "/:courseId/lessons",
  validate(courseLessonParamsSchema, "params"),
  listMyCourseLessons
);

// ==========================================
// SIGNED VIDEO PLAYBACK
// ==========================================

coursePlaybackRouter.get(
  "/:courseId/lessons/:lessonId/playback",
  validate(courseLessonIdParamsSchema, "params"),
  getLessonPlayback
);

export default router;
