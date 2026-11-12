
import mongoose from "mongoose";

import Course from "../models/course.model.js";
import CourseLesson from "../models/courseLesson.model.js";
import MediaAsset from "../models/mediaAsset.model.js";
import CourseAssignment from "../models/courseAssignment.model.js";
import Teacher from "../models/teacher.model.js";
import AppError from "../utils/AppError.js";

// ==================================================
// ERROR HELPER
// ==================================================

const fail = (
  message,
  status = 409,
  code = "COURSE_LESSON_ERROR"
) => {
  throw new AppError(message, status, code);
};

const isAdmin = (role) =>
  role === "super_admin" || role === "admin";

// ==================================================
// TRANSACTION + DUPLICATE ORDER HANDLING
// ==================================================

const runLessonTransaction = async (operation) => {
  try {
    return await mongoose.connection.transaction(operation);
  } catch (error) {
    const duplicateOrder =
      error?.code === 11000 &&
      (
        error?.keyPattern?.order === 1 ||
        error?.keyValue?.order !== undefined
      );

    if (duplicateOrder) {
      fail(
        "Lesson order is already in use.",
        409,
        "LESSON_ORDER_CONFLICT"
      );
    }

    throw error;
  }
};

// ==================================================
// COURSE VALIDATION
// ==================================================

const requireCourse = async (
  courseId,
  session = null
) => {
  if (!mongoose.isObjectIdOrHexString(courseId)) {
    fail(
      "Invalid course ID.",
      400,
      "INVALID_COURSE_ID"
    );
  }

  const query = Course.findById(courseId);

  if (session) {
    query.session(session);
  }

  const course = await query;

  if (!course) {
    fail(
      "Course not found.",
      404,
      "COURSE_NOT_FOUND"
    );
  }

  return course;
};

// ==================================================
// TEACHER ASSIGNMENT PERMISSION
// ==================================================

export const requireLessonManageAccess = async (
  courseId,
  actor,
  session = null
) => {
  if (!actor?._id || !actor.isActive) {
    fail(
      "Authentication required.",
      401,
      "AUTHENTICATION_REQUIRED"
    );
  }

  const course = await requireCourse(
    courseId,
    session
  );

  if (!course.isActive) {
    fail(
      "Archived course cannot be modified.",
      409,
      "COURSE_INACTIVE"
    );
  }

  if (isAdmin(actor.role)) {
    return course;
  }

  if (actor.role !== "teacher") {
    fail(
      "Lesson management access denied.",
      403,
      "LESSON_ACCESS_DENIED"
    );
  }

  const teacherQuery = Teacher.findOne({
    userId: actor._id,
  }).select("_id");

  if (session) {
    teacherQuery.session(session);
  }

  const teacher = await teacherQuery.lean();

  if (!teacher) {
    fail(
      "Teacher profile not found.",
      403,
      "TEACHER_PROFILE_NOT_FOUND"
    );
  }

  const assignmentQuery = CourseAssignment.exists({
    course: course._id,
    teacher: teacher._id,
    isActive: true,
  });

  if (session) {
    assignmentQuery.session(session);
  }

  const assignment = await assignmentQuery;

  if (!assignment) {
    fail(
      "You are not actively assigned to this course.",
      403,
      "COURSE_ASSIGNMENT_REQUIRED"
    );
  }

  return course;
};

// ==================================================
// LIST LESSONS
// ==================================================

