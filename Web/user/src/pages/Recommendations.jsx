import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FiBookmark, FiMapPin, FiStar, FiRefreshCw, FiTag, FiTrendingUp, FiUsers, FiCompass, FiCheck } from "react-icons/fi";
import { getPersonalizedRecommendations, getInterestBasedRecommendations, getUserInterests } from "../api/recommendationsApi.jsx";
import { markPlaceVisited, toggleSavePlace, getSavedPlaces, getVisitedPlaces, fetchPlacePhotos } from "../api/placesApi.jsx";

// Add spinning animation for refresh button and skeleton styles
const spinStyle = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .spinning {
    animation: spin 1s linear infinite;
  }
  
  /* Minimalistic skeleton loader styles */
  @keyframes skeleton-loading {
    0% {
      background-position: -200px 0;
    }
    100% {
      background-position: calc(200px + 100%) 0;
    }
  }
  
  .skeleton {
    background: linear-gradient(
      90deg,
      #f0f0f0 0px,
      #e8e8e8 40px,
      #f0f0f0 80px
    );
    background-size: 200px 100%;
    animation: skeleton-loading 1.5s ease-in-out infinite;
    border-radius: 4px;
  }
  
  .skeleton-image {
    width: 100%;
    height: 200px;
    background: linear-gradient(
      90deg,
      #e8e8e8 0px,
      #f0f0f0 40px,
      #e8e8e8 80px
    );
    background-size: 200px 100%;
    animation: skeleton-loading 1.5s ease-in-out infinite;
    border-radius: 8px 8px 0 0;
  }
  
  .skeleton-text {
    height: 14px;
    background: linear-gradient(
      90deg,
      #e8e8e8 0px,
      #f0f0f0 40px,
      #e8e8e8 80px
    );
    background-size: 200px 100%;
    animation: skeleton-loading 1.5s ease-in-out infinite;
    border-radius: 4px;
    margin-bottom: 8px;
  }
  
  .skeleton-button {
    height: 32px;
    background: linear-gradient(
      90deg,
      #e8e8e8 0px,
      #f0f0f0 40px,
      #e8e8e8 80px
    );
    background-size: 200px 100%;
    animation: skeleton-loading 1.5s ease-in-out infinite;
    border-radius: 4px;
  }
