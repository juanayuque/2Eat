// src/config/api.ts
// Centralises the API base so web/native can switch via env without code changes.
// Uses EXPO_PUBLIC_ so the value is embedded at build time for web & native.
export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE ?? "/api"; // fallback keeps same-origin on web if you proxy /api
