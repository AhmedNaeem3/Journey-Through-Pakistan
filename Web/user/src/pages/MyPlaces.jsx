import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FiBookmark, FiCheckCircle, FiStar, FiMapPin } from "react-icons/fi";
import { getSavedPlaces, getVisitedPlaces, toggleSavePlace, markPlaceVisited, fetchPlacePhotos } from "../api/placesApi.jsx";

function isFiniteNumber(n) {
  return typeof n === "number" && Number.isFinite(n);
}

export default function MyPlaces() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("saved"); // saved | visited
  const [loading, setLoading] = useState(true);
  const [places, setPlaces] = useState([]);
  const [actionLoading, setActionLoading] = useState({});
  const [placeImages, setPlaceImages] = useState({});
  const [fetchingPhotos, setFetchingPhotos] = useState(new Set());
  const fetchedPhotosRef = useRef(new Set());

  const load = async (t = tab) => {
    setLoading(true);
    try {
      const res = t === "visited" ? await getVisitedPlaces() : await getSavedPlaces();
      // Handle both response structures: { places: [...] } or { data: { places: [...] } }
      const placesArray = res?.data?.places || res?.places || [];
      setPlaces(Array.isArray(placesArray) ? placesArray : []);
    } catch (e) {
      console.error("Failed to load places:", e);
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const setItemLoading = (id, v) => setActionLoading((p) => ({ ...p, [id]: v }));

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

  // PlaceCard component to handle image fetching
  const PlaceCard = ({ place, onToggleSave, onMarkVisited, tab, disabled }) => {
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
          className="card shadow-sm h-100" 
          style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          onClick={() => handlePlaceClick(place)}
        >
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
            <div className="d-flex flex-wrap gap-2 text-muted small mb-3">
              <span>
                <FiStar className="me-1" />
                Rating: {isFiniteNumber(place?.rating) ? place.rating.toFixed(1) : 'N/A'}
              </span>
              {isFiniteNumber(place?.popularityScore) ? (
                <span>Popularity: {place.popularityScore}</span>
              ) : null}
            </div>

            <div className="d-flex gap-2" onClick={(e) => e.stopPropagation()}>
              {tab === "saved" ? (
                <>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => onToggleSave(id)}
                    disabled={disabled}
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => onMarkVisited(id)}
                    disabled={disabled}
                  >
                    Mark visited
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => onToggleSave(id)}
                  disabled={disabled}
                >
                  Save again
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const onToggleSave = async (id) => {
    if (!id) return;
    const idString = String(id);
    const place = places.find(p => String(p?._id) === idString);
    const placeName = place?.name || 'Place';
    
    try {
      setItemLoading(idString, true);
      const res = await toggleSavePlace(idString);
      const saved = !!res?.data?.saved;
      
      if (!saved && tab === "saved") {
        // Remove from list if unsaved
        setPlaces((prev) => prev.filter((p) => {
          const placeId = p?._id ? String(p._id) : null;
          return placeId !== idString;
        }));
        toast.info(`${placeName} removed from saved places.`, {
          position: "top-right",
          autoClose: 2000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
        });
      } else if (saved && tab === "saved") {
        // Reload to ensure the saved place appears with all its data
        await load(tab);
        toast.success(`${placeName} saved successfully!`, {
          position: "top-right",
          autoClose: 2000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
        });
      }
    } catch (e) {
      console.error("Toggle save failed:", e);
      toast.error("Failed to update saved places. Please try again.", {
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

  const onMarkVisited = async (id) => {
    if (!id) return;
    const idString = String(id);
    const place = places.find(p => String(p?._id) === idString);
    const placeName = place?.name || 'Place';
    
    try {
      setItemLoading(idString, true);
      await markPlaceVisited(idString);
      // If on saved tab, keep it saved (can be both saved and visited)
      // If on visited tab, reload to show updated list
      if (tab === "visited") {
        await load(tab);
      }
      toast.success(`${placeName} marked as visited!`, {
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

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
        <div>
          <h4 className="fw-bold mb-1">My Places</h4>
          <div className="text-muted small">
            Flow: Recommendations → <span className="fw-semibold">Save</span> for later, and{" "}
            <span className="fw-semibold">Mark visited</span> when you actually visit.
          </div>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={() => load(tab)} disabled={loading}>
          Refresh
        </button>
      </div>

      <div className="btn-group mb-3" role="tablist" aria-label="Saved and visited tabs">
        <button
          type="button"
          className={`btn btn-sm ${tab === "saved" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => setTab("saved")}
        >
          <FiBookmark className="me-1" /> Saved
        </button>
        <button
          type="button"
          className={`btn btn-sm ${tab === "visited" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => setTab("visited")}
        >
          <FiCheckCircle className="me-1" /> Visited
        </button>
      </div>

      {loading ? (
        <div className="text-muted">Loading...</div>
      ) : places.length === 0 ? (
        <div className="text-center py-4 text-muted">
          <p className="mb-0">{tab === "saved" ? "No saved places yet" : "No visited places yet"}</p>
          <small>{tab === "saved" ? "Save a place from Recommendations." : "Mark visited from Recommendations."}</small>
        </div>
      ) : (
        <div className="row g-3">
          {places.map((p) => {
            const id = p?._id;
            const disabled = !!actionLoading[id];
            
            return (
              <PlaceCard
                key={id}
                place={p}
                onToggleSave={onToggleSave}
                onMarkVisited={onMarkVisited}
                tab={tab}
                disabled={disabled}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}


