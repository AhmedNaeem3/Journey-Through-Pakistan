import React, { useState } from "react";
import { signup } from "../api/authApi";
import { useNavigate, Link } from "react-router-dom";

export default function SignupForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "tourist",
    phone: "", // added (backend expects this)
    city: "",
    country: "",
    profilePicture: null,
    agree: false,
  });

  const darkOrange = "#E65100";
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    setFormData({
      ...formData,
      [name]:
        type === "checkbox" ? checked : type === "file" ? files[0] : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      const payload = { ...formData };
      delete payload.confirmPassword; // ✅ remove confirmPassword before sending

      await signup(payload);
      navigate("/verify-otp", { state: { email: formData.email } });
    } catch (err) {
      alert(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Heading */}
      <h2 className="fw-bold mb-2 text-center">Create Your Account</h2>
      <p className="text-muted text-center">
        Embark on your journey. Fill in your details below.
      </p>
      {/* Name */}
      <div className="mb-3">
        <label htmlFor="name" className="form-label fw-semibold">
          Full Name
        </label>
        <input
          type="text"
          id="name"
          className="form-control fw-semibold"
          placeholder="Enter your full name"
          name="name"
          value={formData.name}
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
      {/* Phone (NEW) */}
      <div className="mb-3">
        <label htmlFor="phone" className="form-label fw-semibold">
          Phone Number
        </label>
        <input
          type="text"
          id="phone"
          className="form-control fw-semibold"
          placeholder="Enter your phone number"
          name="phone"
          value={formData.phone}
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
      {/* Role */}
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
          <option value="local">Local</option>
          <option value="tourist">Tourist</option>
        </select>
      </div>
      {/* City */}
      <div className="mb-3">
        <label htmlFor="city" className="form-label fw-semibold">
          City
        </label>
        <input
          type="text"
          id="city"
          className="form-control fw-semibold"
          placeholder="Enter your city"
          name="city"
          value={formData.city}
          onChange={handleChange}
        />
      </div>
      {/* Country */}
      <div className="mb-3">
        <label htmlFor="country" className="form-label fw-semibold">
          Country
        </label>
        <input
          type="text"
          id="country"
          className="form-control fw-semibold"
          placeholder="Enter your country"
          name="country"
          value={formData.country}
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
            width: "100%",
            minHeight: "150px",
            border: "2px dashed #ced4da",
            borderRadius: "6px",
            backgroundColor: "#fafafa",
            cursor: "pointer",
            textAlign: "center",
            padding: "10px 12px",
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
      {/* Terms */}
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
      {/* Login Link */}{" "}
      <p className="text-center mt-3">
        {" "}
        Already have an account?{" "}
        <Link to="/login" style={{ color: darkOrange, fontWeight: "600" }}>
          {" "}
          Login{" "}
        </Link>
      </p>
    </form>
  );
}
