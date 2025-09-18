import React from "react";
import { motion } from "framer-motion";
// import "./dashboard.css";
import "../styles/dashboard.css";

const Dashboard = () => {
  return (
    <div className="dashboard-container">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="dashboard-card"
      >
        <h1>🎉 Welcome to Your Dashboard</h1>
        <p>You have successfully verified your OTP.</p>
      </motion.div>
    </div>
  );
};

export default Dashboard;
