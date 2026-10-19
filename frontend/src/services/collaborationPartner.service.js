
import api from "../api/api.js";

const unwrap = (response) => response.data.data;

export const collaborationPartnerService = {
  async getAll() {
    return unwrap(await api.get("/admin/collaborations"));
  },

  async getById(id) {
    return unwrap(
      await api.get(`/admin/collaborations/${id}`)
    );
  },

  async create(payload) {
    return unwrap(
      await api.post("/admin/collaborations", payload)
    );
  },

  async update(id, payload) {
    return unwrap(
      await api.patch(
        `/admin/collaborations/${id}`,
        payload
      )
    );
  },

  async setPublication(id, isPublished) {
    return unwrap(
      await api.patch(
        `/admin/collaborations/${id}/publication`,
        { isPublished }
      )
    );
  },

  async remove(id) {
    return unwrap(
      await api.delete(`/admin/collaborations/${id}`)
    );
  },

  async getPublic(config = {}) {
    return unwrap(
      await api.get("/public/collaborations", config)
    );
  },

  async getPublicById(id, config = {}) {
    return unwrap(
      await api.get(`/public/collaborations/${id}`, config)
    );
  },
};
