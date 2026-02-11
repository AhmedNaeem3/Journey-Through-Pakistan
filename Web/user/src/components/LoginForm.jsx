// src/components/LoginForm.jsx
import React, { useState, useContext, useEffect } from "react";
import { FaGoogle, FaApple, FaFacebookF } from "react-icons/fa";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginForm() {
  const location = useLocation();
  const [data, setData] = useState({ 
    email: location.state?.email || "", 
    password: "" 
  });
  const [error, setError] = useState("");
  const { handleLogin, loading, user } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    

    try {
      const loggedInUser = await handleLogin(data);
      
      // Check redirect destination or if tourist needs to select interests
      const redirectTo = location.state?.redirectTo;
      const userRole = location.state?.role;
      
      if (redirectTo) {
        navigate(redirectTo);
      } else if ((userRole === 'tourist' || loggedInUser?.role === 'tourist') && 
                 (!loggedInUser?.interests || loggedInUser.interests.length === 0)) {
        navigate("/select-interests");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } 
  };

  // 🔹 Redirect to backend for OAuth login
  const handleOAuth = (provider) => {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    let url = "";
    if (provider === "google") url = `${API_BASE}/auth/login/google`;
    if (provider === "facebook")
      url = `${API_BASE}/auth/login/facebook`;
    if (provider === "apple") url = `${API_BASE}/auth/login/apple`;

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
