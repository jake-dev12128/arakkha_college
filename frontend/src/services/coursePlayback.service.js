
import api from "../api/api.js";

// ==========================================
// VALIDATE MONGODB OBJECT ID
// ==========================================

const validId = (value) => {
  const id = String(value ?? "");

  if (!/^[0-9a-f]{24}$/i.test(id)) {
    throw new Error("Invalid resource ID.");
  }

  return id;
};

// ==========================================
// EXTRACT API RESPONSE DATA
// ==========================================

const unwrap = (response) => {
  if (response?.data?.success !== true) {
    throw new Error(
      response?.data?.message || "Request failed."
    );
  }

  return response.data.data;
};

// ==========================================
// COURSE PLAYBACK SERVICE
// ==========================================

export const coursePlaybackService = {
  // GET ACCESSIBLE COURSE LESSONS
  async listAccessible(courseId, signal) {
    return unwrap(
      await api.get(
        `/my/courses/${validId(courseId)}/lessons`,
        { signal }
      )
    );
  },

  // GET SECURE VIDEO PLAYBACK URL
  async getPlayback(courseId, lessonId, signal) {
    return unwrap(
      await api.get(
        `/my/courses/${validId(courseId)}/lessons/${validId(lessonId)}/playback`,
        { signal }
      )
    );
  },
};
