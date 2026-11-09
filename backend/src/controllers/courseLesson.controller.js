
import { asyncHandler } from "../utils/asyncHandler.js";

import * as lessons from "../services/courseLesson.service.js";

const send = (res, data, status = 200) =>
  res.status(status).json({
    success: true,
    data,
  });

export const listLessons = asyncHandler(async (req, res) => {
  const result = await lessons.listCourseLessons(
    req.params.courseId,
    req.query
  );

  return send(res, result);
});

export const createLesson = asyncHandler(async (req, res) => {
  const result = await lessons.createCourseLesson(
    req.params.courseId,
    req.body
  );

  return send(res, result, 201);
});

export const updateLesson = asyncHandler(async (req, res) => {
  const result = await lessons.updateCourseLesson(
    req.params.courseId,
    req.params.lessonId,
    req.body
  );

  return send(res, result);
});

export const setLessonPublication = asyncHandler(
  async (req, res) => {
    const result = await lessons.setCourseLessonPublication(
      req.params.courseId,
      req.params.lessonId,
      req.body.isPublished
    );

    return send(res, result);
  }
);

export const deleteLesson = asyncHandler(async (req, res) => {
  const result = await lessons.deleteCourseLesson(
    req.params.courseId,
    req.params.lessonId
  );

  return send(res, result);
});
