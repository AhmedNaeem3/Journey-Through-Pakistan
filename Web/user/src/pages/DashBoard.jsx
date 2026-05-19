import React,{useContext, useEffect, useState, useRef, useCallback} from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FiBookmark, FiGrid, FiUser, FiStar, FiMessageCircle, FiMapPin } from "react-icons/fi";
import { Link } from "react-router-dom";
import "../assests/css/dashboard.css";
import { AuthContext } from "../context/AuthContext";
import { getCommunityAttractionsByMonth, getRecentActivities, getUserStats, getLocalConnections } from "../api/authApi.jsx";
import { getPersonalizedRecommendations } from "../api/recommendationsApi.jsx";
import { markPlaceVisited, toggleSavePlace, fetchPlacePhotos } from "../api/placesApi.jsx";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DashboardSkeleton } from '../components/SkeletonLoader.jsx';
import "../assests/css/skeleton.css";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext)
  const userRole = user.role === "tourist"?true:false
  const [attractionsData, setAttractionsData] = useState([])
  const [loadingAttractions, setLoadingAttractions] = useState(true)
  const [timePeriod, setTimePeriod] = useState('12months') // '7days', '30days', '12months', 'year'
  const [activities, setActivities] = useState([])
  const [loadingActivities, setLoadingActivities] = useState(true)
  const [userStats, setUserStats] = useState({ postsCount: 0, savedPostsCount: 0, friendsCount: 0, landmarksCount: 0 })
  const [loadingStats, setLoadingStats] = useState(true)
  const [initialLoading, setInitialLoading] = useState(true)
  const [localConnectionsCount, setLocalConnectionsCount] = useState(0)
  const [loadingLocalConnections, setLoadingLocalConnections] = useState(true)
  const [recommendations, setRecommendations] = useState([])
  const [recommendationsReason, setRecommendationsReason] = useState("Based on your interests and nearby location")
  const [loadingRecommendations, setLoadingRecommendations] = useState(true)
  const [placeActionLoading, setPlaceActionLoading] = useState({})
  const [placeImages, setPlaceImages] = useState({})
  const [fetchingPhotos, setFetchingPhotos] = useState(new Set())
  const fetchedPhotosRef = useRef(new Set())
  const pollingIntervalRef = useRef(null)
  const activitiesPollingRef = useRef(null)
  const statsPollingRef = useRef(null)
  const timePeriodRef = useRef('12months') // Keep current timePeriod in ref to avoid stale closure

  const fetchAttractionsData = useCallback(async (skipLoading = false, period = null) => {
    try {
      const periodToUse = period || timePeriodRef.current || timePeriod
      if (!skipLoading) {
        setLoadingAttractions(true)
      }
      const response = await getCommunityAttractionsByMonth(periodToUse)
      const data = response?.data || []
      setAttractionsData(Array.isArray(data) ? data : [])
      setLoadingAttractions(false)
    } catch (error) {
      console.error('Error fetching attractions data:', error)
      setAttractionsData([])
      setLoadingAttractions(false)
    }
  }, [])
  
  // Update ref when timePeriod changes
  useEffect(() => {
    timePeriodRef.current = timePeriod
  }, [timePeriod])
  
  // Handle time period change and polling interval
  useEffect(() => {
    // Refetch when time period changes (only after initial load)
    if (!initialLoading) {
      fetchAttractionsData()
    }
    
    // Clear existing polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    
    // Create new interval with updated timePeriod (only if not in initial loading)
    if (!initialLoading) {
      pollingIntervalRef.current = setInterval(() => {
        fetchAttractionsData(true, timePeriodRef.current) // Use ref to get current value
      }, 30000)
    }
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [timePeriod, initialLoading, fetchAttractionsData])

  const fetchRecentActivities = async (skipLoading = false) => {
    try {
      if (!skipLoading) {
        setLoadingActivities(true)
      }
      const { data } = await getRecentActivities()
      setActivities(Array.isArray(data) ? data : [])
      setLoadingActivities(false)
    } catch (error) {
      console.error('Error fetching recent activities:', error)
      setLoadingActivities(false)
    }
  }

  const fetchUserStats = async (skipLoading = false) => {
    try {
      if (!skipLoading) {
        setLoadingStats(true)
      }
      const { data } = await getUserStats()
      setUserStats({
        postsCount: data.postsCount || 0,
        savedPostsCount: data.savedPostsCount || 0,
        friendsCount: data.friendsCount || 0,
        landmarksCount: data.landmarksCount || 0
      })
      setLoadingStats(false)
    } catch (error) {
      console.error('Error fetching user stats:', error)
      setLoadingStats(false)
    }
  }

  const fetchLocalConnections = async (skipLoading = false) => {
    try {
      if (!skipLoading) {
        setLoadingLocalConnections(true)
      }
      const { data } = await getLocalConnections()
      setLocalConnectionsCount(Array.isArray(data) ? data.length : 0)
      setLoadingLocalConnections(false)
    } catch (error) {
      console.error('Error fetching local connections:', error)
      setLocalConnectionsCount(0)
      setLoadingLocalConnections(false)
    }
  }

  const getBrowserLocation = () => {
    return new Promise((resolve) => {
      if (!navigator?.geolocation) return resolve(null);

      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }),
        () => resolve(null),
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 10 * 60 * 1000,
        }
      );
    });
  };

  const formatDistance = (meters) => {
    if (typeof meters !== "number" || !Number.isFinite(meters)) return "Distance unavailable";
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const formatEstimatedCost = (place) => {
    const value =
      place?.estimatedCost ??
      place?.estimated_cost ??
      place?.cost ??
      place?.price ??
      null;

    if (value === null || value === undefined || value === "") return "N/A";
    if (typeof value === "number" && Number.isFinite(value)) return `PKR ${value.toLocaleString()}`;
    return String(value);
  };

  const fetchRecommendations = async () => {
    try {
      setLoadingRecommendations(true)
      const loc = await getBrowserLocation()
      const params = loc ? { lat: loc.lat, lng: loc.lng } : {}
      const { data } = await getPersonalizedRecommendations(params)

      setRecommendationsReason(data?.reason || "Based on your interests and nearby location")
      setRecommendations(Array.isArray(data?.recommendations) ? data.recommendations : [])
      setLoadingRecommendations(false)
    } catch (error) {
      console.error('Error fetching personalized recommendations:', error)
      setRecommendations([])
      setLoadingRecommendations(false)
    }
  }

  const setActionLoading = (placeId, value) => {
    setPlaceActionLoading((prev) => ({ ...prev, [placeId]: value }));
  };

  const fetchPhotosForPlace = async (placeId, place) => {
    if (!placeId || fetchingPhotos.has(placeId) || placeImages[placeId] || fetchedPhotosRef.current.has(placeId)) {
      return;
    }

    const needsFetch = place?.needsPhotoFetch || 
                      ((!place?.images || place.images.length === 0) &&
                       (!place?.media || place.media.length === 0));

    if (!needsFetch) {
      fetchedPhotosRef.current.add(placeId);
      return;
    }

    fetchedPhotosRef.current.add(placeId);
    setFetchingPhotos(prev => new Set(prev).add(placeId));

    try {
      const { data } = await fetchPlacePhotos(placeId);
      if (data?.success && data?.images && data.images.length > 0) {
        setPlaceImages(prev => ({
          ...prev,
          [placeId]: data.images
        }));
      }
    } catch (error) {
      console.error(`Failed to fetch photos for place ${placeId}:`, error);
    } finally {
      setFetchingPhotos(prev => {
        const next = new Set(prev);
        next.delete(placeId);
        return next;
      });
    }
  };

  const handlePlaceClick = (place) => {
    if (place._id) {
      navigate(`/user/place/${place._id}`);
    } else if (place.googlePlaceId) {
      navigate(`/user/place/${place.googlePlaceId}`);
    }
  };

  // RecommendationCard component to handle image fetching
  const RecommendationCard = ({ place, recommendationsReason, onToggleSave, onMarkVisited, disabled }) => {
    const id = place?._id;
    
    // Get image URL from various sources
    const cachedImages = placeImages[id];
    const imageUrl = cachedImages?.[0] ||
                    place?.images?.[0] || 
                    place?.media?.[0]?.url || 
                    place?.imageUrl || 
                    place?.photo_url ||
                    null;
    
    // Fetch photos if needed
    React.useEffect(() => {
      if (!id || imageUrl || fetchingPhotos.has(id) || fetchedPhotosRef.current.has(id)) {
        return;
      }
      
      const needsFetch = place?.needsPhotoFetch || 
                        ((!place?.images || place.images.length === 0) &&
                         (!place?.media || place.media.length === 0));
      
      if (needsFetch) {
        fetchPhotosForPlace(id, place);
      } else {
        fetchedPhotosRef.current.add(id);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);
    
    return (
      <div className="col-12 col-md-6 col-xl-4">
        <div 
          className="card recommendation-card border-0 h-100" 
          style={{ 
            borderRadius: '15px', 
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 12px 35px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.1)';
          }}
          onClick={() => handlePlaceClick(place)}
        >
          <div 
            className="position-relative"
            style={{
              backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              height: '200px',
              borderRadius: '15px 15px 0 0',
              backgroundColor: '#e8e8e8',
              minHeight: '200px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}
          >
            {!imageUrl && (
              <div className="position-absolute w-100 h-100 d-flex align-items-center justify-content-center">
                {fetchingPhotos.has(id) ? (
                  <div className="text-center">
                    <div className="spinner-border spinner-border-sm" style={{ 
                      color: '#6c757d',
                      width: '24px',
                      height: '24px',
                      borderWidth: '2px'
                    }} role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted" style={{ opacity: 0.6 }}>
                    <FiMapPin size={32} />
                    <div className="mt-2 small">No Image</div>
                  </div>
                )}
              </div>
            )}
            {place?.rating && (
              <div className="position-absolute top-0 end-0 m-2">
                <span className="badge bg-warning text-dark">
                  <FiStar className="me-1" />
                  {typeof place.rating === 'number' ? place.rating.toFixed(1) : 'N/A'}
                </span>
              </div>
            )}
          </div>
          <div className="card-body">
            <h6 className="fw-bold mb-2">{place?.name || 'Unnamed place'}</h6>

            <div className="d-flex flex-wrap gap-2 text-muted small mb-2">
              <span><FiGrid className="me-1" />{formatDistance(place?.distanceMeters)}</span>
              <span><FiBookmark className="me-1" />Estimated cost: {formatEstimatedCost(place)}</span>
              <span><FiStar className="me-1" />Rating: {typeof place?.rating === 'number' ? place.rating : 0}</span>
            </div>

            <p className="mb-0 text-muted small">{recommendationsReason}</p>

            <div className="d-flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={() => onToggleSave(place._id)}
                disabled={disabled}
              >
                Save
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => onMarkVisited(place._id)}
                disabled={disabled}
              >
                Mark visited
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleMarkVisited = async (placeId) => {
    if (!placeId) return;
    try {
      setActionLoading(placeId, true);
      await markPlaceVisited(placeId);
      // Optimistic UX: remove from list immediately since visited places are excluded in future fetches.
      setRecommendations((prev) => prev.filter((p) => p?._id !== placeId));
    } catch (error) {
      console.error("Error marking visited:", error);
    } finally {
      setActionLoading(placeId, false);
    }
  };

  const handleToggleSave = async (placeId) => {
    if (!placeId) return;
    try {
      setActionLoading(placeId, true);
      await toggleSavePlace(placeId);
    } catch (error) {
      console.error("Error saving place:", error);
    } finally {
      setActionLoading(placeId, false);
    }
  };

  const getTimeAgo = (date) => {
    if (!date) return '';
    const now = new Date();
    const then = new Date(date);
    const diffInSeconds = Math.floor((now - then) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
  }

  useEffect(() => {
    // Initial fetch
    const loadInitialData = async () => {
      setInitialLoading(true)
      await Promise.all([
        fetchAttractionsData(),
        fetchRecentActivities(),
        fetchUserStats(),
        fetchLocalConnections()
      ])
      setInitialLoading(false)
    }
    
    loadInitialData()
    fetchRecommendations()
    
    // Set up polling every 30 seconds for real-time updates (only after initial load)
    // Reduced frequency to avoid constant reloading and improve performance
    const setupPolling = () => {
      pollingIntervalRef.current = setInterval(() => {
        // Use ref to get current timePeriod value, not stale closure value
        fetchAttractionsData(true, timePeriodRef.current)
      }, 30000) // Update every 30 seconds
      
      // Set up polling for activities every 30 seconds
      activitiesPollingRef.current = setInterval(() => {
        fetchRecentActivities(true) // Skip loading state
      }, 30000) // Update every 30 seconds
      
      // Set up polling for stats every 30 seconds
      statsPollingRef.current = setInterval(() => {
        fetchUserStats(true) // Skip loading state
      }, 30000) // Update every 30 seconds
    }
    
    // Setup polling after initial load (wait 2 seconds to avoid immediate reload)
    const timeoutId = setTimeout(setupPolling, 2000)
    
    // Cleanup on unmount
    return () => {
      clearTimeout(timeoutId)
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      if (activitiesPollingRef.current) {
        clearInterval(activitiesPollingRef.current)
        activitiesPollingRef.current = null
      }
      if (statsPollingRef.current) {
        clearInterval(statsPollingRef.current)
        statsPollingRef.current = null
      }
    }
  }, [])

  if (initialLoading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="container-fluid p-4 ">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-4 card border-0"
        style={{
          borderRadius: '15px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
          padding: '1.5rem',
          background: 'white',
        }}
      >
        <h2 className="fw-bold mb-2">Welcome Back,{userRole?"Traveler":"Local"}</h2>
        <p className="text-muted mb-0">
          Explore your personalized journey through the majestic landscapes and rich culture of Pakistan.
        </p>
      </motion.div>

      {/* Quick Actions */}
      <div className="row g-3 mb-4 text-center quick-actions-row">
        <div className="col-6 col-md-3">
          <Link to="/landmark" className="btn btn-primary w-100 quick-action-btn" style={{ boxShadow: '0 8px 20px rgba(79, 70, 229, 0.3)' }}>
            <FiGrid className="me-2" /> Landmark ID
          </Link>
        </div>
        <div className="col-6 col-md-3">
          <Link to="/community" className="btn btn-primary w-100 quick-action-btn" style={{ boxShadow: '0 8px 20px rgba(79, 70, 229, 0.3)' }}>
            <FiGrid className="me-2" /> New Community Post
          </Link>
        </div>
        <div className="col-6 col-md-3">
          <Link to="/chats" className="btn btn-primary w-100 quick-action-btn" style={{ boxShadow: '0 8px 20px rgba(79, 70, 229, 0.3)' }}>
            <FiMessageCircle className="me-2" /> Chat with Local
          </Link>
        </div>
        <div className="col-6 col-md-3">
          <Link to="/recommendations" className="btn btn-primary w-100 quick-action-btn" style={{ boxShadow: '0 8px 20px rgba(79, 70, 229, 0.3)' }}>
            <FiStar className="me-2" /> Get recommendations
          </Link>
        </div>
      </div>

      {/* At a glance */}
      <h5 className="fw-bold mb-3">Your Journey At A Glance</h5>
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-6 col-xl-3">
          <div className="card h-100 border-0" style={{ borderRadius: '15px', boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)' }}>
            <div className="card-body d-flex justify-content-between align-items-center">
              <div>
                <div className="text-muted small">Saved Places</div>
                <div className="display-6 fw-bold">42</div>
              </div>
              <FiBookmark size={22} className="text-secondary" />
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <div className="card h-100 border-0" style={{ borderRadius: '15px', boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)' }}>
            <div className="card-body d-flex justify-content-between align-items-center">
              <div>
                <div className="text-muted small">Landmarks Identified</div>
                {loadingStats ? (
                  <div className="skeleton-text" style={{ width: '40px', height: '48px' }}></div>
                ) : (
                  <div className="display-6 fw-bold">{userStats.landmarksCount}</div>
                )}
              </div>
              <FiGrid size={22} className="text-secondary" />
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <div className="card h-100 border-0" style={{ borderRadius: '15px', boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)' }}>
            <div className="card-body d-flex justify-content-between align-items-center">
              <div>
                <div className="text-muted small">Community Contributions</div>
                {loadingStats ? (
                  <div className="skeleton-text" style={{ width: '40px', height: '48px' }}></div>
                ) : (
                  <div className="display-6 fw-bold">{userStats.postsCount}</div>
                )}
              </div>
              <FiUser size={22} className="text-secondary" />
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <div className="card h-100 border-0" style={{ borderRadius: '15px', boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)' }}>
            <div className="card-body d-flex justify-content-between align-items-center">
              <div>
                <div className="text-muted small">Local Connections</div>
                {loadingLocalConnections ? (
                  <div className="skeleton-text" style={{ width: '40px', height: '48px' }}></div>
                ) : (
                  <div className="display-6 fw-bold">{localConnectionsCount}</div>
                )}
              </div>
              <FiMessageCircle size={22} className="text-secondary" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent + Progress */}
      <motion.div 
        className="row g-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.6 }}
      >
        <motion.div 
          className="col-12 col-xl-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.1, duration: 0.6 }}
        >
          <motion.div 
            className="card h-100 border-0 shadow-lg"
            style={{
              borderRadius: '20px',
              background: 'white',
              overflow: 'hidden',
            }}
            whileHover={{ y: -5 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <div 
              className="card-body"
              style={{ padding: '1.5rem' }}
            >
              <h6 className="fw-bold mb-4" style={{ fontSize: '1.25rem', color: '#2d3748' }}>
                Recent Activity 📝
              </h6>
              {loadingActivities ? (
                <div className="d-flex flex-column gap-2">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="d-flex justify-content-between align-items-center">
                      <div className="skeleton-text" style={{ width: '70%', height: '16px' }}></div>
                      <div className="skeleton-text" style={{ width: '80px', height: '14px' }}></div>
                    </div>
                  ))}
                </div>
              ) : activities.length > 0 ? (
                <div className="d-flex flex-column gap-2">
                  {activities.slice(0, 6).map((activity, index) => (
                    <motion.div
                      key={index}
                      className="d-flex justify-content-between align-items-center p-3 rounded-3"
                      style={{
                        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                        border: '1px solid rgba(102, 126, 234, 0.1)',
                      }}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.2 + index * 0.05, duration: 0.4 }}
                      whileHover={{ 
                        x: 5,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        boxShadow: '0 5px 15px rgba(102, 126, 234, 0.3)',
                      }}
                    >
                      <div className="flex-grow-1">
                        <span style={{ fontWeight: '500' }}>{activity.description}</span>
                      </div>
                      <small className="ms-2" style={{ whiteSpace: 'nowrap', opacity: 0.8 }}>
                        {getTimeAgo(activity.timestamp)}
                      </small>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <motion.div 
                  className="text-center py-5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                  <p className="mb-2 fw-bold" style={{ color: '#4a5568' }}>No recent activity</p>
                  <small style={{ color: '#718096' }}>Your activities will appear here</small>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
        <motion.div 
          className="col-12 col-xl-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.1, duration: 0.6 }}
        >
          <motion.div 
            className="card h-100 border-0 shadow-lg"
            style={{
              borderRadius: '20px',
              background: 'white',
              overflow: 'hidden',
            }}
            whileHover={{ y: -5 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <div 
              className="card-body"
              style={{ padding: '1.5rem' }}
            >
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h6 className="fw-bold mb-0" style={{ fontSize: '1.25rem', color: '#2d3748' }}>
                  Community Participation 📈
                </h6>
                <select 
                  className="form-select form-select-sm" 
                  style={{ 
                    width: 'auto', 
                    minWidth: '140px',
                    borderRadius: '10px',
                    border: '2px solid #667eea',
                    background: 'white',
                    fontWeight: '500',
                  }}
                  value={timePeriod}
                  onChange={(e) => setTimePeriod(e.target.value)}
                >
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="12months">Last 12 Months</option>
                  <option value="year">Last Year</option>
                </select>
              </div>
              {loadingAttractions ? (
                <div className="skeleton-image" style={{ width: '100%', height: '280px', borderRadius: '8px' }}></div>
              ) : (
                <div style={{ width: '100%', height: '280px', minHeight: '280px' }}>
                  {attractionsData && Array.isArray(attractionsData) && attractionsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={attractionsData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e6" />
                        <XAxis 
                          dataKey="month" 
                          tick={{ fontSize: 11 }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis 
                          tick={{ fontSize: 11 }}
                          allowDecimals={false}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            border: '1px solid #ccc',
                            borderRadius: '4px'
                          }}
                          labelStyle={{ fontWeight: 'bold' }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="posts" 
                          stroke="#667eea" 
                          strokeWidth={3}
                          dot={{ fill: '#667eea', r: 5 }}
                          activeDot={{ r: 8, fill: '#667eea' }}
                          name="Posts"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="comments" 
                          stroke="#10b981" 
                          strokeWidth={3}
                          dot={{ fill: '#10b981', r: 5 }}
                          activeDot={{ r: 8, fill: '#10b981' }}
                          name="Comments"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="shares" 
                          stroke="#f59e0b" 
                          strokeWidth={3}
                          dot={{ fill: '#f59e0b', r: 5 }}
                          activeDot={{ r: 8, fill: '#f59e0b' }}
                          name="Shares"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="total" 
                          stroke="#ec4899" 
                          strokeWidth={3}
                          dot={{ fill: '#ec4899', r: 5 }}
                          activeDot={{ r: 8, fill: '#ec4899' }}
                          name="Total Participation"
                          strokeDasharray="5 5"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <motion.div 
                      className="d-flex flex-column align-items-center justify-content-center" 
                      style={{ height: '280px' }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
                      <p className="mb-2 fw-bold" style={{ color: '#4a5568' }}>No participation data available</p>
                      <small style={{ color: '#718096' }}>Community activity will appear here</small>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Personalized Recommendations */}
      <div className="mt-4">
        <h5 className="fw-bold mb-3">Personalized Recommendations For You</h5>
        <p className="text-muted mb-3">{recommendationsReason}</p>

        {loadingRecommendations ? (
          <div className="row g-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="col-12 col-md-6 col-xl-4">
                <div className="card recommendation-card shadow-sm h-100">
                  <div className="recommendation-cover skeleton-image"></div>
                  <div className="card-body">
                    <div className="skeleton-text mb-2" style={{ width: '70%', height: '16px' }}></div>
                    <div className="skeleton-text mb-2" style={{ width: '50%', height: '14px' }}></div>
                    <div className="skeleton-text" style={{ width: '90%', height: '14px' }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : recommendations.length > 0 ? (
          <div className="row g-3">
            {recommendations.slice(0, 10).map((place) => (
              <RecommendationCard
                key={place._id}
                place={place}
                recommendationsReason={recommendationsReason}
                onToggleSave={handleToggleSave}
                onMarkVisited={handleMarkVisited}
                disabled={!!placeActionLoading[place._id]}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-muted">
            <p className="mb-0">No recommendations found</p>
            <small>Try updating your interests in Settings.</small>
          </div>
        )}

        <div className="text-center my-4">
          <Link to="/recommendations" className="btn btn-discover px-4 py-2" style={{ boxShadow: '0 8px 20px rgba(236, 72, 153, 0.3)' }}>Discover More Destinations</Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
