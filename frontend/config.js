// config.js
// ⚠️ EDIT THIS after you deploy your backend.
//
// Once your backend is live on Render, paste its URL here, with NO trailing
// slash. Example:
//   const API_BASE_URL = "https://grade11c-backend.onrender.com";

const API_BASE_URL = "";

// Small wrapper so every fetch() call automatically:
// 1) points at the right backend, and
// 2) sends/receives the login cookie even when frontend and backend
//    are on two different domains (Netlify + Render).
function apiFetch(path, options = {}) {
  return fetch(API_BASE_URL + path, {
    ...options,
    credentials: 'include'
  });
}
