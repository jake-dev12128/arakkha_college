
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

  async uploadVideo(courseId, lessonId, file, onProgress) {
    if (!(file instanceof File)) {
      throw new Error("Select a video file.");
    }

    if (!file.type.startsWith("video/")) {
      throw new Error("Only video files are supported.");
    }

    // Direct Cloudinary upload is limited here to 90 MB.
    // Larger files need a separately implemented chunked flow.
    if (file.size > 90 * 1024 * 1024) {
      throw new Error(
        "Maximum supported video size is 90 MB."
      );
    }

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
      throw new Error("Invalid upload signature response.");
    }

    const form = new FormData();

    form.append("file", file);
    form.append("api_key", upload.apiKey);
    form.append("timestamp", String(upload.timestamp));
    form.append("folder", upload.folder);
    form.append("public_id", upload.public_id);
    form.append("type", upload.type);
    form.append("signature", upload.signature);

    // This request goes directly to Cloudinary.
    // Do not send Clerk Authorization or API headers.
    await axios.post(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(
        upload.cloudName
      )}/video/upload`,
      form,
      {
        timeout: 10 * 60 * 1000,
        onUploadProgress: (event) => {
          if (!event.total) return;

          onProgress?.(
            Math.min(
              100,
              Math.round(
                (event.loaded / event.total) * 100
              )
            )
          );
        },
      }
    );

    // Backend independently verifies Cloudinary resource.
    return unwrap(
      await api.post(
        `${videoUrl(courseId, lessonId)}/complete`,
        { intent },
        { timeout: 60000 }
      )
    );
  },

  // Requires Phase 14.7 backend integration.
  async listAccessible(courseId) {
    return unwrap(
      await api.get(
        `/my/courses/${validId(courseId)}/lessons`
      )
    );
  },

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
