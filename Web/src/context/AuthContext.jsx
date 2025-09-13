// src/context/AuthContext.jsx
import { createContext, useContext, useState } from "react";
import { signup } from "../api/authApi";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);

  const handleSignup = async (formData) => {
    try {
      setLoading(true);
      const response = await signup(formData);
      return response.data; // Return response to component
    } catch (error) {
      throw error.response?.data?.message || "Signup failed";
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ handleSignup, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
