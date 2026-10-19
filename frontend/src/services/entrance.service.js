
import api from "../api/api.js";

const BASE = "/admin";
const PUBLIC = "/public";

const unwrap = (response) => response.data.data;

export const entranceService = {
  // Information
  async getInformationList(params = {}) {
    return unwrap(
      await api.get(`${BASE}/entrance-information`, { params })
    );
  },

  async getInformation(id) {
    return unwrap(
      await api.get(`${BASE}/entrance-information/${id}`)
    );
  },

  async createInformation(payload) {
    return unwrap(
      await api.post(`${BASE}/entrance-information`, payload)
    );
  },

  async updateInformation(id, payload) {
    return unwrap(
      await api.patch(`${BASE}/entrance-information/${id}`, payload)
    );
  },

  async publishInformation(id) {
    return unwrap(
      await api.post(`${BASE}/entrance-information/${id}/publish`)
    );
  },

  async archiveInformation(id) {
    return unwrap(
      await api.post(`${BASE}/entrance-information/${id}/archive`)
    );
  },

  // Entrance Lists
  async getEntranceLists(params = {}) {
    return unwrap(
      await api.get(`${BASE}/entrance-lists`, { params })
    );
  },

  async getEntranceList(id) {
    return unwrap(
      await api.get(`${BASE}/entrance-lists/${id}`)
    );
  },

  async createEntranceList(payload) {
    return unwrap(
      await api.post(`${BASE}/entrance-lists`, payload)
    );
  },

  async updateEntranceList(id, payload) {
    return unwrap(
      await api.patch(`${BASE}/entrance-lists/${id}`, payload)
    );
  },

  async publishEntranceList(id) {
    return unwrap(
      await api.post(`${BASE}/entrance-lists/${id}/publish`)
    );
  },

  async archiveEntranceList(id) {
    return unwrap(
      await api.post(`${BASE}/entrance-lists/${id}/archive`)
    );
  },

  // Applicants
  async getApplicants(listId, params = {}) {
    return unwrap(
      await api.get(`${BASE}/entrance-lists/${listId}/applicants`, {
        params,
      })
    );
  },

  async createApplicant(listId, payload) {
    return unwrap(
      await api.post(
        `${BASE}/entrance-lists/${listId}/applicants`,
        payload
      )
    );
  },

  async updateApplicant(listId, applicantId, payload) {
    return unwrap(
      await api.patch(
        `${BASE}/entrance-lists/${listId}/applicants/${applicantId}`,
        payload
      )
    );
  },

  async deleteApplicant(listId, applicantId) {
    return unwrap(
      await api.delete(
        `${BASE}/entrance-lists/${listId}/applicants/${applicantId}`
      )
    );
  },

  // Public
  async getPublicInformation(year) {
    return unwrap(
      await api.get(`${PUBLIC}/entrance-information/${year}`)
    );
  },

  async getPublicApplicants(year, params = {}) {
    return unwrap(
      await api.get(`${PUBLIC}/entrance-students/${year}`, {
        params,
      })
    );
  },
};
