import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiMapPin, FiLoader } from 'react-icons/fi';
import { getPlaceAutocomplete, getPlaceByGoogleId } from '../api/placesApi';
import { toast } from 'react-toastify';
import './RecommendationPage.css';

export default function RecommendationPage() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const debounceTimerRef = useRef(null);
  const suggestionsRef = useRef(null);
  const inputRef = useRef(null);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Debounced autocomplete search
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!searchInput || searchInput.trim().length === 0) {
      setSuggestions([]);
      setShowSuggestions(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const response = await getPlaceAutocomplete(searchInput.trim());
        
        if (response.data?.success && Array.isArray(response.data.suggestions)) {
          setSuggestions(response.data.suggestions);
          setShowSuggestions(true);
          setError(null);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
          setError('No suggestions found');
        }
      } catch (err) {
        console.error('Error fetching autocomplete suggestions:', err);
        setSuggestions([]);
        setShowSuggestions(false);
        setError(err.response?.data?.message || 'Failed to load suggestions');
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchInput]);

  // Handle place selection
  const handlePlaceSelect = async (suggestion) => {
    try {
      setLoading(true);
      setShowSuggestions(false);
      
      // Find or create place in database using Google Place ID
      const response = await getPlaceByGoogleId(suggestion.place_id);
      
      if (response.data?.success && response.data.place) {
        const place = response.data.place;
        
        // Navigate to place detail page using MongoDB _id
        navigate(`/user/place/${place._id}`);
      } else {
        toast.error('Failed to load place');
      }
    } catch (err) {
      console.error('Error fetching place:', err);
      const errorMessage = err.response?.data?.message || 'Failed to load place details';
      const errorHint = err.response?.data?.hint;
      
      // Show detailed error message
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

  return (
    <div className="recommendation-page">
      <div className="container-fluid py-5">
        <div className="row justify-content-center">
          <div className="col-12 col-lg-8">
            {/* Hero Section */}
            <div className="text-center mb-5">
              <h1 className="display-4 fw-bold mb-3">
                Discover Amazing Places
              </h1>
              <p className="lead text-muted mb-4">
                Search for places in Pakistan and explore their beauty, history, and culture
              </p>
            </div>

            {/* Search Input */}
            <div className="search-container position-relative">
              <div className="search-input-wrapper">
                <FiSearch className="search-icon" />
                <input
                  ref={inputRef}
                  type="text"
                  className="search-input"
                  placeholder="Search for a place (e.g., Badshahi Mosque, Lahore)"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onFocus={() => {
                    if (suggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  autoComplete="off"
                />
                {loading && (
                  <div className="search-loading">
                    <FiLoader className="spinning" />
                  </div>
                )}
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div ref={suggestionsRef} className="suggestions-dropdown">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={suggestion.place_id || index}
                      type="button"
                      className="suggestion-item"
                      onClick={() => handlePlaceSelect(suggestion)}
                    >
                      <FiMapPin className="suggestion-icon" />
                      <div className="suggestion-content">
                        <div className="suggestion-main">{suggestion.main_text}</div>
                        {suggestion.secondary_text && (
                          <div className="suggestion-secondary">{suggestion.secondary_text}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {showSuggestions && !loading && suggestions.length === 0 && searchInput.trim().length > 0 && (
                <div className="suggestions-dropdown">
                  <div className="suggestion-empty">
                    <p className="mb-0 text-muted">No suggestions found</p>
                    <small className="text-muted">Try a different search term</small>
                  </div>
                </div>
              )}

              {/* Error State */}
              {error && !loading && (
                <div className="suggestions-dropdown">
                  <div className="suggestion-error">
                    <p className="mb-0 text-danger">{error}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Info Section */}
            <div className="info-section mt-4">
              <div className="row g-3">
                <div className="col-12 col-md-4">
                  <div className="info-card">
                    <div className="info-icon">📍</div>
                    <h5>Explore Places</h5>
                    <p className="text-muted small mb-0">
                      Discover historical landmarks, natural wonders, and cultural sites
                    </p>
                  </div>
                </div>
                <div className="col-12 col-md-4">
                  <div className="info-card">
                    <div className="info-icon">🤖</div>
                    <h5>AI-Powered</h5>
                    <p className="text-muted small mb-0">
                      Get detailed descriptions and insights powered by AI
                    </p>
                  </div>
                </div>
                <div className="col-12 col-md-4">
                  <div className="info-card">
                    <div className="info-icon">🗺️</div>
                    <h5>Interactive Maps</h5>
                    <p className="text-muted small mb-0">
                      View locations on maps and find nearby attractions
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
