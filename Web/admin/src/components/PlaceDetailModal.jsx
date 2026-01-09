import { useState, useEffect } from 'react';
import { FiX, FiMapPin, FiTag, FiDollarSign, FiStar, FiUser, FiCalendar, FiImage, FiVideo, FiAlertTriangle, FiCheck, FiXCircle } from 'react-icons/fi';
import { getPlaceById } from '../api/adminApi';
import './PlaceDetailModal.css';

const PlaceDetailModal = ({ isOpen, onClose, placeId, onApprove, onReject }) => {
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (isOpen && placeId) {
      fetchPlaceDetails();
    } else {
      setPlace(null);
      setError(null);
    }
  }, [isOpen, placeId]);

  const fetchPlaceDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getPlaceById(placeId);
      setPlace(response.data.place);
    } catch (err) {
      console.error('Error fetching place details:', err);
      setError(err?.response?.data?.message || 'Failed to load place details');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!onApprove) return;
    setActionLoading(true);
    try {
      await onApprove(placeId);
      onClose();
    } catch (err) {
      console.error('Error approving place:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!onReject) return;
    const reason = window.prompt('Rejection reason (optional):') || 'Rejected by admin';
    if (reason === null) return; // User cancelled
    
    setActionLoading(true);
    try {
      await onReject(placeId, reason);
      onClose();
    } catch (err) {
      console.error('Error rejecting place:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content place-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Place Details</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="modal-body">
          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading place details...</p>
            </div>
          )}

          {error && (
            <div className="error-state">
              <FiAlertTriangle className="error-icon" />
              <p>{error}</p>
              <button className="retry-btn" onClick={fetchPlaceDetails}>
                Retry
              </button>
            </div>
          )}

          {!loading && !error && place && (
            <>
              {/* Status Badge */}
              <div className="detail-section">
                <div className={`status-badge status-${place.status}`}>
                  {place.status === 'approved' && <FiCheck />}
                  {place.status === 'rejected' && <FiXCircle />}
                  {place.status === 'pending' && <FiAlertTriangle />}
                  <span>{place.status?.charAt(0).toUpperCase() + place.status?.slice(1)}</span>
                </div>
              </div>

              {/* Place Name */}
              <div className="detail-section">
                <h3 className="place-name">{place.name || 'Untitled Place'}</h3>
              </div>

              {/* Media Gallery */}
              {place.media && place.media.length > 0 && (
                <div className="detail-section">
                  <h4 className="section-title">
                    <FiImage className="section-icon" />
                    Media ({place.media.length})
                  </h4>
                  <div className="media-gallery">
                    {place.media.map((item, index) => (
                      <div key={index} className="media-item">
                        {item.type === 'image' ? (
                          <img src={item.url} alt={`${place.name} - Image ${index + 1}`} />
                        ) : (
                          <video src={item.url} controls />
                        )}
                        <div className="media-type-badge">
                          {item.type === 'image' ? <FiImage /> : <FiVideo />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {place.description && (
                <div className="detail-section">
                  <h4 className="section-title">Description</h4>
                  <p className="description-text">{place.description}</p>
                </div>
              )}

              {/* Location Information */}
              <div className="detail-section">
                <h4 className="section-title">
                  <FiMapPin className="section-icon" />
                  Location
                </h4>
                <div className="info-grid">
                  {place.address && (
                    <div className="info-item">
                      <span className="info-label">Address:</span>
                      <span className="info-value">{place.address}</span>
                    </div>
                  )}
                  {place.latitude && place.longitude && (
                    <>
                      <div className="info-item">
                        <span className="info-label">Latitude:</span>
                        <span className="info-value">{place.latitude}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Longitude:</span>
                        <span className="info-value">{place.longitude}</span>
                      </div>
                    </>
                  )}
                  {place.googlePlaceId && (
                    <div className="info-item">
                      <span className="info-label">Google Place ID:</span>
                      <span className="info-value code">{place.googlePlaceId}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tags */}
              {place.tags && place.tags.length > 0 && (
                <div className="detail-section">
                  <h4 className="section-title">
                    <FiTag className="section-icon" />
                    Tags
                  </h4>
                  <div className="tags-container">
                    {place.tags.map((tag, index) => (
                      <span key={index} className="tag-badge">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Types */}
              {place.types && place.types.length > 0 && (
                <div className="detail-section">
                  <h4 className="section-title">Place Types</h4>
                  <div className="tags-container">
                    {place.types.map((type, index) => (
                      <span key={index} className="type-badge">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Cost & Rating */}
              <div className="detail-section">
                <h4 className="section-title">Additional Information</h4>
                <div className="info-grid">
                  {place.estimatedCost > 0 && (
                    <div className="info-item">
                      <FiDollarSign className="info-icon" />
                      <span className="info-label">Estimated Cost:</span>
                      <span className="info-value">PKR {place.estimatedCost.toLocaleString()}</span>
                    </div>
                  )}
                  {place.rating > 0 && (
                    <div className="info-item">
                      <FiStar className="info-icon" />
                      <span className="info-label">Rating:</span>
                      <span className="info-value">{place.rating.toFixed(1)} / 5.0</span>
                    </div>
                  )}
                  {place.popularityScore > 0 && (
                    <div className="info-item">
                      <span className="info-label">Popularity Score:</span>
                      <span className="info-value">{place.popularityScore.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Submission Info */}
              <div className="detail-section">
                <h4 className="section-title">
                  <FiUser className="section-icon" />
                  Submission Information
                </h4>
                <div className="info-grid">
                  {place.submittedBy && (
                    <>
                      <div className="info-item">
                        <span className="info-label">Submitted By:</span>
                        <span className="info-value">
                          {place.submittedBy.name || place.submittedBy.email || 'Unknown'}
                        </span>
                      </div>
                      {place.submittedBy.role && (
                        <div className="info-item">
                          <span className="info-label">User Role:</span>
                          <span className="info-value">{place.submittedBy.role}</span>
                        </div>
                      )}
                    </>
                  )}
                  {place.createdAt && (
                    <div className="info-item">
                      <FiCalendar className="info-icon" />
                      <span className="info-label">Submitted On:</span>
                      <span className="info-value">{formatDate(place.createdAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Review Information */}
              {(place.reviewedBy || place.reviewedAt) && (
                <div className="detail-section">
                  <h4 className="section-title">Review Information</h4>
                  <div className="info-grid">
                    {place.reviewedBy && (
                      <div className="info-item">
                        <span className="info-label">Reviewed By:</span>
                        <span className="info-value">
                          {place.reviewedBy.name || place.reviewedBy.email || 'Admin'}
                        </span>
                      </div>
                    )}
                    {place.reviewedAt && (
                      <div className="info-item">
                        <FiCalendar className="info-icon" />
                        <span className="info-label">Reviewed On:</span>
                        <span className="info-value">{formatDate(place.reviewedAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Rejection Reason */}
              {place.rejectionReason && (
                <div className="detail-section">
                  <div className="rejection-reason-box">
                    <FiAlertTriangle className="rejection-icon" />
                    <div>
                      <h4 className="rejection-title">Rejection Reason</h4>
                      <p className="rejection-text">{place.rejectionReason}</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Actions */}
        {!loading && !error && place && place.status === 'pending' && (
          <div className="modal-actions">
            <button className="btn-cancel" onClick={onClose} disabled={actionLoading}>
              Close
            </button>
            {onReject && (
              <button 
                className="btn-reject" 
                onClick={handleReject} 
                disabled={actionLoading}
              >
                <FiXCircle />
                Reject
              </button>
            )}
            {onApprove && (
              <button 
                className="btn-approve" 
                onClick={handleApprove} 
                disabled={actionLoading}
              >
                <FiCheck />
                {actionLoading ? 'Processing...' : 'Approve'}
              </button>
            )}
          </div>
        )}

        {!loading && !error && place && place.status !== 'pending' && (
          <div className="modal-actions">
            <button className="btn-cancel" onClick={onClose}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaceDetailModal;
