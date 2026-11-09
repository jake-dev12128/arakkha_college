
import crypto from "node:crypto";
import mongoose from "mongoose";

import cloudinary from "../config/cloudinary.js";
import Course from "../models/course.model.js";
import CourseLesson from "../models/courseLesson.model.js";
import MediaAsset from "../models/mediaAsset.model.js";
import AppError from "../utils/AppError.js";
import CourseAssignment from "../models/courseAssignment.model.js";
import ProgramEnrollment from "../models/programEnrollment.model.js";
import Cohort from "../models/cohort.model.js";
import Student from "../models/student.model.js";
import Teacher from "../models/teacher.model.js";
const fail = (message, status = 409, code = "COURSE_VIDEO_ERROR") => {
  throw new AppError(message, status, code);
};

const UPLOAD_TTL_SECONDS = 15 * 60;
const MAX_VIDEO_BYTES = 500 * 1024 * 1024;

const signingSecret = () => {
  const secret = cloudinary.config().api_secret;
  if (!secret) {
    throw new Error("Cloudinary signing secret is missing.");
  }
  return secret;
};

const signIntent = (payload) =>
  crypto
    .createHmac("sha256", signingSecret())
    .update(payload)
    .digest("hex");

const encodeIntent = (data) => {
  const payload = Buffer.from(
    JSON.stringify(data)
  ).toString("base64url");

  return `${payload}.${signIntent(payload)}`;
};

const decodeIntent = (token) => {
  if (typeof token !== "string" || token.length > 4096) {
    fail("Invalid upload intent.", 400, "INVALID_UPLOAD_INTENT");
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    fail("Invalid upload intent.", 400, "INVALID_UPLOAD_INTENT");
  }

  const [payload, signature] = parts;

  if (!/^[a-f0-9]{64}$/.test(signature)) {
    fail("Invalid upload signature.", 403, "INVALID_UPLOAD_SIGNATURE");
  }

  const actual = Buffer.from(signature, "hex");
  const expected = Buffer.from(signIntent(payload), "hex");

  if (
    actual.length !== expected.length ||
    !crypto.timingSafeEqual(actual, expected)
  ) {
    fail("Invalid upload signature.", 403, "INVALID_UPLOAD_SIGNATURE");
  }

  let data;

  try {
    data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );
  } catch {
    fail("Invalid upload intent.", 400, "INVALID_UPLOAD_INTENT");
  }

  if (
    !data ||
    typeof data !== "object" ||
    !Number.isSafeInteger(data.expiresAt) ||
    Date.now() > data.expiresAt
  ) {
    fail("Upload intent expired or invalid.", 403, "UPLOAD_INTENT_EXPIRED");
  }

  return data;
};

// Existing Cloudinary signature pattern retained.
export const createVideoSignature = (courseId) => {
  const timestamp = Math.floor(Date.now() / 1000);

  const params = {
    timestamp,
    folder: `acc/courses/videos/${courseId}`,
    public_id: crypto.randomUUID(),
    type: "authenticated",
  };

  const signature = cloudinary.utils.api_sign_request(
    params,
    signingSecret()
  );

  return {
    ...params,
    signature,
    cloudName: cloudinary.config().cloud_name,
    apiKey: cloudinary.config().api_key,
  };
};

