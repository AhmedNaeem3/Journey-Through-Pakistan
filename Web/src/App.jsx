// src/App.jsx
import { AuthProvider } from "./context/AuthContext";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SignupPage from "./pages/SignupPage";
import LoginPage from "./pages/LoginPage";

function App() {
  return (
    <AuthProvider>
      {/* Router enables navigation between pages */}
      <Router>
        <Routes>
          {/* Signup Page */}
          <Route path="/signup" element={<SignupPage />} />

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
