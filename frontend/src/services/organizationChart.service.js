
import api from "../api/api.js";
import { mediaService } from "./media.service.js";

// ==========================================
// RESPONSE HELPERS
// ==========================================

const unwrap = (response) => response.data.data;

const unwrapChart = (response) => {
  return unwrap(response)?.chart ?? null;
};

// ==========================================
// ORGANIZATION CHART SERVICE
// ==========================================

export const organizationChartService = {
  // ========================================
  // PUBLIC
  // No authentication required on backend
  // ========================================

  async getPublic(config = {}) {
    const response = await api.get(
      "/public/organization-chart",
      config
    );

    return unwrapChart(response);
  },

  // ========================================
  // ADMIN / TEACHER READ-ONLY
  // ========================================

  async getAdmin(config = {}) {
    const response = await api.get(
      "/admin/organization-chart",
      config
    );

    return unwrapChart(response);
  },

  // ========================================
  // ADMIN / SUPER ADMIN
  // CREATE
  // ========================================

  async create(payload) {
    const response = await api.post(
      "/admin/organization-chart",
      payload
    );

    return unwrapChart(response);
  },

  // ========================================
  // ADMIN / SUPER ADMIN
  // UPDATE DRAFT
  // ========================================

  async update(payload) {
    const response = await api.put(
      "/admin/organization-chart",
      payload
    );

    return unwrapChart(response);
  },

  // ========================================
  // ADMIN / SUPER ADMIN
  // UPLOAD IMAGE
  // ========================================

  async uploadImage(file) {
    if (!(file instanceof File)) {
      throw new Error(
        "Please select an image file."
      );
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error(
        "Only JPG, PNG and WebP images are allowed."
      );
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      throw new Error(
        "Image size must not exceed 5 MB."
      );
    }

    return mediaService.uploadImage(
      "organization-charts",
      file
    );
  },

  // ========================================
  // ADMIN / SUPER ADMIN
  // PUBLISH
  // ========================================

  async publish() {
    const response = await api.patch(
      "/admin/organization-chart/publish",
      {}
    );

    return unwrapChart(response);
  },

  // ========================================
  // ADMIN / SUPER ADMIN
  // UNPUBLISH
  // ========================================

  async unpublish() {
    const response = await api.patch(
      "/admin/organization-chart/unpublish",
      {}
    );

    return unwrapChart(response);
  },

  // ========================================
  // ADMIN / SUPER ADMIN
  // REMOVE DRAFT IMAGE
  // ========================================

  async removeDraftImage() {
    const response = await api.delete(
      "/admin/organization-chart/draft-image"
    );

    return unwrapChart(response);
  },
};

export default organizationChartService;
