import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { updateMe, login } from '../api/authApi';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { 
  FaMountain, 
  FaMonument, 
  FaTheaterMasks, 
  FaUtensils, 
  FaHiking,
  FaCheckCircle
} from 'react-icons/fa';

const INTEREST_OPTIONS = [
  { 
    value: 'history', 
    label: 'History', 
    icon: FaMonument,
    description: 'Explore historical sites and monuments',
    color: '#8B4513'
  },
  { 
    value: 'nature', 
    label: 'Nature', 
    icon: FaMountain,
    description: 'Discover natural landscapes and wildlife',
    color: '#228B22'
  },
  { 
    value: 'culture', 
    label: 'Culture', 
    icon: FaTheaterMasks,
    description: 'Experience local traditions and arts',
    color: '#FF6347'
  },
  { 
    value: 'food', 
    label: 'Food', 
    icon: FaUtensils,
    description: 'Taste authentic local cuisine',
    color: '#FF8C00'
  },
  { 
    value: 'adventure', 
    label: 'Adventure', 
    icon: FaHiking,
    description: 'Thrilling outdoor activities',
    color: '#4169E1'
  }
];

export default function InterestsSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser, handleLogin } = useAuth();
  const email = location.state?.email || '';
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [loading, setLoading] = useState(false);

  // Check if user is logged in
  useEffect(() => {
    if (!user) {
      // If user is not logged in, redirect to login
      navigate('/login', { 
        state: { 
          email,
          redirectTo: '/select-interests'
        } 
      });
    }
  }, [user, email, navigate]);

  const toggleInterest = (value) => {
    setSelectedInterests((prev) => {
      if (prev.includes(value)) {
        return prev.filter((i) => i !== value);
      }
      return [...prev, value];
    });
  };

  const handleContinue = async () => {
    if (selectedInterests.length === 0) {
      toast.warning('Please select at least one interest to get personalized recommendations');
      return;
    }

    setLoading(true);
    try {
      // If user is not logged in, we need to login first
      if (!user && email) {
        // Try to get user password from location state or prompt for login
        // For now, we'll save interests after login
        // But since we don't have password, we'll redirect to login
        toast.info('Please login to save your interests');
        navigate('/login', { 
          state: { 
            email,
            redirectTo: '/select-interests',
            interests: selectedInterests
          } 
        });
        return;
      }

      // User is logged in, save interests
      const res = await updateMe({ interests: selectedInterests });
      if (res.data) {
        const updatedUser = res.data.user || res.data.updatedUser || res.data;
        setUser(updatedUser);
        toast.success('Interests saved successfully!');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error saving interests:', error);
      toast.error(error.response?.data?.message || 'Failed to save interests');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/dashboard');
  };

  return (
    <div 
      className="d-flex align-items-center justify-content-center min-vh-100"
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '2rem 1rem'
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="card border-0 shadow-lg"
        style={{
          maxWidth: '800px',
          width: '100%',
          borderRadius: '20px',
          overflow: 'hidden',
          background: 'white'
        }}
      >
        <div 
          className="card-body p-4 p-md-5"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-4"
          >
            <h2 className="fw-bold mb-2" style={{ fontSize: '2rem', color: '#2d3748' }}>
              Tell Us Your Interests! 🎯
            </h2>
            <p className="text-muted mb-0" style={{ fontSize: '1.1rem' }}>
              Select your interests to get personalized travel recommendations
            </p>
          </motion.div>

          {/* Progress Indicator */}
          <div className="mb-4">
            <div className="d-flex justify-content-center align-items-center gap-2">
              <div 
                className="rounded-circle d-flex align-items-center justify-content-center"
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontWeight: 'bold'
                }}
              >
                <FaCheckCircle />
              </div>
              <div 
                style={{
                  width: '100px',
                  height: '3px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                }}
              ></div>
              <div 
                className="rounded-circle d-flex align-items-center justify-content-center"
                style={{
                  width: '40px',
                  height: '40px',
                  background: selectedInterests.length > 0 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : '#e9ecef',
                  color: selectedInterests.length > 0 ? 'white' : '#adb5bd',
                  fontWeight: 'bold'
                }}
              >
                2
              </div>
            </div>
            <div className="d-flex justify-content-between mt-2">
              <small className="text-muted">Account Created</small>
              <small className="text-muted">Select Interests</small>
            </div>
          </div>

          {/* Interests Grid */}
          <div className="row g-3 mb-4">
            {INTEREST_OPTIONS.map((interest, index) => {
              const IconComponent = interest.icon;
              const isSelected = selectedInterests.includes(interest.value);
              
              return (
                <motion.div
                  key={interest.value}
                  className="col-12 col-md-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <motion.div
                    className="card border-0 h-100"
                    style={{
                      cursor: 'pointer',
                      borderRadius: '15px',
                      overflow: 'hidden',
                      border: isSelected ? `3px solid ${interest.color}` : '2px solid #e9ecef',
                      background: isSelected 
                        ? `linear-gradient(135deg, ${interest.color}15 0%, ${interest.color}25 100%)`
                        : 'white',
                      transition: 'all 0.3s ease',
                      boxShadow: isSelected 
                        ? `0 10px 30px ${interest.color}40`
                        : '0 5px 15px rgba(0,0,0,0.1)'
                    }}
                    whileHover={{ 
                      scale: 1.02,
                      boxShadow: `0 10px 30px ${interest.color}40`
                    }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggleInterest(interest.value)}
                  >
                    <div className="card-body p-4">
                      <div className="d-flex align-items-start gap-3">
                        <div
                          className="d-flex align-items-center justify-content-center rounded-circle"
                          style={{
                            width: '60px',
                            height: '60px',
                            background: isSelected 
                              ? interest.color
                              : '#f8f9fa',
                            color: isSelected ? 'white' : interest.color,
                            fontSize: '24px',
                            flexShrink: 0,
                            transition: 'all 0.3s ease'
                          }}
                        >
                          <IconComponent />
                        </div>
                        <div className="flex-grow-1">
                          <h5 
                            className="fw-bold mb-1"
                            style={{ 
                              color: isSelected ? interest.color : '#2d3748',
                              fontSize: '1.2rem'
                            }}
                          >
                            {interest.label}
                            {isSelected && (
                              <FaCheckCircle 
                                className="ms-2" 
                                style={{ color: interest.color, fontSize: '1rem' }}
                              />
                            )}
                          </h5>
                          <p 
                            className="mb-0 small"
                            style={{ 
                              color: isSelected ? '#495057' : '#6c757d'
                            }}
                          >
                            {interest.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>

          {/* Selection Count */}
          {selectedInterests.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center mb-4"
            >
              <p className="mb-0" style={{ color: '#667eea', fontWeight: '500' }}>
                {selectedInterests.length} interest{selectedInterests.length > 1 ? 's' : ''} selected
              </p>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="d-flex gap-3">
            <motion.button
              type="button"
              className="btn btn-outline-secondary flex-grow-1 py-3 fw-bold"
              style={{ borderRadius: '12px' }}
              onClick={handleSkip}
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Skip for Now
            </motion.button>
            <motion.button
              type="button"
              className="btn flex-grow-1 py-3 fw-bold text-white"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '12px',
                boxShadow: '0 8px 20px rgba(102, 126, 234, 0.4)'
              }}
              onClick={handleContinue}
              disabled={loading || selectedInterests.length === 0}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? 'Saving...' : 'Continue to Dashboard'}
            </motion.button>
          </div>

          {/* Helper Text */}
          <p className="text-center text-muted small mt-3 mb-0">
            You can always update your interests in Settings later
          </p>
        </div>
      </motion.div>
    </div>
  );
}

