
import mongoose from "mongoose";

import Course from "../models/course.model.js";
import CourseLesson from "../models/courseLesson.model.js";
import AppError from "../utils/AppError.js";

const fail = (message, status = 409, code = "COURSE_LESSON_ERROR") => {
  throw new AppError(message, status, code);
};

const requireCourse = async (courseId, session = null) => {
  const query = Course.findById(courseId);
  if (session) query.session(session);

  const course = await query;

  if (!course) {
    fail("Course not found.", 404, "COURSE_NOT_FOUND");
  }

  return course;
};

export const listCourseLessons = async (
  courseId,
  { page = 1, limit = 20 } = {}
) => {
  await requireCourse(courseId);

  const skip = (page - 1) * limit;

  const [lessons, total] = await Promise.all([
    CourseLesson.find({ courseId })
      .sort({ order: 1, _id: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    CourseLesson.countDocuments({ courseId }),
  ]);

  return {
    lessons,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const createCourseLesson = async (courseId, data) => {
  let created;

  await mongoose.connection.transaction(async (session) => {
    const course = await requireCourse(courseId, session);

    if (!course.isActive) {
      fail("Archived course cannot be modified.");
    }

    const existing = await CourseLesson.exists({
      courseId,
      order: data.order,
    }).session(session);

    if (existing) {
      fail("Lesson order is already in use.", 409, "LESSON_ORDER_CONFLICT");
    }

    const [lesson] = await CourseLesson.create(
      [{
        courseId,
        title: data.title,
        description: data.description,
        order: data.order,
        isPublished: false,
      }],
      { session }
    );

    created = lesson;
  });

  return created;
};

export const updateCourseLesson = async (
  courseId,
  lessonId,
  data
) => {
  let updated;

  await mongoose.connection.transaction(async (session) => {
    const course = await requireCourse(courseId, session);

    if (!course.isActive) {
      fail("Archived course cannot be modified.");
    }

    const lesson = await CourseLesson.findOne({
      _id: lessonId,
      courseId,
    }).session(session);

    if (!lesson) {
      fail("Lesson not found.", 404, "LESSON_NOT_FOUND");
    }

    if (data.order !== undefined && data.order !== lesson.order) {
      const conflict = await CourseLesson.exists({
        courseId,
        order: data.order,
        _id: { $ne: lessonId },
      }).session(session);

      if (conflict) {
        fail("Lesson order is already in use.", 409, "LESSON_ORDER_CONFLICT");
      }
    }

    Object.assign(lesson, data);

    await lesson.save({ session });
    updated = lesson;
  });

  return updated;
};

export const setCourseLessonPublication = async (
  courseId,
  lessonId,
  isPublished
) => {
  let updated;

  await mongoose.connection.transaction(async (session) => {
    const course = await requireCourse(courseId, session);

    if (!course.isActive) {
      fail("Archived course cannot be modified.");
    }

    const lesson = await CourseLesson.findOne({
      _id: lessonId,
      courseId,
    }).session(session);

    if (!lesson) {
      fail("Lesson not found.", 404, "LESSON_NOT_FOUND");
    }

    if (isPublished && !lesson.videoMediaId) {
      fail(
        "Upload and attach a video before publishing.",
        409,
        "LESSON_VIDEO_REQUIRED"
      );
    }

    lesson.isPublished = isPublished;
    await lesson.save({ session });

    updated = lesson;
  });

  return updated;
};

export const deleteCourseLesson = async (
  courseId,
  lessonId
) => {
  await mongoose.connection.transaction(async (session) => {
    const course = await requireCourse(courseId, session);

    if (!course.isActive) {
      fail("Archived course cannot be modified.");
    }

    const lesson = await CourseLesson.findOne({
      _id: lessonId,
      courseId,
    }).session(session);

    if (!lesson) {
      fail("Lesson not found.", 404, "LESSON_NOT_FOUND");
    }

    // Do not delete a lesson while its video is attached.
    // A separate verified detach operation must first
    // schedule the video for safe Cloudinary cleanup.
    if (lesson.videoMediaId) {
      fail(
        "Detach the lesson video before deleting this lesson.",
        409,
        "LESSON_VIDEO_ATTACHED"
      );
    }

    await lesson.deleteOne({ session });
  });

  return { deleted: true };
};
