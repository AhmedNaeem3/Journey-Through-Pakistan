import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  FiMapPin, 
  FiStar, 
  FiImage, 
  FiChevronDown, 
  FiChevronUp,
  FiLoader,
  FiNavigation,
  FiExternalLink
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { getPlaceById, getPlaceByGoogleId, getNearbyPlaces } from '../api/placesApi';
import { generateGeminiContent } from '../api/geminiApi';
import GeminiModal from '../components/GeminiModal';
import './PlaceDetailPage.css';

export default function PlaceDetailPage() {
  const { placeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [distanceFromUser, setDistanceFromUser] = useState(null);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [loadingNearbyPlaces, setLoadingNearbyPlaces] = useState(false);
  const [autoDescription, setAutoDescription] = useState('');
  const [loadingAutoDescription, setLoadingAutoDescription] = useState(false);
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState(false);
  const [geminiPrompt, setGeminiPrompt] = useState('');

  // Fetch place details
  useEffect(() => {
    const fetchPlace = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Check if we have state data from navigation (for Google Place ID)
        const stateData = location.state;
        
        if (stateData?.placeId && stateData.placeId.startsWith('ChIJ')) {
          // This is a Google Place ID, use the by-google-id endpoint
          const response = await getPlaceByGoogleId(stateData.placeId);
          if (response.data?.success && response.data.place) {
            setPlace(response.data.place);
          } else {
            throw new Error('Place not found');
          }
        } else {
          // Try as MongoDB _id first (most common case)
          try {
            const response = await getPlaceById(placeId);
            if (response.data?.success && response.data.place) {
              setPlace(response.data.place);
            } else {
              throw new Error('Place not found');
            }
          } catch (idError) {
            // If MongoDB _id fails, try as Google Place ID (fallback)
            if (placeId && placeId.startsWith('ChIJ')) {
              try {
                const response = await getPlaceByGoogleId(placeId);
                if (response.data?.success && response.data.place) {
                  setPlace(response.data.place);
                } else {
                  throw new Error('Place not found');
                }
              } catch (googleError) {
                throw new Error('Place not found');
              }
            } else {
              throw new Error('Place not found');
            }
          }
        }
      } catch (err) {
        console.error('Error fetching place:', err);
        const errorMessage = err.response?.data?.message || err.message || 'Failed to load place details';
        const errorHint = err.response?.data?.hint;
        setError(errorHint ? `${errorMessage}. ${errorHint}` : errorMessage);
        
        // Show detailed error toast
        if (errorHint) {
          toast.error(`${errorMessage}. ${errorHint}`, {
            autoClose: 8000
          });
        } else {
          toast.error(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPlace();
  }, [placeId, location.state]);

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });
        },
        (error) => {
          console.error('Error getting current location:', error);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  // Calculate distance from user
  useEffect(() => {
    if (currentLocation && place?.latitude && place?.longitude) {
      const distance = calculateHaversineDistance(
        currentLocation.lat,
        currentLocation.lng,
        place.latitude,
        place.longitude
      );
      setDistanceFromUser(distance);
    }
  }, [currentLocation, place]);

  // Fetch nearby places
  useEffect(() => {
    const fetchNearby = async () => {
      if (place?.latitude && place?.longitude) {
        setLoadingNearbyPlaces(true);
        try {
          const response = await getNearbyPlaces(place.latitude, place.longitude);
          if (response.data?.success && response.data.places) {
            const placesWithPhotos = response.data.places
              .filter(p => p.photo_url)
              .slice(0, 5);
            setNearbyPlaces(placesWithPhotos);
          }
        } catch (err) {
          console.error('Error fetching nearby places:', err);
        } finally {
          setLoadingNearbyPlaces(false);
        }
      }
    };

    if (place) {
      fetchNearby();
    }
  }, [place]);

  // Auto-generate AI description
  useEffect(() => {
    const generateDescription = async () => {
      if (place?.name && !autoDescription) {
        setLoadingAutoDescription(true);
        try {
          // Build precise location context using exact data
          let locationContext = '';
          if (place.latitude && place.longitude) {
            locationContext = `\n\nEXACT LOCATION DATA:\n- Name: ${place.name}\n- Coordinates: ${place.latitude}, ${place.longitude}`;
            if (place.address) {
              locationContext += `\n- Address: ${place.address}`;
            }
            locationContext += `\n- Country: Pakistan`;
          } else if (place.address) {
            locationContext = `\n\nEXACT LOCATION DATA:\n- Name: ${place.name}\n- Address: ${place.address}, Pakistan.`;
          }
          
          // Build enhanced prompt that emphasizes using the EXACT location data
          let prompt = `A user is viewing a specific location. Use the EXACT location data provided below:\n\n`;
          prompt += `PLACE NAME: "${place.name}"\n`;
          if (place.latitude && place.longitude) {
            prompt += `EXACT COORDINATES: ${place.latitude}, ${place.longitude}\n`;
          }
          if (place.address) {
            prompt += `EXACT ADDRESS: ${place.address}\n`;
          }
          prompt += `\nCRITICAL INSTRUCTIONS:\n`;
          prompt += `1. Describe THIS SPECIFIC location - "${place.name}" at coordinates ${place.latitude || 'N/A'}, ${place.longitude || 'N/A'}\n`;
          prompt += `2. DO NOT provide a generic description. Use the exact name, coordinates, and address provided above.\n`;
          prompt += `3. The coordinates ${place.latitude || 'N/A'}, ${place.longitude || 'N/A'} represent the EXACT location.\n`;
          prompt += `4. Describe what "${place.name}" is at this specific location, not a general description.\n`;
          prompt += `\nInclude information about:\n`;
          prompt += `- What "${place.name}" is at coordinates ${place.latitude || 'N/A'}, ${place.longitude || 'N/A'}\n`;
          prompt += `- The specific location and its surroundings (use the exact coordinates to provide accurate geographic context)\n`;
          prompt += `- Historical significance of this specific place\n`;
          prompt += `- Cultural importance\n`;
          prompt += `- Notable features of this exact location\n`;
          prompt += `- Why tourists visit this specific place\n`;
          prompt += `- Interesting facts about this exact location\n`;
          prompt += `\nFormat the response with clear sections and headings. Make it engaging and tourism-friendly. `;
          prompt += `Remember: Describe the EXACT location with the provided name and coordinates, not a generic description.`;
          
          const res = await generateGeminiContent(prompt, 'gemini-2.5-flash-lite', 0.7);
          
          if (res.data.success && res.data.content) {
            setAutoDescription(res.data.content);
          }
        } catch (err) {
          console.error('Error generating AI description:', err);
        } finally {
          setLoadingAutoDescription(false);
        }
      }
    };

    if (place) {
      generateDescription();
    }
  }, [place]);

  // Haversine formula to calculate distance
  const calculateHaversineDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c); // Distance in meters
  };

  const formatDistance = (meters) => {
    if (!meters) return 'Unknown';
    if (meters < 1000) return `${meters}m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  // Format AI description (similar to LandmarkResult)
  const formatAutoDescription = (text) => {
    if (!text) return '';

    const processBoldHeadings = (content) => {
      const headingRegex = /(?:^|\n)\s*\*\*([^*]+?):?\*\*\s*/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = headingRegex.exec(content)) !== null) {
        if (match.index > lastIndex) {
          const beforeText = content.substring(lastIndex, match.index).trim();
          if (beforeText) {
            parts.push({ type: 'text', content: beforeText });
          }
        }
        const headingText = match[1].trim();
        parts.push({ type: 'heading', content: headingText });
        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < content.length) {
        const remainingText = content.substring(lastIndex).trim();
        if (remainingText) {
          parts.push({ type: 'text', content: remainingText });
        }
      }

      if (parts.length === 0) {
        return [{ type: 'text', content }];
      }

      return parts;
    };

    const paragraphs = text.split(/\n\n+/);
    
    return paragraphs.map((para, index) => {
      const trimmedPara = para.trim();
      if (!trimmedPara) return null;

      if (trimmedPara.startsWith('#')) {
        const level = trimmedPara.match(/^#+/)[0].length;
        const headingText = trimmedPara.replace(/^#+\s*/, '');
        const HeadingTag = `h${Math.min(level + 2, 6)}`;
        return React.createElement(
          HeadingTag,
          { key: index, className: 'fw-bold mb-2 mt-3', style: { color: '#0d6efd' } },
          headingText
        );
      }

      if (trimmedPara.match(/^[-*•]\s/)) {
        const items = trimmedPara.split(/\n/).filter(item => item.trim());
        return (
          <ul key={index} className="mb-3 ps-4">
            {items.map((item, itemIndex) => (
              <li key={itemIndex} className="mb-1">{item.replace(/^[-*•]\s/, '')}</li>
            ))}
          </ul>
        );
      }

      if (trimmedPara.match(/^\d+\.\s/)) {
        const items = trimmedPara.split(/\n/).filter(item => item.trim());
        return (
          <ol key={index} className="mb-3 ps-4">
            {items.map((item, itemIndex) => (
              <li key={itemIndex} className="mb-1">{item.replace(/^\d+\.\s/, '')}</li>
            ))}
          </ol>
        );
      }

      const processedParts = processBoldHeadings(trimmedPara);
      
      if (processedParts.length === 1 && processedParts[0].type === 'text') {
        return (
          <p key={index} className="mb-3" style={{ lineHeight: '1.7', fontSize: '1rem' }}>
            {trimmedPara.split('\n').map((line, lineIndex, array) => (
              <React.Fragment key={lineIndex}>
                {line}
                {lineIndex < array.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      }

      return (
        <div key={index} className="mb-3">
          {processedParts.map((part, partIndex) => {
            if (part.type === 'heading') {
              return (
                <h5 
                  key={partIndex} 
                  className="fw-bold mb-2 mt-3" 
                  style={{ color: '#0d6efd', fontSize: '1.1rem' }}
                >
                  {part.content}
                </h5>
              );
            } else {
              return (
                <p key={partIndex} style={{ lineHeight: '1.7', fontSize: '1rem', marginBottom: '0.5rem' }}>
                  {part.content.split('\n').map((line, lineIndex, array) => (
                    <React.Fragment key={lineIndex}>
                      {line}
                      {lineIndex < array.length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </p>
              );
            }
          })}
        </div>
      );
    }).filter(Boolean);
  };

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="text-center py-5">
          <FiLoader className="spinning" size={48} style={{ color: '#7c3aed', marginBottom: '16px' }} />
          <p className="text-muted">Loading place details...</p>
        </div>
      </div>
    );
  }

  if (error || !place) {
    return (
      <div className="container-fluid py-4">
        <div className="card shadow-sm">
          <div className="card-body text-center py-5">
            <h5 className="mb-3 text-danger">Error Loading Place</h5>
            <p className="text-muted mb-4">{error || 'Place not found'}</p>
            <button className="btn btn-primary" onClick={() => navigate('/search?q=&tab=places')}>
              Search for a Place
            </button>
          </div>
        </div>
      </div>
    );
  }

  const photos = place.photos || place.media || [];
  const mainPhoto = photos.length > 0 ? photos[0].url : null;

  return (
    <div className="container-fluid py-3 place-detail-page">
      <div className="row g-3">
        {/* Left Content */}
        <div className="col-12 col-lg-8">
          {/* Hero Section */}
          <div className="card shadow-sm mb-3">
            {/* Main Photo */}
            {mainPhoto && (
              <div className="ratio ratio-21x9 rounded-top overflow-hidden position-relative">
                <img
                  src={mainPhoto}
                  alt={place.name}
                  className="object-fit-cover w-100 h-100"
                  onError={(e) => {
                    e.target.src = `https://source.unsplash.com/1600x900/?${encodeURIComponent(place.name)},pakistan`;
                  }}
                />
                {place.rating > 0 && (
                  <div className="position-absolute top-0 end-0 m-3">
                    <span className="badge bg-warning text-dark">
                      <FiStar className="me-1" />
                      {place.rating.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Photo Gallery */}
            {photos.length > 1 && (
              <div className="card-body border-top">
                <button
                  className="btn btn-link text-decoration-none p-0 d-flex align-items-center"
                  onClick={() => setShowPhotoGallery(!showPhotoGallery)}
                >
                  <FiImage className="me-2" />
                  <span className="fw-semibold">
                    {showPhotoGallery ? 'Hide' : 'View'} All Photos ({photos.length})
                  </span>
                  {showPhotoGallery ? <FiChevronUp className="ms-2" /> : <FiChevronDown className="ms-2" />}
                </button>
                
                {showPhotoGallery && (
                  <div className="mt-3">
                    <div className="row g-2">
                      {photos.map((photo, index) => (
                        <div key={index} className="col-6 col-md-4 col-lg-3">
                          <div 
                            className="ratio ratio-16x9 rounded overflow-hidden cursor-pointer"
                            onClick={() => window.open(photo.url, '_blank')}
                            style={{ cursor: 'pointer' }}
                          >
                            <img
                              src={photo.url}
                              alt={`${place.name} - Photo ${index + 1}`}
                              className="object-fit-cover w-100 h-100"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Place Info */}
            <div className="card-body">
              <h1 className="display-6 fw-bolder mb-2">{place.name}</h1>
              {place.address && (
                <p className="text-muted mb-3">
                  <FiMapPin className="me-1" />
                  {place.address}
                </p>
              )}

              <div className="d-flex flex-wrap gap-2 mb-3">
                {distanceFromUser !== null && (
                  <span className="badge bg-primary text-white">
                    <FiNavigation className="me-1" />
                    {formatDistance(distanceFromUser)} from your location
                  </span>
                )}
                {place.rating > 0 && (
                  <span className="badge bg-warning text-dark">
                    <FiStar className="me-1" />
                    {place.rating.toFixed(1)} / 5.0
                  </span>
                )}
                {place.types && place.types.slice(0, 3).map((type, i) => (
                  <span key={i} className="badge bg-info text-dark">
                    {type.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>

              {place.tags && place.tags.length > 0 && (
                <div className="mb-3">
                  {place.tags.map((tag, idx) => (
                    <span key={idx} className="badge bg-secondary me-1">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {place.latitude && place.longitude && (
                <a
                  href={`https://www.google.com/maps?q=${place.latitude},${place.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-primary"
                >
                  <FiExternalLink className="me-2" />
                  View on Google Maps
                </a>
              )}
            </div>
          </div>

          {/* AI Description Section */}
          <div className="card shadow-sm mb-3">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="d-flex align-items-center gap-2">
                  <div className="badge bg-primary-subtle text-primary p-2 rounded-3">📖</div>
                  <h4 className="fw-bold mb-0">About {place.name}</h4>
                </div>
                {loadingAutoDescription && (
                  <span className="badge bg-warning text-dark">
                    <FiLoader className="spinning me-1" />
                    <small>Generating...</small>
                  </span>
                )}
                {autoDescription && !loadingAutoDescription && (
                  <span className="badge bg-success">
                    <small>✓ Generated by AI</small>
                  </span>
                )}
              </div>
              
              {loadingAutoDescription ? (
                <div className="py-4">
                  <div className="skeleton-line mb-2" style={{ width: '100%', height: '16px' }}></div>
                  <div className="skeleton-line mb-2" style={{ width: '95%', height: '16px' }}></div>
                  <div className="skeleton-line mb-3" style={{ width: '90%', height: '16px' }}></div>
                  <div className="skeleton-line mb-2" style={{ width: '80%', height: '20px' }}></div>
                  <div className="skeleton-line mb-2" style={{ width: '100%', height: '16px' }}></div>
                </div>
              ) : autoDescription ? (
                <div className="ai-description-content">
                  {formatAutoDescription(autoDescription)}
                </div>
              ) : (
                <div className="text-muted">
                  <p className="mb-0">Description will be generated shortly...</p>
                </div>
              )}

              <div className="mt-4 pt-3 border-top">
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    setGeminiPrompt('');
                    setIsGeminiModalOpen(true);
                  }}
                >
                  Ask Anything About This Place from AI
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="col-12 col-lg-4">
          {/* Map Section */}
          {place.latitude && place.longitude && (
            <div className="card shadow-sm mb-3">
              <div className="card-body">
                <h5 className="fw-bold mb-3">Location</h5>
                <div className="ratio ratio-16x9 rounded overflow-hidden">
                  <iframe
                    title="place location map"
                    src={`https://maps.google.com/maps?q=${place.latitude},${place.longitude}&z=15&output=embed`}
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                {distanceFromUser !== null && (
                  <div className="mt-3 text-center">
                    <p className="mb-0">
                      <strong>{formatDistance(distanceFromUser)}</strong> from your current location
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Nearby Recommendations */}
          {loadingNearbyPlaces ? (
            <div className="card shadow-sm mb-3">
              <div className="card-body">
                <h6 className="fw-bold mb-3">Nearby Places</h6>
                <div className="text-center text-muted small py-3">
                  <FiLoader className="spinning me-2" />
                  Loading nearby places...
                </div>
              </div>
            </div>
          ) : nearbyPlaces.length > 0 ? (
            <div className="card shadow-sm mb-3">
              <div className="card-body">
                <h6 className="fw-bold mb-3">Nearby Recommendations</h6>
                <div className="d-flex flex-column gap-3">
                  {nearbyPlaces.map((nearbyPlace, index) => (
                    <div key={nearbyPlace.place_id || index} className="d-flex align-items-center gap-3 border rounded-3 p-2">
                      {nearbyPlace.photo_url && (
                        <img
                          className="rounded-3"
                          src={nearbyPlace.photo_url}
                          alt={nearbyPlace.name}
                          style={{
                            width: "60px",
                            height: "60px",
                            objectFit: "cover"
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      )}
                      <div className="flex-grow-1">
                        <div className="fw-semibold small">{nearbyPlace.name}</div>
                        <div className="text-muted x-small">
                          {nearbyPlace.distance ? (
                            nearbyPlace.distance < 1000
                              ? `${nearbyPlace.distance} m`
                              : `${(nearbyPlace.distance / 1000).toFixed(1)} km`
                          ) : (
                            "Nearby"
                          )}
                        </div>
                        {nearbyPlace.rating && (
                          <div className="text-muted x-small">⭐ {nearbyPlace.rating}</div>
                        )}
                      </div>
                      <a
                        className="link-primary small fw-semibold text-decoration-none"
                        href={`https://www.google.com/maps/place/?q=place_id:${nearbyPlace.place_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        View
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Gemini Modal */}
      <GeminiModal
        isOpen={isGeminiModalOpen}
        onClose={() => setIsGeminiModalOpen(false)}
        prompt={geminiPrompt}
        title={`Ask About ${place.name || 'This Place'}`}
        model="gemini-2.5-flash-lite"
        temperature={0.7}
        landmarkName={place.name}
        location={place.latitude && place.longitude ? { lat: place.latitude, lng: place.longitude, address: place.address } : null}
        autoFetch={false}
      />
    </div>
  );
}