export const listCourseLessons = async (
  courseId,
  { page = 1, limit = 20 } = {},
  actor
) => {
  await requireLessonManageAccess(
    courseId,
    actor
  );

  const safePage = Math.max(
    1,
    Number(page) || 1
  );

  const safeLimit = Math.min(
    100,
    Math.max(1, Number(limit) || 20)
  );

  const skip = (safePage - 1) * safeLimit;

  const [lessons, total] = await Promise.all([
    CourseLesson.find({ courseId })
      .sort({ order: 1, _id: 1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),

    CourseLesson.countDocuments({ courseId }),
  ]);

  return {
    lessons,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};

// ==================================================
// CREATE LESSON
// ==================================================

export const createCourseLesson = async (
  courseId,
  data,
  actor
) => {
  return runLessonTransaction(async (session) => {
    await requireLessonManageAccess(
      courseId,
      actor,
      session
    );

    const existing = await CourseLesson.exists({
      courseId,
      order: data.order,
    }).session(session);

    if (existing) {
      fail(
        "Lesson order is already in use.",
        409,
        "LESSON_ORDER_CONFLICT"
      );
    }

    const [lesson] = await CourseLesson.create(
      [
        {
          courseId,
          title: data.title,
          description: data.description,
          order: data.order,
          isPublished: false,
        },
      ],
      { session }
    );

    return lesson;
  });
};

// ==================================================
// UPDATE LESSON
// ==================================================

export const updateCourseLesson = async (
  courseId,
  lessonId,
  data,
  actor
) => {
  return runLessonTransaction(async (session) => {
    await requireLessonManageAccess(
      courseId,
      actor,
      session
    );

    if (!mongoose.isObjectIdOrHexString(lessonId)) {
      fail(
        "Invalid lesson ID.",
        400,
        "INVALID_LESSON_ID"
      );
    }

    const lesson = await CourseLesson.findOne({
      _id: lessonId,
      courseId,
    }).session(session);

    if (!lesson) {
      fail(
        "Lesson not found.",
        404,
        "LESSON_NOT_FOUND"
      );
    }

    if (
      data.order !== undefined &&
      data.order !== lesson.order
    ) {
      const conflict = await CourseLesson.exists({
        courseId,
        order: data.order,
        _id: { $ne: lessonId },
      }).session(session);

      if (conflict) {
        fail(
          "Lesson order is already in use.",
          409,
          "LESSON_ORDER_CONFLICT"
        );
      }
    }

    // Only editable fields may be changed.
    // Never use Object.assign(lesson, data).

    if (data.title !== undefined) {
      lesson.title = data.title;
    }

    if (data.description !== undefined) {
      lesson.description = data.description;
    }

    if (data.order !== undefined) {
      lesson.order = data.order;
    }

    await lesson.save({ session });

    return lesson;
  });
};

// ==================================================
// PUBLISH / UNPUBLISH LESSON
// ==================================================

export const setCourseLessonPublication = async (
  courseId,
  lessonId,
  isPublished,
  actor
) => {
  return runLessonTransaction(async (session) => {
    await requireLessonManageAccess(
      courseId,
      actor,
      session
    );

    if (!mongoose.isObjectIdOrHexString(lessonId)) {
      fail(
        "Invalid lesson ID.",
        400,
        "INVALID_LESSON_ID"
      );
    }

    const lesson = await CourseLesson.findOne({
      _id: lessonId,
      courseId,
    }).session(session);

    if (!lesson) {
      fail(
        "Lesson not found.",
        404,
        "LESSON_NOT_FOUND"
      );
    }

    // ==========================================
    // VIDEO ATTACHMENT VERIFICATION
    // ==========================================

    if (isPublished) {
      if (!lesson.videoMediaId) {
        fail(
          "Upload and attach a video before publishing.",
          409,
          "LESSON_VIDEO_REQUIRED"
        );
      }

      const media = await MediaAsset.findOne({
        _id: lesson.videoMediaId,
        category: "course-videos",
        resourceType: "video",
        status: "attached",
        cleanupRequestedAt: null,
        "attachedTo.model": "CourseLesson",
        "attachedTo.documentId": lesson._id,
      })
        .select("_id publicId format")
        .session(session)
        .lean();

      if (
        !media ||
        !media.publicId ||
        !media.format
      ) {
        fail(
          "Lesson video attachment is invalid or unavailable.",
          409,
          "LESSON_VIDEO_UNAVAILABLE"
        );
      }
    }

    lesson.isPublished = isPublished;

    await lesson.save({ session });

    return lesson;
  });
};

// ==================================================
// DELETE LESSON
// ==================================================

export const deleteCourseLesson = async (
  courseId,
  lessonId,
  actor
) => {
  return runLessonTransaction(async (session) => {
    await requireLessonManageAccess(
      courseId,
      actor,
      session
    );

    if (!mongoose.isObjectIdOrHexString(lessonId)) {
      fail(
        "Invalid lesson ID.",
        400,
        "INVALID_LESSON_ID"
      );
    }

    const lesson = await CourseLesson.findOne({
      _id: lessonId,
      courseId,
    }).session(session);

    if (!lesson) {
      fail(
        "Lesson not found.",
        404,
        "LESSON_NOT_FOUND"
      );
    }

    if (lesson.videoMediaId) {
      fail(
        "Detach the lesson video before deleting this lesson.",
        409,
        "LESSON_VIDEO_ATTACHED"
      );
    }

    await lesson.deleteOne({ session });

    return {
      deleted: true,
    };
  });
};
