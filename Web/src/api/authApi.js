// src/api/authApi.js
import axios from "axios";

const API_URL = "http://localhost:3000/users"; // ✅ this matches your backend mount point

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// REGISTER user
export const signup = async (data) => {
  const formData = new FormData();

  if (data.name) formData.append("name", data.name);
  if (data.email) formData.append("email", data.email);
  if (data.password) formData.append("password", data.password);
  if (data.role) formData.append("role", data.role);
  if (data.phone) formData.append("phone", data.phone);
  if (data.city) formData.append("city", data.city);
  if (data.country) formData.append("country", data.country);
  if (data.profilePicture)
    formData.append("profilePicture", data.profilePicture);

  return api.post("/register", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// LOGIN
export const login = (payload) => api.post("/login", payload);

// GET logged-in user (note: backend route is /users/getMe)
export const getMe = () => api.get("/getMe");

// VERIFY OTP
export const verifyOtp = (payload) => api.post("/verify-otp", payload);

// RESEND OTP
export const resendOtp = (payload) => api.post("/resend-otp", payload);

// LOGOUT (optional)
export const logout = () => api.post("/logout");
