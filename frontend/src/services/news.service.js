
import api from "../api/api.js";

const unwrap = (response) => response.data.data;

export const newsService = {
  async getAll() {
    return unwrap(await api.get("/admin/news"));
  },

  async getById(id) {
    return unwrap(await api.get(`/admin/news/${id}`));
  },

  async create(payload) {
    return unwrap(await api.post("/admin/news", payload));
  },

  async update(id, payload) {
    return unwrap(
      await api.patch(`/admin/news/${id}`, payload)
    );
  },

  async setPublication(id, isPublished) {
    return unwrap(
      await api.patch(`/admin/news/${id}/publication`, {
        isPublished,
      })
    );
  },

  async remove(id) {
    return unwrap(await api.delete(`/admin/news/${id}`));
  },

  async getPublic(config = {}) {
    return unwrap(await api.get("/public/news", config));
  },

  async getPublicById(id, config = {}) {
    return unwrap(
      await api.get(`/public/news/${id}`, config)
    );
  },
};
