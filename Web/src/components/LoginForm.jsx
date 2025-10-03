// src/components/LoginForm.jsx
import React, { useState, useContext } from "react";
import { FaGoogle, FaApple, FaFacebookF } from "react-icons/fa";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { login, getMe } from "../api/authApi"; // ✅ use from your authApi.js

export default function LoginForm() {
  const [data, setData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 🔹 Step 1: Call backend login API (normal email/password)
      await login(data); // cookie will be set by backend

      // 🔹 Step 2: Fetch logged-in user
      const res = await getMe();

      // 🔹 Step 3: Save user in context
      setUser(res.data);

      // 🔹 Step 4: Redirect to dashboard/home
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Redirect to backend for OAuth login
  const handleOAuth = (provider) => {
    let url = "";
    if (provider === "google") url = "http://localhost:3000/auth/login/google";
    if (provider === "facebook")
      url = "http://localhost:3000/auth/login/facebook";
    if (provider === "apple") url = "http://localhost:3000/auth/login/apple";

    window.location.href = url; // 🚀 redirect user to backend OAuth flow
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="mb-3 text-center">
        <h2>Login to Your Account</h2>
        <div className="subtitle">
          Enter your details below to access your personalized travel journey.
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="mb-3">
        <label htmlFor="email" className="form-label fw-semibold">
          Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="form-control"
          placeholder="john.doe@example.com"
          value={data.email}
          onChange={handleChange}
          required
        />
      </div>

      <div className="mb-2">
        <label htmlFor="password" className="form-label fw-semibold">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="form-control"
          placeholder="Enter your password"
          value={data.password}
          onChange={handleChange}
          required
        />
      </div>

      <div className="mb-3">
        <a href="/forgot-password" className="forgot-link">
          Forgot Password?
        </a>
      </div>

      <div className="mb-3">
        <button
          type="submit"
          className="btn btn-primary-custom"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </div>

      <div className="or-sep">OR</div>

      <div className="mb-2">
        <button
          type="button"
          className="social-btn"
          onClick={() => handleOAuth("google")}
        >
          <FaGoogle /> Continue with Google
        </button>
        <button
          type="button"
          className="social-btn"
          onClick={() => handleOAuth("apple")}
        >
          <FaApple /> Continue with Apple
        </button>
        <button
          type="button"
          className="social-btn"
          onClick={() => handleOAuth("facebook")}
        >
          <FaFacebookF /> Continue with Facebook
        </button>
      </div>

      <div className="bottom-note">
        Don’t have an account? <a href="/signup">Sign Up</a>
      </div>
    </form>
  );
}
