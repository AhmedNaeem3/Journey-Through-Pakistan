// src/App.jsx
import { AuthProvider } from "./context/AuthContext";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SignupPage from "./pages/SignupPage";
import LoginPage from "./pages/LoginPage";
import OTPVerification from "./components/OtpVerify";
import Dashboard from "./pages/DashBoard";

function App() {
  return (
    <AuthProvider>
      {/* Router enables navigation between pages */}
      <Router>
        <Routes>
          {/* Signup Page */}
          <Route path="/signup" element={<SignupPage />} />

          <Route path="/verify-otp" element={<OTPVerification />} />
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Login Page */}
          <Route path="/login" element={<LoginPage />} />

          {/* Default Route - Redirect to Signup */}
          <Route path="*" element={<SignupPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
