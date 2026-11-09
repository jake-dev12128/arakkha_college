
import api from "../api/api.js";

export const mediaService = {
  // ==========================================
  // CLOUDINARY IMAGE UPLOAD
  // ==========================================

  async uploadImage(category, file) {
    const formData = new FormData();
    formData.append("image", file);

    const response = await api.post(
      `/admin/images/${category}`,
      formData,
      { timeout: 60000 }
    );

    return response.data.data;
  },

  // ==========================================
  // SELF PROFILE IMAGE
  // ==========================================

  async updateMyProfileImage(mediaId) {
    if (!mediaId) {
      throw new Error("Media ID is required.");
    }

    const response = await api.patch(
      "/auth/me/profile-image",
      { mediaId }
    );

    return response.data.data;
  },

  // ==========================================
  // ADMIN-MANAGED STUDENT / TEACHER IMAGE
  // ==========================================

  async updateManagedProfileImage(userId, mediaId) {
    if (!userId) {
      throw new Error("User ID is required.");
    }

    if (mediaId === undefined) {
      throw new Error(
        "Media ID is required. Use null to remove the image."
      );
    }

    const response = await api.patch(
      `/admin/users/${encodeURIComponent(userId)}/profile-image`,
      { mediaId }
    );

    return response.data.data;
  },
};
