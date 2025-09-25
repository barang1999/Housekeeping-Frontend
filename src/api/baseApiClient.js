// src/api/baseApiClient.js

// Use the environment variable provided by Netlify/production.
// Falls back to local dev server if not set.
const DEFAULT_BASE = "http://localhost:3001";

const rawBaseUrl =
  process.env.REACT_APP_API_BASE_URL ||
  process.env.REACT_APP_API_URL ||
  DEFAULT_BASE;

const sanitizeBaseUrl = (value) => {
  if (!value) return "";

  const trimmed = value.trim();
  if (!trimmed) return "";

  // Preserve absolute URLs with protocol, add https:// if missing, otherwise
  // allow relative paths for setups that rely on proxy rewrites.
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/+$/, "");
  }

  if (trimmed.startsWith("/")) {
    return trimmed.replace(/\/+$/, "");
  }

  return `https://${trimmed.replace(/\/+$/, "")}`;
};

export const apiBaseUrl = sanitizeBaseUrl(rawBaseUrl) || DEFAULT_BASE;

// Helper to safely build API URLs
export const api = (path) =>
  `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;

export default apiBaseUrl;
