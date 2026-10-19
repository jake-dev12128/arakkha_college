
import api from "../api/api.js";

const unwrap = (response) => response.data.data;

export const aboutService = {
  async getAdmin() {
    return unwrap(await api.get("/admin/about"));
  },

  async save(payload) {
    return unwrap(await api.put("/admin/about", payload));
  },

  async publish() {
    return unwrap(await api.patch("/admin/about/publish"));
  },

  async unpublish() {
    return unwrap(await api.patch("/admin/about/unpublish"));
  },

  async getPublic(config = {}) {
  return unwrap(await api.get("/public/about", config));
},
};
