
import { asyncHandler } from "../utils/asyncHandler.js";

import * as lessons from "../services/courseLesson.service.js";

const send = (res, data, status = 200) =>
  res.status(status).json({
    success: true,
    data,
  });

// ==========================================
// LIST COURSE LESSONS
// ==========================================

export const listLessons = asyncHandler(
  async (req, res) => {
    const result = await lessons.listCourseLessons(
      req.params.courseId,
      req.query,
      req.user
    );

    return send(res, result);
  }
);

// ==========================================
// CREATE COURSE LESSON
// ==========================================

export const createLesson = asyncHandler(
  async (req, res) => {
    const result = await lessons.createCourseLesson(
      req.params.courseId,
      req.body,
      req.user
    );

    return send(res, result, 201);
  }
);

// ==========================================
// UPDATE COURSE LESSON
// ==========================================

export const updateLesson = asyncHandler(
  async (req, res) => {
    const result = await lessons.updateCourseLesson(
      req.params.courseId,
      req.params.lessonId,
      req.body,
      req.user
    );

    return send(res, result);
  }
);

// ==========================================
// PUBLISH / UNPUBLISH LESSON
// ==========================================

export const setLessonPublication = asyncHandler(
  async (req, res) => {
    const result =
      await lessons.setCourseLessonPublication(
        req.params.courseId,
        req.params.lessonId,
        req.body.isPublished,
        req.user
      );

    return send(res, result);
  }
);

// ==========================================
// DELETE COURSE LESSON
// ==========================================

export const deleteLesson = asyncHandler(
  async (req, res) => {
    const result = await lessons.deleteCourseLesson(
      req.params.courseId,
      req.params.lessonId,
      req.user
    );

    return send(res, result);
  }
);
