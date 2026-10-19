
import axios from "axios";

const apiBaseUrl = import.meta.env.VITE_API_URL?.trim();

if (!apiBaseUrl) {
  throw new Error("Missing VITE_API_URL");
}

// ==================================================
// CLERK TOKEN PROVIDER
// ==================================================

let tokenProvider = null;

export const configureApiAuth = (getToken) => {
  tokenProvider = getToken;
};

// ==================================================
// AXIOS INSTANCE
// ==================================================

const api = axios.create({
  baseURL: apiBaseUrl,

  headers: {
    "Content-Type": "application/json",
  },

  timeout: 15000,
});

// ==================================================
// REQUEST INTERCEPTOR
// ==================================================

api.interceptors.request.use(async (config) => {
  if (tokenProvider) {
    const token = await tokenProvider();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }
  }

  if (
    typeof crypto !== "undefined" &&
    crypto.randomUUID
  ) {
    config.headers["X-Client-Request-Id"] =
      crypto.randomUUID();
  }

  return config;
});

// ==================================================
// RESPONSE INTERCEPTOR
// ==================================================

api.interceptors.response.use(
  (response) => response,

  (error) => {
    // Never automatically sign out Clerk on HTTP 401.
    // The calling component handles authentication errors.
    return Promise.reject(error);
  },
);

export default api;