// Generate a signature for one specific lesson and uploader.
export const issueLessonVideoUpload = async (
  courseId,
  lessonId,
  actorId
) => {
  if (
    !mongoose.isObjectIdOrHexString(courseId) ||
    !mongoose.isObjectIdOrHexString(lessonId) ||
    !mongoose.isObjectIdOrHexString(actorId)
  ) {
    fail("Invalid resource ID.", 400, "INVALID_ID");
  }

  const course = await Course.findById(courseId).lean();

  if (!course) {
    fail("Course not found.", 404, "COURSE_NOT_FOUND");
  }

  if (!course.isActive) {
    fail("Archived course cannot be modified.");
  }

  const lesson = await CourseLesson.findOne({
    _id: lessonId,
    courseId,
  }).lean();

  if (!lesson) {
    fail("Lesson not found.", 404, "LESSON_NOT_FOUND");
  }

  const upload = createVideoSignature(courseId);

  const publicId = `${upload.folder}/${upload.public_id}`;

  const intent = encodeIntent({
    courseId: String(courseId),
    lessonId: String(lessonId),
    actorId: String(actorId),
    publicId,
    issuedAt: Date.now(),
    expiresAt: Date.now() + UPLOAD_TTL_SECONDS * 1000,
  });

  return {
    upload,
    intent,
    expiresInSeconds: UPLOAD_TTL_SECONDS,
  };
};

const verifyUploadedVideo = async (publicId, issuedAt) => {
  let resource;

  try {
    resource = await cloudinary.api.resource(publicId, {
      resource_type: "video",
      type: "authenticated",
    });
  } catch {
    fail(
      "Uploaded video could not be verified.",
      422,
      "VIDEO_VERIFICATION_FAILED"
    );
  }

  if (
    resource.public_id !== publicId ||
    resource.resource_type !== "video" ||
    resource.type !== "authenticated" ||
    !resource.secure_url ||
    !Number.isFinite(resource.bytes) ||
    resource.bytes <= 0 ||
    resource.bytes > MAX_VIDEO_BYTES
  ) {
    fail(
      "Video resource failed validation.",
      422,
      "INVALID_VIDEO_RESOURCE"
    );
  }

  const uploadedAt = Date.parse(resource.created_at);

  if (
    !Number.isFinite(uploadedAt) ||
    uploadedAt < issuedAt - 60_000 ||
    uploadedAt > Date.now() + 60_000
  ) {
    fail(
      "Video upload timestamp is invalid.",
      422,
      "VIDEO_UPLOAD_TIME_INVALID"
    );
  }

  return resource;
};

export const completeLessonVideoUpload = async ({
  courseId,
  lessonId,
  actorId,
  intent,
}) => {
  const verifiedIntent = decodeIntent(intent);

  if (
    verifiedIntent.courseId !== String(courseId) ||
    verifiedIntent.lessonId !== String(lessonId) ||
    verifiedIntent.actorId !== String(actorId)
  ) {
    fail(
      "Upload intent does not belong to this request.",
      403,
      "UPLOAD_INTENT_MISMATCH"
    );
  }

  const expectedPrefix = `acc/courses/videos/${courseId}/`;

  if (
    typeof verifiedIntent.publicId !== "string" ||
    !verifiedIntent.publicId.startsWith(expectedPrefix)
  ) {
    fail("Invalid video location.", 403, "INVALID_VIDEO_LOCATION");
  }

  // Verify with Cloudinary, not with client-provided metadata.
  const resource = await verifyUploadedVideo(
    verifiedIntent.publicId,
    verifiedIntent.issuedAt
  );

  let result;

  await mongoose.connection.transaction(async (session) => {
    const course = await Course.findById(courseId).session(session);

    if (!course) {
      fail("Course not found.", 404, "COURSE_NOT_FOUND");
    }

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

    // A replacement must first detach the previous video.
    if (lesson.videoMediaId) {
      fail(
        "Detach the current video before attaching another.",
        409,
        "LESSON_VIDEO_ALREADY_ATTACHED"
      );
    }

    const existing = await MediaAsset.exists({
      publicId: resource.public_id,
    }).session(session);

    if (existing) {
      fail(
        "This video has already been registered.",
        409,
        "VIDEO_ALREADY_REGISTERED"
      );
    }

    const [media] = await MediaAsset.create(
      [{
        publicId: resource.public_id,
        resourceType: "video",
        secureUrl: resource.secure_url,
        category: "course-videos",
        bytes: resource.bytes,
        width: resource.width,
        height: resource.height,
        duration: resource.duration,
        format: resource.format,
        uploadedBy: actorId,
        status: "attached",
        attachedTo: {
          model: "CourseLesson",
          documentId: lesson._id,
        },
      }],
      { session }
    );

    lesson.videoMediaId = media._id;

    // Upload completion does not automatically publish a lesson.
    lesson.isPublished = false;

    await lesson.save({ session });

    result = {
      lessonId: lesson._id,
      mediaId: media._id,
      duration: media.duration,
      bytes: media.bytes,
      format: media.format,
      isPublished: lesson.isPublished,
    };
  });

  return result;
};

