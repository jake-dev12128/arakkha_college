
import api from "../api/api.js";

// ==================================================
// HELPERS
// ==================================================

const getProfileResource = (role) => {
  if (role === "student") {
    return "students";
  }

  if (role === "teacher") {
    return "teachers";
  }

  throw new Error(
    "Invalid profile role. Expected student or teacher."
  );
};

const encodeId = (id) => {
  if (
    typeof id !== "string" ||
    !id.trim()
  ) {
    throw new Error("A valid ID is required.");
  }

  return encodeURIComponent(id.trim());
};

// ==================================================
// DASHBOARD SERVICE
// ==================================================

export const dashboardService = {
  // ==================================================
  // DASHBOARD STATISTICS
  // ==================================================

  async getAdminStats(signal) {
    const response = await api.get(
      "/admin/dashboard/stats",
      { signal }
    );

    return response.data.data.stats;
  },

  // ==================================================
  // USER MANAGEMENT — LIST USERS
  // ==================================================

  async getUsers(params = {}, signal) {
    const response = await api.get(
      "/admin/users",
      {
        params,
        signal,
      }
    );

    return response.data.data;
  },

  // ==================================================
  // USER MANAGEMENT — GET USER
  // ==================================================

  async getUser(userId, signal) {
    const response = await api.get(
      `/admin/users/${encodeId(userId)}`,
      { signal }
    );

    return response.data.data.user;
  },

  // ==================================================
  // USER MANAGEMENT — CREATE USER
  // ==================================================

  async createUser(payload) {
    const response = await api.post(
      "/admin/users",
      payload
    );

    return response.data.data.user;
  },

  // ==================================================
  // USER MANAGEMENT — UPDATE USER
  //
  // Currently supported:
  // - firstName
  // - lastName
  //
  // Email updates require a separate
  // Clerk identity verification flow.
  // ==================================================

  async updateUser(userId, payload) {
    const response = await api.patch(
      `/admin/users/${encodeId(userId)}`,
      payload
    );

    return response.data.data.user;
  },

  // ==================================================
  // USER MANAGEMENT — DEACTIVATE USER
  // ==================================================

  async deactivateUser(userId, reason) {
    const response = await api.patch(
      `/admin/users/${encodeId(userId)}/deactivate`,
      { reason }
    );

    return response.data.data.user;
  },

  // ==================================================
  // USER MANAGEMENT — REACTIVATE USER
  // ==================================================

  async reactivateUser(userId, reason = undefined) {
    const payload = reason
      ? { reason }
      : {};

    const response = await api.patch(
      `/admin/users/${encodeId(userId)}/reactivate`,
      payload
    );

    return response.data.data.user;
  },

  // ==================================================
  // USER MANAGEMENT — PERMANENT DELETE USER
  //
  // Only super_admin can perform this action.
  //
  // The backend must verify all dependencies
  // before allowing permanent deletion.
  // ==================================================

  async permanentlyDeleteUser(
    userId,
    reason,
    confirmation
  ) {
    const response = await api.delete(
      `/admin/users/${encodeId(userId)}`,
      {
        data: {
          reason,
          confirmation,
        },
      }
    );

    return response.data.data;
  },

  // ==================================================
  // STUDENT / TEACHER PROFILE MANAGEMENT
  // ==================================================

  // ==================================================
  // LIST PROFILES
  // ==================================================

  async getProfiles(role, params = {}, signal) {
    const resource = getProfileResource(role);

    const response = await api.get(
      `/admin/${resource}`,
      {
        params,
        signal,
      }
    );

    return response.data.data;
  },

  // ==================================================
  // GET PROFILE BY PROFILE ID
  // ==================================================

  async getProfile(role, profileId, signal) {
    const resource = getProfileResource(role);

    const response = await api.get(
      `/admin/${resource}/${encodeId(profileId)}`,
      { signal }
    );

    return response.data.data;
  },

  // ==================================================
  // GET PROFILE BY USER ID
  // ==================================================

  async getProfileByUserId(role, userId, signal) {
    const resource = getProfileResource(role);

    const response = await api.get(
      `/admin/${resource}/by-user/${encodeId(userId)}`,
      { signal }
    );

    return response.data.data;
  },

  // ==================================================
  // UPDATE STUDENT / TEACHER PROFILE
  // ==================================================

  async updateProfile(role, profileId, payload) {
    const resource = getProfileResource(role);

    const response = await api.patch(
      `/admin/${resource}/${encodeId(profileId)}`,
      payload
    );

    return response.data.data;
  },

  // ==================================================
  // DEACTIVATE STUDENT / TEACHER PROFILE
  // ==================================================

  async deactivateProfile(role, profileId) {
    const resource = getProfileResource(role);

    const response = await api.patch(
      `/admin/${resource}/${encodeId(profileId)}/deactivate`
    );

    return response.data.data;
  },
};

export default dashboardService;
