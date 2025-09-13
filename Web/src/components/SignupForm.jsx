import React, { useState } from "react";
import { Link } from "react-router-dom"; // ✅ Import at top of file
export default function SignupForm() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
    region: "",
    profilePicture: null,
    agree: false,
  });

  const darkOrange = "#E65100"; // Dark Orange Color

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    setFormData({
      ...formData,
      [name]:
        type === "checkbox" ? checked : type === "file" ? files[0] : value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form Data: ", formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Heading */}
      <h2 className="fw-bold mb-2 text-center">Create Your Account</h2>
      <p className="text-muted text-center">
        Embark on your journey. Fill in your details below.
      </p>
      {/* Full Name */}
      <div className="mb-3">
        <label htmlFor="fullName" className="form-label fw-semibold">
          Full Name
        </label>
        <input
          type="text"
          id="fullName"
          className="form-control fw-semibold"
          placeholder="Enter your full name"
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          required
        />
      </div>
      {/* Email */}
      <div className="mb-3">
        <label htmlFor="email" className="form-label fw-semibold">
          Email Address
        </label>
        <input
          type="email"
          id="email"
          className="form-control fw-semibold"
          placeholder="Enter your email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
        />
      </div>
      {/* Password */}
      <div className="mb-3">
        <label htmlFor="password" className="form-label fw-semibold">
          Password
        </label>
        <input
          type="password"
          id="password"
          className="form-control fw-semibold"
          placeholder="Enter your password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          required
        />
      </div>
      {/* Confirm Password */}
      <div className="mb-3">
        <label htmlFor="confirmPassword" className="form-label fw-semibold">
          Confirm Password
        </label>
        <input
          type="password"
          id="confirmPassword"
          className="form-control fw-semibold"
          placeholder="Confirm your password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
        />
      </div>
      {/* Select Role */}
      <div className="mb-3">
        <label htmlFor="role" className="form-label fw-semibold">
          Select Role
        </label>
        <select
          id="role"
          className="form-select fw-semibold"
          name="role"
          value={formData.role}
          onChange={handleChange}
          required
        >
          <option value="">Select your role</option>
          <option value="local">Local</option>
          <option value="tourist">Tourist</option>
        </select>
      </div>
      {/* Region */}
      <div className="mb-3">
        <label htmlFor="region" className="form-label fw-semibold">
          Region/City (Relevant for Locals)
        </label>
        <input
          type="text"
          id="region"
          className="form-control fw-semibold"
          placeholder="e.g., Paris, Kyoto, New York"
          name="region"
          value={formData.region}
          onChange={handleChange}
        />
      </div>
      {/* Profile Picture */}
      <div className="mb-3">
        <label htmlFor="profilePicture" className="form-label fw-semibold">
          Profile Picture
        </label>
        <label
          htmlFor="profilePicture"
          className="d-flex align-items-center justify-content-center fw-semibold"
          style={{
            width: "100%", // Full width like other inputs
            minHeight: "150px", // Same height as text input
            border: "2px dashed #ced4da", // Same border style
            borderRadius: "6px", // Same rounded corners
            backgroundColor: "#fafafa", // Light background
            cursor: "pointer",
            textAlign: "center",
            padding: "10px 12px", // Same padding as form-control
          }}
        >
          📷 Click to upload (Optional)
        </label>
        <input
          type="file"
          id="profilePicture"
          name="profilePicture"
          className="d-none"
          onChange={handleChange}
        />
      </div>
      {/* Terms of Service */}
      <div className="form-check mb-3">
        <input
          className="form-check-input"
          type="checkbox"
          id="agree"
          name="agree"
          checked={formData.agree}
          onChange={handleChange}
          required
        />
        <label className="form-check-label" htmlFor="agree">
          By creating an account, you agree to our{" "}
          <a href="#" style={{ color: darkOrange }}>
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" style={{ color: darkOrange }}>
            Privacy Policy
          </a>
          .
        </label>
      </div>
      {/* Submit Button */}
      <button
        type="submit"
        className="btn w-100 fw-bold"
        style={{ backgroundColor: darkOrange, color: "white" }}
      >
        Create Account
      </button>
      {/* Login Link */}

      <p className="text-center mt-3">
        Already have an account?{" "}
        <Link to="/login" style={{ color: darkOrange, fontWeight: "600" }}>
          Login
        </Link>
      </p>
    </form>
  );
}
