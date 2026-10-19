
import api from "../api/api.js";

const unwrap = (response) => response.data.data;

export const facultyMemberService = {
  // ==================================================
  // ADMIN / SUPER ADMIN
  // ==================================================

  async getAll() {
    return unwrap(
      await api.get("/admin/faculty-members")
    );
  },

  async getById(id) {
    return unwrap(
      await api.get(`/admin/faculty-members/${id}`)
    );
  },

  async create(payload) {
    return unwrap(
      await api.post(
        "/admin/faculty-members",
        payload
      )
    );
  },

  async update(id, payload) {
    return unwrap(
      await api.patch(
        `/admin/faculty-members/${id}`,
        payload
      )
    );
  },

  async setPublication(id, isPublished) {
    return unwrap(
      await api.patch(
        `/admin/faculty-members/${id}/publication`,
        { isPublished }
      )
    );
  },

  async remove(id) {
    return unwrap(
      await api.delete(
        `/admin/faculty-members/${id}`
      )
    );
  },

  // ==================================================
  // PUBLIC
  // ==================================================

  async getPublic(config = {}) {
    return unwrap(
      await api.get(
        "/public/faculty-members",
        config
      )
    );
  },

  async getPublicById(id, config = {}) {
    return unwrap(
      await api.get(
        `/public/faculty-members/${id}`,
        config
      )
    );
  },
};
