// src/api/authApi.js
import axios from "axios";

const API_URL = "http://localhost:5000/api"; // Change to your backend URL

export const signup = async (data) => {
  const formData = new FormData(); // because we have image upload
  Object.keys(data).forEach((key) => {
    formData.append(key, data[key]);
  });

  return axios.post(`${API_URL}/signup`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
// POST /auth/login  (email/password)
export const login = (payload) => {
  return axios.post(`${API_URL}/auth/login`, payload);
};

// return the redirect URL for provider-based OAuth (server should implement the route)
export const getOAuthUrl = (provider) => {
  // provider expected: "google", "facebook", "apple"
  return `${API_URL}/auth/${provider}`;
};

// Optional helper that opens an OAuth popup (returns the popup window handle)
export const openOAuthPopup = (provider, name = "oauthPopup") => {
  const url = getOAuthUrl(provider);
  // open centered popup
  const width = 600,
    height = 700;
  const left = window.screenX + (window.innerWidth - width) / 2;
  const top = window.screenY + (window.innerHeight - height) / 2;
  return window.open(
    url,
    name,
    `width=${width},height=${height},left=${left},top=${top}`
  );
};