// Unpublish and schedule cleanup of an attached video.
export const detachLessonVideo = async ({
  courseId,
  lessonId,
}) => {
  let result;

  await mongoose.connection.transaction(async (session) => {
    const course = await Course.findById(courseId).session(session);

    if (!course) {
      fail("Course not found.", 404, "COURSE_NOT_FOUND");
    }

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

    if (!lesson.videoMediaId) {
      result = {
        detached: false,
        lessonId: lesson._id,
      };
      return;
    }

    const now = new Date();

    const update = await MediaAsset.updateOne(
      {
        _id: lesson.videoMediaId,
        category: "course-videos",
        resourceType: "video",
        status: "attached",
        "attachedTo.model": "CourseLesson",
        "attachedTo.documentId": lesson._id,
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

    if (update.matchedCount !== 1) {
      fail(
        "Video attachment state conflict.",
        409,
        "VIDEO_DETACH_CONFLICT"
      );
    }

    lesson.videoMediaId = null;
    lesson.isPublished = false;

    await lesson.save({ session });

    result = {
      detached: true,
      lessonId: lesson._id,
    };
  });

  return result;
};



const PLAYBACK_TTL_SECONDS = 300;

const isAdministrator = (role) =>
  role === "super_admin" || role === "admin";

// ==========================================
// VERIFY COURSE PLAYBACK ACCESS
// ==========================================

export const verifyCoursePlaybackAccess = async (
  courseId,
  user
) => {
  if (!mongoose.isObjectIdOrHexString(courseId)) {
    fail("Invalid course ID.", 400, "INVALID_COURSE_ID");
  }

  if (!user?._id || !user.isActive) {
    fail(
      "Authentication required.",
      401,
      "AUTHENTICATION_REQUIRED"
    );
  }

  const course = await Course.findById(courseId)
    .select("_id isActive")
    .lean();

  if (!course) {
    fail("Course not found.", 404, "COURSE_NOT_FOUND");
  }

  if (isAdministrator(user.role)) {
    return {
      courseId: course._id,
      role: user.role,
      canPreviewDraft: true,
    };
  }

  if (!course.isActive) {
    fail("Course is unavailable.", 403, "COURSE_INACTIVE");
  }

  // ========================================
  // TEACHER
  // ========================================

  if (user.role === "teacher") {
    const teacher = await Teacher.findOne({
      userId: user._id,
    })
      .select("_id")
      .lean();

    if (!teacher) {
      fail("Teacher profile not found.");
    }

    const assignments = await CourseAssignment.find({
      course: course._id,
      teacher: teacher._id,
      isActive: true,
    })
      .select("cohort")
      .lean();

    if (!assignments.length) {
      fail("You are not assigned to this course.");
    }

    const activeCohort = await Cohort.exists({
      _id: {
        $in: assignments.map((item) => item.cohort),
      },
      status: "active",
    });

    if (!activeCohort) {
      fail("No active cohort assignment exists.");
    }

    return {
      courseId: course._id,
      role: "teacher",
      canPreviewDraft: false,
    };
  }

  // ========================================
  // STUDENT
  // ========================================

  if (user.role === "student") {
    const student = await Student.findOne({
      userId: user._id,
    })
      .select("_id")
      .lean();

    if (!student) {
      fail("Student profile not found.");
    }

    const assignments = await CourseAssignment.find({
      course: course._id,
      students: student._id,
      isActive: true,
    })
      .select("cohort")
      .lean();

    if (!assignments.length) {
      fail("You are not assigned to this course.");
    }

    const cohortIds = assignments.map(
      (assignment) => assignment.cohort
    );

    const enrollments = await ProgramEnrollment.find({
      student: student._id,
      cohort: { $in: cohortIds },
      status: "active",
    })
      .select("cohort program")
      .lean();

    if (!enrollments.length) {
      fail("Active enrollment is required.");
    }

    const validPairs = enrollments.map((enrollment) => ({
      _id: enrollment.cohort,
      program: enrollment.program,
    }));

    const activeCohort = await Cohort.exists({
      status: "active",
      $or: validPairs,
    });

    if (!activeCohort) {
      fail("An active matching cohort is required.");
    }

    return {
      courseId: course._id,
      role: "student",
      canPreviewDraft: false,
    };
  }

  fail("Course access denied.");
};

// ==========================================
// LIST ACCESSIBLE COURSE LESSONS
// ==========================================

export const getAccessibleCourseLessons = async (
  courseId,
  user
) => {
  const access = await verifyCoursePlaybackAccess(
    courseId,
    user
  );

  const filter = {
    courseId: access.courseId,
  };

  if (!access.canPreviewDraft) {
    filter.isPublished = true;
    filter.videoMediaId = { $ne: null };
  }

  const lessons = await CourseLesson.find(filter)
    .select(
      "_id courseId title description order isPublished videoMediaId"
    )
    .sort({ order: 1, _id: 1 })
    .lean();

  return lessons.map((lesson) => ({
    id: lesson._id,
    courseId: lesson.courseId,
    title: lesson.title,
    description: lesson.description,
    order: lesson.order,
    isPublished: lesson.isPublished,
    hasVideo: Boolean(lesson.videoMediaId),
  }));
};

// ==========================================
// SECURE VIDEO PLAYBACK
// ==========================================

export const getCourseLessonPlayback = async ({
  courseId,
  lessonId,
  user,
}) => {
  if (!mongoose.isObjectIdOrHexString(lessonId)) {
    fail("Invalid lesson ID.", 400, "INVALID_LESSON_ID");
  }

  const access = await verifyCoursePlaybackAccess(
    courseId,
    user
  );

  const lessonFilter = {
    _id: lessonId,
    courseId: access.courseId,
  };

  if (!access.canPreviewDraft) {
    lessonFilter.isPublished = true;
  }

  const lesson = await CourseLesson.findOne(lessonFilter)
    .select("_id title videoMediaId")
    .lean();

  if (!lesson) {
    fail("Lesson not found.", 404, "LESSON_NOT_FOUND");
  }

  if (!lesson.videoMediaId) {
    fail(
      "No video is attached to this lesson.",
      404,
      "LESSON_VIDEO_NOT_FOUND"
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
    .select("publicId format duration")
    .lean();

  if (!media) {
    fail(
      "Lesson video is unavailable.",
      404,
      "LESSON_VIDEO_UNAVAILABLE"
    );
  }

  if (!media.format) {
    fail(
      "Video format is unavailable.",
      409,
      "VIDEO_FORMAT_MISSING"
    );
  }

  const expiresAt =
    Math.floor(Date.now() / 1000) +
    PLAYBACK_TTL_SECONDS;

  const playbackUrl =
    cloudinary.utils.private_download_url(
      media.publicId,
      media.format,
      {
        resource_type: "video",
        type: "authenticated",
        attachment: false,
        expires_at: expiresAt,
      }
    );

  return {
    lessonId: lesson._id,
    title: lesson.title,
    playbackUrl,
    expiresAt,
    expiresInSeconds: PLAYBACK_TTL_SECONDS,
    duration: media.duration ?? null,
  };
};