`;

function isFiniteNumber(n) {
  return typeof n === "number" && Number.isFinite(n);
}

function formatDistance(meters) {
  if (!isFiniteNumber(meters)) return "Distance unavailable";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function getBrowserLocation() {
  return new Promise((resolve) => {
    if (!navigator?.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 10 * 60 * 1000 }
    );
  });
}

export default function Recommendations() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState({
    recommended: true,
    popular: true,
    community: true,
    explore: true,
  });
  const [recommendedForYou, setRecommendedForYou] = useState([]);
  const [popularNearYou, setPopularNearYou] = useState([]);
  const [communityBased, setCommunityBased] = useState([]);
  const [exploreCategories, setExploreCategories] = useState([]);
  const [actionLoading, setActionLoading] = useState({});
  const [savedSet, setSavedSet] = useState(new Set());
  const [visitedSet, setVisitedSet] = useState(new Set());
  const [userInterests, setUserInterests] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [fetchingPhotos, setFetchingPhotos] = useState(new Set());
  const [placeImages, setPlaceImages] = useState({});
  const fetchedPhotosRef = useRef(new Set()); // Track which places we've already tried to fetch

  const loadUserPlaceSets = async () => {
    try {
      const [savedRes, visitedRes] = await Promise.all([getSavedPlaces(), getVisitedPlaces()]);
      // Handle both response structures: { places: [...] } or { data: { places: [...] } }
      const savedPlaces = savedRes?.data?.places || savedRes?.places || [];
      const visitedPlaces = visitedRes?.data?.places || visitedRes?.places || [];
      
      // Convert to strings and filter out any invalid IDs
      const savedIds = savedPlaces
        .map((p) => p?._id)
        .filter(id => id != null && id !== '')
        .map(id => String(id));
      
      const visitedIds = visitedPlaces
        .map((p) => p?._id)
        .filter(id => id != null && id !== '')
        .map(id => String(id));
      
      setSavedSet(new Set(savedIds));
      setVisitedSet(new Set(visitedIds));
    } catch (e) {
      console.error("Failed to load saved/visited sets:", e);
      // Initialize empty sets on error to prevent false positives
      setSavedSet(new Set());
      setVisitedSet(new Set());
    }
  };

  const fetchAllRecommendations = async () => {
    // Get location first (non-blocking, with timeout)
    const locationPromise = getBrowserLocation().catch(() => null);
    const loc = await Promise.race([
      locationPromise,
      new Promise(resolve => setTimeout(() => resolve(null), 3000)) // 3s timeout
    ]);
    
    setUserLocation(loc);
    const params = loc ? { lat: loc.lat, lng: loc.lng } : {};

    // Make ALL API calls in parallel for faster loading
    const [recommendedResult, popularResult, communityResult, exploreResult] = await Promise.allSettled([
      // Recommended for You - ALL OVER PAKISTAN
      (async () => {
        setLoading(prev => ({ ...prev, recommended: true }));
        try {
          const { data } = await getInterestBasedRecommendations({ ...params, scope: 'all' });
          const recommendations = Array.isArray(data?.recommendations) ? data.recommendations : [];
          setRecommendedForYou(recommendations.slice(0, 6));
          return { success: true };
        } catch (e) {
          // Fallback to personalized recommendations
          try {
            const { data } = await getPersonalizedRecommendations(params);
            const recommendations = Array.isArray(data?.recommendations) ? data.recommendations : [];
            setRecommendedForYou(recommendations.slice(0, 6));
            return { success: true };
          } catch (fallbackError) {
            setRecommendedForYou([]);
            return { success: false };
          }
        } finally {
          setLoading(prev => ({ ...prev, recommended: false }));
        }
      })(),

      // Popular Near You - CITY-SPECIFIC
      (async () => {
        setLoading(prev => ({ ...prev, popular: true }));
        try {
          if (loc && loc.lat && loc.lng) {
            const { data } = await getInterestBasedRecommendations({ 
              lat: loc.lat, 
              lng: loc.lng, 
              scope: 'city' 
            });
            const recommendations = Array.isArray(data?.recommendations) ? data.recommendations : [];
            const sorted = recommendations
              .filter(p => p.rating >= 4)
              .sort((a, b) => {
                const ratingDiff = (b.rating || 0) - (a.rating || 0);
                if (ratingDiff !== 0) return ratingDiff;
                const distA = a.distanceMeters || Infinity;
                const distB = b.distanceMeters || Infinity;
                return distA - distB;
              });
            setPopularNearYou(sorted.slice(0, 6));
          } else {
            const { data } = await getPersonalizedRecommendations(params);
            const recommendations = Array.isArray(data?.recommendations) ? data.recommendations : [];
            const sorted = recommendations
              .filter(p => p.rating >= 4)
              .sort((a, b) => {
                const ratingDiff = (b.rating || 0) - (a.rating || 0);
                if (ratingDiff !== 0) return ratingDiff;
                const distA = a.distanceMeters || Infinity;
                const distB = b.distanceMeters || Infinity;
                return distA - distB;
              });
            setPopularNearYou(sorted.slice(0, 6));
          }
          return { success: true };
        } catch (e) {
          setPopularNearYou([]);
          return { success: false };
        } finally {
          setLoading(prev => ({ ...prev, popular: false }));
        }
      })(),

      // Community-based recommendations
      (async () => {
        setLoading(prev => ({ ...prev, community: true }));
        try {
          const { data } = await getPersonalizedRecommendations(params);
          const recommendations = Array.isArray(data?.recommendations) ? data.recommendations : [];
          const communityBased = recommendations
            .filter(p => p.matchedTags && p.matchedTags.length > 0)
            .slice(0, 6);
          setCommunityBased(communityBased);
          return { success: true };
        } catch (e) {
          setCommunityBased([]);
          return { success: false };
        } finally {
          setLoading(prev => ({ ...prev, community: false }));
        }
      })(),

      // Explore new categories
      (async () => {
        setLoading(prev => ({ ...prev, explore: true }));
        try {
          const { data } = await getPersonalizedRecommendations(params);
          const recommendations = Array.isArray(data?.recommendations) ? data.recommendations : [];
          const typeMap = new Map();
          const diverse = [];
          for (const rec of recommendations) {
            const mainType = rec.types?.[0] || 'general';
            if (!typeMap.has(mainType) || typeMap.get(mainType) < 2) {
              diverse.push(rec);
              typeMap.set(mainType, (typeMap.get(mainType) || 0) + 1);
            }
            if (diverse.length >= 6) break;
          }
          setExploreCategories(diverse);
          return { success: true };
        } catch (e) {
          setExploreCategories([]);
          return { success: false };
        } finally {
          setLoading(prev => ({ ...prev, explore: false }));
        }
      })()
    ]);
  };

  const loadUserInterests = async () => {
    try {
      const { data } = await getUserInterests();
      if (data?.success && Array.isArray(data.interests)) {
        setUserInterests(data.interests);
      }
    } catch (e) {
      console.error("Failed to load user interests:", e);
    }
  };

  useEffect(() => {
    fetchAllRecommendations();
    loadUserPlaceSets();
    loadUserInterests();
    // Clear photo fetch tracking when component unmounts or recommendations change
    return () => {
      fetchedPhotosRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setItemLoading = (id, v) => setActionLoading((p) => ({ ...p, [id]: v }));

  const fetchPhotosForPlace = async (placeId, place) => {
    if (!placeId || fetchingPhotos.has(placeId) || placeImages[placeId] || fetchedPhotosRef.current.has(placeId)) {
      return;
    }

    const needsFetch = place?.needsPhotoFetch || 
                      (!place?.images || place.images.length === 0);

    if (!needsFetch) {
      fetchedPhotosRef.current.add(placeId); // Mark as checked
      return;
    }

    // Mark as fetching to prevent duplicate calls
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

  const onToggleSave = async (id, placeName) => {
    if (!id) return;
    const idString = String(id);
    try {
      setItemLoading(idString, true);
      const res = await toggleSavePlace(idString);
      const saved = !!res?.data?.saved;
      
      setSavedSet((prev) => {
        const next = new Set(prev);
        if (saved) next.add(idString);
        else next.delete(idString);
        return next;
      });
      
      // Show user feedback
      if (saved) {
        toast.success(`${placeName || 'Place'} saved successfully! View it in My Places.`, {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
        });
      } else {
        toast.info(`${placeName || 'Place'} removed from saved places.`, {
          position: "top-right",
          autoClose: 2000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
        });
      }
    } catch (e) {
      console.error("Save failed:", e);
      toast.error("Failed to save place. Please try again.", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });
    } finally {
      setItemLoading(idString, false);
    }
  };

  const onMarkVisited = async (id, placeName) => {
    if (!id) return;
    const idString = String(id);
    try {
      setItemLoading(idString, true);
      await markPlaceVisited(idString);
      setVisitedSet((prev) => {
        const next = new Set(prev);
        next.add(idString);
        return next;
      });
      toast.success(`${placeName || 'Place'} marked as visited!`, {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });
    } catch (e) {
      console.error("Mark visited failed:", e);
      toast.error("Failed to mark place as visited. Please try again.", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });
    } finally {
      setItemLoading(idString, false);
    }
  };

  const handlePlaceClick = (place) => {
    if (place._id) {
      navigate(`/user/place/${place._id}`);
    } else if (place.googlePlaceId) {
      navigate(`/user/place/${place.googlePlaceId}`);
    }
  };

  const PlaceCard = ({ place, loading: cardLoading }) => {
    const id = place?._id;
    // Convert id to string for consistent comparison, only if it exists and is valid
    const idString = (id && (typeof id === 'string' || typeof id === 'object')) ? String(id) : null;
    // Explicitly check: only true if idString exists AND is in the respective set
    const isSaved = idString ? savedSet.has(idString) : false;
    const isVisited = idString ? visitedSet.has(idString) : false;
    const disabled = !!actionLoading[id];
    
    const cachedImages = placeImages[id];
    const imageUrl = cachedImages?.[0] ||
                    place?.images?.[0] || 
                    place?.media?.[0]?.url || 
                    place?.imageUrl || 
                    place?.photo_url ||
                    null;
    
    // Use useEffect to fetch photos only once per place
    React.useEffect(() => {
      // Only fetch if all conditions are met
      if (!id || imageUrl || fetchingPhotos.has(id) || fetchedPhotosRef.current.has(id)) {
        return; // Exit early if already have image or already fetching/fetched
      }
      
      const needsFetch = place?.needsPhotoFetch || (!place?.images || place.images.length === 0);
      if (needsFetch) {
        fetchPhotosForPlace(id, place);
      } else {
        // Mark as checked if no fetch needed
        fetchedPhotosRef.current.add(id);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]); // Only depend on id - imageUrl changes will trigger re-render but useEffect won't re-run

    if (cardLoading) {
      return (
        <div className="card shadow-sm h-100" style={{ border: '1px solid #e8e8e8' }}>
          {/* Skeleton Image */}
          <div className="skeleton-image"></div>
          
          <div className="card-body">
            {/* Skeleton Title */}
            <div className="skeleton-text" style={{ width: "75%", height: 18, marginBottom: 12 }}></div>
            
            {/* Skeleton Address */}
            <div className="skeleton-text" style={{ width: "90%", height: 12, marginBottom: 8 }}></div>
            <div className="skeleton-text" style={{ width: "60%", height: 12, marginBottom: 12 }}></div>
            
            {/* Skeleton Meta Info */}
            <div className="d-flex gap-3 mb-3">
              <div className="skeleton-text" style={{ width: "80px", height: 12 }}></div>
              <div className="skeleton-text" style={{ width: "60px", height: 12 }}></div>
            </div>
            
            {/* Skeleton Tags */}
            <div className="d-flex gap-2 mb-3">
              <div className="skeleton-text" style={{ width: "70px", height: 20, borderRadius: '12px' }}></div>
              <div className="skeleton-text" style={{ width: "85px", height: 20, borderRadius: '12px' }}></div>
            </div>
            
            {/* Skeleton Buttons */}
            <div className="d-flex gap-2 mt-3">
              <div className="skeleton-button flex-grow-1"></div>
              <div className="skeleton-button" style={{ width: "80px" }}></div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="card shadow-sm h-100" style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
           onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
           onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
           onClick={() => handlePlaceClick(place)}>
        <div 
          className="position-relative"
          style={{
            backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            height: '200px',
            borderRadius: '8px 8px 0 0',
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
                  <div className="skeleton-image" style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    width: '100%', 
                    height: '100%',
                    borderRadius: '8px 8px 0 0'
                  }}></div>
                  <div className="position-relative" style={{ zIndex: 1 }}>
                    <div className="spinner-border spinner-border-sm" style={{ 
                      color: '#6c757d',
                      width: '24px',
                      height: '24px',
                      borderWidth: '2px'
                    }} role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
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
                {isFiniteNumber(place.rating) ? place.rating.toFixed(1) : 'N/A'}
              </span>
            </div>
          )}
        </div>
        
        <div className="card-body">
          <h6 className="fw-bold mb-2">{place?.name || "Unnamed place"}</h6>
          
          {place?.address && (
            <p className="text-muted small mb-2" style={{ fontSize: '0.85rem' }}>
              {place.address}
            </p>
          )}

          <div className="d-flex flex-wrap gap-2 text-muted small mb-2">
            {place?.distanceMeters && (
              <span>
                <FiMapPin className="me-1" />
                {formatDistance(place.distanceMeters)}
              </span>
            )}
            {place?.rating && (
              <span>
                <FiStar className="me-1" />
                {isFiniteNumber(place.rating) ? place.rating.toFixed(1) : 'N/A'}
              </span>
            )}
          </div>

          {place?.types && place.types.length > 0 && (
            <div className="mb-2">
              <div className="d-flex flex-wrap gap-1">
                {place.types.slice(0, 2).map((type, idx) => (
                  <span key={idx} className="badge bg-secondary" style={{ fontSize: '0.7rem' }}>
                    {type.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="d-flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={`btn btn-sm flex-grow-1 ${isSaved ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => idString && onToggleSave(idString, place?.name)}
              disabled={disabled || !idString}
            >
              <FiBookmark className="me-1" /> {isSaved ? "Saved" : "Save"}
            </button>
            <button
              type="button"
              className={`btn btn-sm ${isVisited ? "btn-secondary" : "btn-outline-secondary"}`}
              onClick={() => idString && onMarkVisited(idString, place?.name)}
              disabled={disabled || isVisited || !idString}
              style={isVisited ? { cursor: 'not-allowed', opacity: 0.7 } : {}}
            >
              {isVisited ? (
                <>
                  <FiCheck className="me-1" /> Visited
                </>
              ) : (
                "Visited"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const Section = ({ title, icon: Icon, items, loading: sectionLoading, emptyMessage }) => {
    if (sectionLoading) {
      return (
        <div className="mb-5">
          {/* Skeleton Title */}
          <div className="d-flex align-items-center gap-2 mb-3">
            <div className="skeleton" style={{ width: '24px', height: '24px', borderRadius: '4px' }}></div>
            <div className="skeleton-text" style={{ width: '200px', height: '24px' }}></div>
          </div>
          <div className="row g-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="col-12 col-md-6 col-xl-4">
                <PlaceCard place={{}} loading={true} />
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="mb-5">
          <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
            <Icon /> {title}
          </h5>
          <div className="text-center py-4 text-muted">
            <p className="mb-0">{emptyMessage || "No recommendations found"}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="mb-5">
        <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
          <Icon /> {title}
        </h5>
        <div className="row g-3">
          {items.map((place) => (
            <div key={place._id || place.googlePlaceId || Math.random()} className="col-12 col-md-6 col-xl-4">
              <PlaceCard place={place} loading={false} />
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Show skeleton immediately while any section is loading
  const isInitialLoad = Object.values(loading).some(l => l) && 
                       recommendedForYou.length === 0 && 
                       popularNearYou.length === 0 && 
                       communityBased.length === 0 && 
                       exploreCategories.length === 0;

  return (
    <>
      <style>{spinStyle}</style>
      <div className="container-fluid">
        <div className="d-flex align-items-start justify-content-between gap-3 mb-4">
        <div>
          <h4 className="fw-bold mb-1">Recommendations</h4>
          <div className="text-muted small">
            Discover places tailored to your interests, community activity, and location
          </div>
          {userInterests.length > 0 && (
            <div className="mt-2">
              <small className="text-muted">
                Your interests: {userInterests.slice(0, 5).map(i => i.tag).join(", ")}
                {userInterests.length > 5 && ` +${userInterests.length - 5} more`}
              </small>
            </div>
          )}
        </div>
        <button 
          className="btn btn-outline-secondary btn-sm" 
          onClick={fetchAllRecommendations}
          disabled={Object.values(loading).some(l => l)}
        >
          <FiRefreshCw className={`me-1 ${Object.values(loading).some(l => l) ? 'spinning' : ''}`} /> 
          Refresh
        </button>
      </div>

      {/* Recommended for You */}
      <Section
        title="Recommended for You"
        icon={FiStar}
        items={recommendedForYou}
        loading={loading.recommended}
        emptyMessage="Create posts, like posts, or view places to build your interest profile"
      />

      {/* Popular Near You */}
      <Section
        title="Popular Near You"
        icon={FiTrendingUp}
        items={popularNearYou}
        loading={loading.popular}
        emptyMessage="Enable location access to see popular places near you"
      />

      {/* Based on Community Activity */}
      <Section
        title="Based on Community Activity"
        icon={FiUsers}
        items={communityBased}
        loading={loading.community}
        emptyMessage="Save posts with hashtags to see community-based recommendations"
      />

      {/* Explore New Categories */}
      <Section
        title="Explore New Categories"
        icon={FiCompass}
        items={exploreCategories}
        loading={loading.explore}
        emptyMessage="Discover diverse places across different categories"
      />
      </div>
    </>
  );
}
