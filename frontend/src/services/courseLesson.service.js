
import axios from "axios";
import api from "../api/api.js";

const BASE = "/admin/courses";

const validId = (id) => {
  if (!/^[a-f0-9]{24}$/i.test(String(id))) {
    throw new Error("Invalid resource ID.");
  }
  return String(id);
};

const lessonUrl = (courseId) =>
  `${BASE}/${validId(courseId)}/lessons`;

const videoUrl = (courseId, lessonId) =>
  `${lessonUrl(courseId)}/${validId(lessonId)}/video`;

const unwrap = (response) => response.data.data;

export const courseLessonService = {
  async list(courseId, params = {}) {
    return unwrap(
      await api.get(lessonUrl(courseId), { params })
    );
  },

  async create(courseId, payload) {
    return unwrap(
      await api.post(lessonUrl(courseId), payload)
    );
  },

  async update(courseId, lessonId, payload) {
    return unwrap(
      await api.patch(
        `${lessonUrl(courseId)}/${validId(lessonId)}`,
        payload
      )
    );
  },

  async setPublication(courseId, lessonId, isPublished) {
    return unwrap(
      await api.patch(
        `${lessonUrl(courseId)}/${validId(lessonId)}/publication`,
        { isPublished }
      )
    );
  },

  async remove(courseId, lessonId) {
    return unwrap(
      await api.delete(
        `${lessonUrl(courseId)}/${validId(lessonId)}`
      )
    );
  },

  async detachVideo(courseId, lessonId) {
    return unwrap(
      await api.delete(videoUrl(courseId, lessonId))
    );
  },

  async uploadVideo(
    courseId,
    lessonId,
    file,
    onProgress,
    onStageChange
  ) {
    if (!(file instanceof File)) {
      throw new Error("Select a video file.");
    }

    if (
      !file.type.startsWith("video/") ||
      file.size === 0
    ) {
      throw new Error("Only video files are supported.");
    }

    // Direct Cloudinary upload is limited to 90 MB.
    // Larger files require a chunked upload flow.
    if (file.size > 90 * 1024 * 1024) {
      throw new Error(
        "Maximum supported video size is 90 MB."
      );
    }

    // ==========================================
    // STEP 1: REQUEST SIGNATURE
    // ==========================================

    onStageChange?.("signing");

    const signed = unwrap(
      await api.post(
        `${videoUrl(courseId, lessonId)}/signature`
      )
    );

    const { upload, intent } = signed;

    if (
      !upload?.cloudName ||
      !upload?.apiKey ||
      !upload?.signature ||
      !intent
    ) {
      throw new Error(
        "Invalid upload signature response."
      );
    }

    // ==========================================
    // STEP 2: PREPARE CLOUDINARY FORM
    // ==========================================

    const form = new FormData();

    form.append("file", file);
    form.append("api_key", upload.apiKey);
    form.append(
      "timestamp",
      String(upload.timestamp)
    );
    form.append("folder", upload.folder);
    form.append("public_id", upload.public_id);
    form.append("type", upload.type);
    form.append("signature", upload.signature);

    // ==========================================
    // STEP 3: DIRECT CLOUDINARY UPLOAD
    // ==========================================

    // Do not send Clerk Authorization headers.
    onStageChange?.("uploading");

    await axios.post(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(
        upload.cloudName
      )}/video/upload`,
      form,
      {
        timeout: 10 * 60 * 1000,

        onUploadProgress: (event) => {
          if (!event.total) return;

          const percentage = Math.min(
            100,
            Math.round(
              (event.loaded / event.total) * 100
            )
          );

          onProgress?.(percentage);
        },
      }
    );

    // ==========================================
    // STEP 4: BACKEND VIDEO VERIFICATION
    // ==========================================

    onProgress?.(100);
    onStageChange?.("verifying");

    // Backend independently verifies the
    // uploaded Cloudinary resource.
    return unwrap(
      await api.post(
        `${videoUrl(courseId, lessonId)}/complete`,
        { intent },
        { timeout: 60000 }
      )
    );
  },

  // ==========================================
  // ACCESSIBLE LESSONS
  // ==========================================

  async listAccessible(courseId) {
    return unwrap(
      await api.get(
        `/my/courses/${validId(courseId)}/lessons`
      )
    );
  },

  // ==========================================
  // SECURE VIDEO PLAYBACK
  // ==========================================

  async getPlayback(courseId, lessonId) {
    return unwrap(
      await api.get(
        `/my/courses/${validId(courseId)}/lessons/${validId(
          lessonId
        )}/playback`
      )
    );
  },
};
