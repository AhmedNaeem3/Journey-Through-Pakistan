// src/components/LoginForm.jsx
import React, { useState } from "react";
import { FaGoogle, FaApple, FaFacebookF } from "react-icons/fa";
import { login, openOAuthPopup } from "../api/authApi";
import "../pages/login.css";
/**
 * LoginForm component
 * - email/password login
 * - OAuth buttons (Google / Apple / Facebook) open the backend OAuth route in a popup
 */
export default function LoginForm() {
  const [data, setData] = useState({ email: "", password: "" }); // form state
  const [loading, setLoading] = useState(false); // submit state
  const [error, setError] = useState(""); // show auth errors

  // handle input changes
  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  // form submit - email / password
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await login({ email: data.email, password: data.password });
      // backend should return token / user object
      console.log("Login success:", res.data);
      // TODO: save token (e.g., localStorage) and redirect to dashboard
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // open popup for provider (google/facebook/apple)
  const handleOAuth = (provider) => {
    openOAuthPopup(provider);
    // Optionally listen for messages from popup (if your backend sends postMessage)
    // window.addEventListener("message", (ev) => { ... });
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="mb-3 text-center">
        {/* <div className="title">Login to Your Account</div> */}
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
        Don't have an account? <a href="/signup">Sign Up</a>
      </div>
    </form>
  );
}
