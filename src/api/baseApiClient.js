// src/api/baseApiClient.js

// Use the environment variable provided by Netlify/production.
// Falls back to local dev server if not set.
const DEFAULT_BASE =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:3001";

export const apiBaseUrl = DEFAULT_BASE.replace(/\/+$/, ""); // trim trailing slash

// Helper to safely build API URLs
export const api = (path) =>
  `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;

export default apiBaseUrl;