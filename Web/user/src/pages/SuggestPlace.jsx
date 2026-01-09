import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getMyPlaceSuggestions, submitPlaceSuggestion } from "../api/localPlacesApi.jsx";
import { getPlaceAutocomplete, getPlaceDetails } from "../api/placesApi.jsx";
import { toast } from "react-toastify";

const INTEREST_OPTIONS = [
  { value: "history", label: "History" },
  { value: "nature", label: "Nature" },
  { value: "culture", label: "Culture" },
  { value: "food", label: "Food" },
  { value: "adventure", label: "Adventure" },
];

export default function SuggestPlace() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingMine, setLoadingMine] = useState(true);
  const [myPlaces, setMyPlaces] = useState([]);
  const locationInputRef = useRef(null);
  const [form, setForm] = useState({
    name: "",
    address: "",
    description: "",
    latitude: "",
    longitude: "",
    estimatedCost: "",
    tags: [],
    place_id: "", // Store Google Place ID
  });
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  
  // Location autocomplete state
  const [locationInput, setLocationInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState(null);
  const debounceTimerRef = useRef(null);
  const suggestionsRef = useRef(null);

  const imagePreviews = useMemo(
    () => images.map((f) => ({ file: f, url: URL.createObjectURL(f) })),
    [images]
  );
  const videoPreviews = useMemo(
    () => videos.map((f) => ({ file: f, url: URL.createObjectURL(f) })),
    [videos]
  );

  useEffect(() => {
    if (user?.role !== "local") {
      toast.info("Only local users can suggest places.");
    }
  }, [user]);

  useEffect(() => {
    // Cleanup object URLs
    return () => {
      imagePreviews.forEach((p) => URL.revokeObjectURL(p.url));
      videoPreviews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [imagePreviews, videoPreviews]);

  // Handle click outside to close suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        locationInputRef.current &&
        !locationInputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Debounced location autocomplete search
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Reset suggestions if input is empty
    if (!locationInput || locationInput.trim().length === 0) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSuggestionError(null);
      return;
    }

    // Set loading state
    setLoadingSuggestions(true);
    setSuggestionError(null);

    // Debounce API call (300ms as per requirements)
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const response = await getPlaceAutocomplete(locationInput.trim());
        
        if (response.data?.success && Array.isArray(response.data.suggestions)) {
          setSuggestions(response.data.suggestions);
          setShowSuggestions(true);
          setSuggestionError(null);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
          setSuggestionError("No suggestions found");
        }
      } catch (error) {
        console.error("Error fetching autocomplete suggestions:", error);
        setSuggestions([]);
        setShowSuggestions(false);
        setSuggestionError(
          error.response?.data?.message || "Failed to load suggestions"
        );
      } finally {
        setLoadingSuggestions(false);
      }
    }, 300); // 300ms debounce delay

    // Cleanup function
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [locationInput]);

  // Handle place selection from suggestions
  const handlePlaceSelect = async (suggestion) => {
    try {
      setLoadingSuggestions(true);
      setShowSuggestions(false);
      
      // Update location input with selected place
      setLocationInput(suggestion.description || `${suggestion.main_text}, ${suggestion.secondary_text}`);
      
      // Fetch place details to get latitude and longitude
      const detailsResponse = await getPlaceDetails(suggestion.place_id);
      
      if (detailsResponse.data?.success) {
        const details = detailsResponse.data;
        
        // Update form with place details
        setForm((prev) => ({
          ...prev,
          address: details.full_address || suggestion.description || prev.address,
          latitude: details.latitude ? String(details.latitude) : prev.latitude,
          longitude: details.longitude ? String(details.longitude) : prev.longitude,
          place_id: details.place_id || suggestion.place_id || prev.place_id,
          // Optionally update name if not already set
          name: prev.name || details.name || suggestion.main_text || prev.name,
        }));
        
        toast.success("Location selected successfully");
      } else {
        // If details fetch fails, still use the suggestion data
        setForm((prev) => ({
          ...prev,
          address: suggestion.description || prev.address,
          place_id: suggestion.place_id || prev.place_id,
        }));
        
        toast.warning("Location selected, but coordinates could not be fetched");
      }
    } catch (error) {
      console.error("Error fetching place details:", error);
      
      // Still update with basic info even if details fail
      setForm((prev) => ({
        ...prev,
        address: suggestion.description || prev.address,
        place_id: suggestion.place_id || prev.place_id,
      }));
      
      toast.error("Failed to fetch location details");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const loadMine = async () => {
    setLoadingMine(true);
    try {
      const res = await getMyPlaceSuggestions();
      setMyPlaces(Array.isArray(res?.data?.places) ? res.data.places : []);
    } catch (e) {
      console.error("Failed to load my suggestions:", e);
      setMyPlaces([]);
    } finally {
      setLoadingMine(false);
    }
  };

  useEffect(() => {
    loadMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  const toggleTag = (value) => {
    setForm((p) => {
      const tags = new Set(p.tags);
      if (tags.has(value)) tags.delete(value);
      else tags.add(value);
      return { ...p, tags: Array.from(tags) };
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (user?.role !== "local") {
      toast.error("Only local users can suggest places.");
      return;
    }
    if (!form.name.trim()) {
      toast.error("Place name is required.");
      return;
    }
      if (form.tags.length === 0) {
      toast.error("Select at least one interest tag.");
      return;
    }
    if (images.length === 0 && videos.length === 0) {
      toast.warning("No media added. Adding images/videos will help admin review your suggestion better.");
      // Continue anyway - backend doesn't require media
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name.trim());
      if (form.address && form.address.trim()) {
        fd.append("address", form.address.trim());
      }
      if (form.description && form.description.trim()) {
        fd.append("description", form.description.trim());
      }
      if (form.latitude && form.latitude !== "" && !isNaN(Number(form.latitude))) {
        const lat = Number(form.latitude);
        if (lat >= -90 && lat <= 90) {
          fd.append("latitude", String(lat));
        }
      }
      if (form.longitude && form.longitude !== "" && !isNaN(Number(form.longitude))) {
        const lng = Number(form.longitude);
        if (lng >= -180 && lng <= 180) {
          fd.append("longitude", String(lng));
        }
      }
      if (form.estimatedCost && form.estimatedCost !== "") {
        const cost = Number(form.estimatedCost);
        if (!isNaN(cost) && cost >= 0) {
          fd.append("estimatedCost", String(cost));
        }
      }
      // Ensure tags is always a valid JSON array
      if (Array.isArray(form.tags) && form.tags.length > 0) {
        fd.append("tags", JSON.stringify(form.tags));
      } else {
        toast.error("Select at least one interest tag.");
        setLoading(false);
        return;
      }
      images.forEach((f) => fd.append("images", f));
      videos.forEach((f) => fd.append("videos", f));

      await submitPlaceSuggestion(fd);
      toast.success("Suggestion submitted! Admin approval required.");
      setForm({
        name: "",
        address: "",
        description: "",
        latitude: "",
        longitude: "",
        estimatedCost: "",
        tags: [],
        place_id: "",
      });
      setLocationInput("");
      setImages([]);
      setVideos([]);
      setSuggestions([]);
      setShowSuggestions(false);
      loadMine();
    } catch (err) {
      console.error("Submit suggestion error:", err);
      toast.error(err?.response?.data?.message || "Failed to submit suggestion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">
        <div>
          <h4 className="fw-bold mb-1">Suggest a Place (Local)</h4>
          <p className="text-muted mb-0">
            Suggest places with interest tags. Admin will approve them, then users will see them in Recommendations.
          </p>
        </div>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={loadMine} disabled={loadingMine}>
          {loadingMine ? "Refreshing..." : "Refresh my suggestions"}
        </button>
      </div>

      <div className="row g-3">
        <div className="col-12 col-xl-7">
          <form onSubmit={onSubmit} className="card shadow-sm p-3">
            <div className="mb-3">
              <label className="form-label">Place name</label>
              <input
                className="form-control"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Shalimar Gardens"
                disabled={loading}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Location</label>
              <div style={{ position: "relative" }}>
                <input
                  ref={locationInputRef}
                  className="form-control"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  onFocus={() => {
                    if (suggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  placeholder="Search location (e.g., Lahore, Punjab, Pakistan)"
                  disabled={loading}
                  autoComplete="off"
                />
                
                {/* Loading indicator */}
                {loadingSuggestions && (
                  <div
                    className="position-absolute"
                    style={{
                      right: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none",
                    }}
                  >
                    <span className="spinner-border spinner-border-sm text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </span>
                  </div>
                )}

                {/* Suggestions dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="list-group position-absolute w-100"
                    style={{
                      zIndex: 1000,
                      maxHeight: "300px",
                      overflowY: "auto",
                      marginTop: "2px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                      borderRadius: "4px",
                    }}
                  >
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={suggestion.place_id || index}
                        type="button"
                        className="list-group-item list-group-item-action text-start"
                        onClick={() => handlePlaceSelect(suggestion)}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="fw-semibold">{suggestion.main_text}</div>
                        {suggestion.secondary_text && (
                          <div className="text-muted small">{suggestion.secondary_text}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Empty state message */}
                {showSuggestions && !loadingSuggestions && suggestions.length === 0 && locationInput.trim().length > 0 && (
                  <div
                    className="position-absolute w-100"
                    style={{
                      zIndex: 1000,
                      marginTop: "2px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                      borderRadius: "4px",
                      backgroundColor: "white",
                      padding: "12px",
                      border: "1px solid #dee2e6",
                    }}
                  >
                    <div className="text-muted small">No suggestions found</div>
                  </div>
                )}

                {/* Error message */}
                {suggestionError && !loadingSuggestions && (
                  <div
                    className="position-absolute w-100"
                    style={{
                      zIndex: 1000,
                      marginTop: "2px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                      borderRadius: "4px",
                      backgroundColor: "#fff3cd",
                      padding: "12px",
                      border: "1px solid #ffc107",
                    }}
                  >
                    <div className="text-warning small">{suggestionError}</div>
                  </div>
                )}
              </div>
              <div className="text-muted small mt-1">
                Start typing to see location suggestions. Select a suggestion to automatically fill address and coordinates.
              </div>
              
              {/* Display selected location details */}
              {form.address && (
                <div className="mt-2 p-2 bg-light rounded small">
                  <div><strong>Selected Address:</strong> {form.address}</div>
                  {form.latitude && form.longitude && (
                    <div className="text-muted mt-1">
                      Coordinates: {form.latitude}, {form.longitude}
                    </div>
                  )}
                  {form.place_id && (
                    <div className="text-muted mt-1">
                      Place ID: {form.place_id}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mb-3">
              <label className="form-label">Description</label>
              <textarea
                className="form-control"
                rows={4}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="What makes this place special? What should tourists know?"
                disabled={loading}
                maxLength={2000}
              />
              <div className="text-muted small mt-1">{form.description.length}/2000</div>
            </div>

            <div className="mb-3">
              <label className="form-label">Estimated Cost (PKR)</label>
              <input
                type="number"
                className="form-control"
                value={form.estimatedCost}
                onChange={(e) => setForm((p) => ({ ...p, estimatedCost: e.target.value }))}
                placeholder="e.g., 500 (optional)"
                min="0"
                step="0.01"
                disabled={loading}
              />
              <div className="text-muted small mt-1">Approximate cost per person (optional)</div>
            </div>

            <div className="mb-3">
              <label className="form-label">Interest tags <span className="text-danger">*</span></label>
              <div className="d-flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`btn btn-sm ${form.tags.includes(opt.value) ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => toggleTag(opt.value)}
                    disabled={loading}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="row g-3 mb-3">
              <div className="col-12 col-md-6">
                <label className="form-label">Images (max 5, 5MB each)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="form-control"
                  disabled={loading}
                  onChange={(e) => setImages(Array.from(e.target.files || []).slice(0, 5))}
                />
                {imagePreviews.length > 0 ? (
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    {imagePreviews.map((p) => (
                      <img
                        key={p.url}
                        src={p.url}
                        alt="preview"
                        style={{ width: 88, height: 88, objectFit: "cover", borderRadius: 10 }}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Videos (max 2, 50MB each)</label>
                <input
                  type="file"
                  accept="video/*"
                  multiple
                  className="form-control"
                  disabled={loading}
                  onChange={(e) => setVideos(Array.from(e.target.files || []).slice(0, 2))}
                />
                {videoPreviews.length > 0 ? (
                  <div className="d-flex flex-column gap-2 mt-2">
                    {videoPreviews.map((p) => (
                      <video key={p.url} src={p.url} controls style={{ width: "100%", borderRadius: 10 }} />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit for approval"}
            </button>
          </form>
        </div>

        <div className="col-12 col-xl-5">
          <div className="card shadow-sm p-3">
            <h6 className="fw-bold mb-2">My previous suggestions</h6>
            <div className="text-muted small mb-3">
              Track approval status here. Approved places will appear in tourist recommendations if they match their interests.
            </div>

            {loadingMine ? (
              <div className="text-muted">Loading...</div>
            ) : myPlaces.length === 0 ? (
              <div className="text-muted">No suggestions yet.</div>
            ) : (
              <div className="d-flex flex-column gap-2" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                {myPlaces.slice(0, 15).map((p) => (
                  <div key={p._id} className="border rounded p-2" style={{ 
                    background: p.status === "approved" ? '#f0f9ff' : p.status === "rejected" ? '#fef2f2' : '#fffbeb'
                  }}>
                    <div className="d-flex justify-content-between gap-2 align-items-start">
                      <div className="flex-grow-1">
                        <div className="fw-semibold">{p.name}</div>
                        {p.address && (
                          <div className="text-muted xsmall mt-1">{p.address}</div>
                        )}
                        <div className="d-flex flex-wrap gap-1 mt-2">
                          {(p.tags || []).map((tag, idx) => (
                            <span key={idx} className="badge bg-secondary" style={{ fontSize: '0.7rem' }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                        {p.status === "approved" && (
                          <div className="text-success small mt-2">
                            ✓ Approved! This place will appear in recommendations for tourists with matching interests.
                          </div>
                        )}
                        {p.status === "rejected" && p.rejectionReason ? (
                          <div className="text-danger small mt-2">
                            ✗ Rejected: {p.rejectionReason}
                          </div>
                        ) : p.status === "rejected" ? (
                          <div className="text-danger small mt-2">
                            ✗ Rejected by admin
                          </div>
                        ) : null}
                        {p.status === "pending" && (
                          <div className="text-warning small mt-2">
                            ⏳ Pending admin review
                          </div>
                        )}
                      </div>
                      <span
                        className={`badge ${
                          p.status === "approved"
                            ? "text-bg-success"
                            : p.status === "rejected"
                            ? "text-bg-danger"
                            : "text-bg-warning"
                        }`}
                        style={{ flexShrink: 0 }}
                      >
                        {p.status || "pending"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


