import mongoose from "mongoose";
import Place from "../models/place.models.js";

const ADMIN_PLACE_FIELDS =
  "name address description media tags estimatedCost rating popularityScore status submittedBy reviewedBy reviewedAt rejectionReason createdAt";

export const getPendingPlaces = async (req, res) => {
  try {
    // Only get places that were submitted by users (not auto-fetched from Google Maps)
    const places = await Place.find({ 
      status: "pending",
      submittedBy: { $exists: true, $ne: null } // Only user-suggested places
    })
      .select(ADMIN_PLACE_FIELDS)
      .populate("submittedBy", "name email role")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ places });
  } catch (error) {
    console.error("Error fetching pending places:", error);
    return res.status(500).json({ message: "Failed to fetch pending places" });
  }
};

/**
 * Get all places (with optional status filter)
 * GET /admin/places?status=pending|approved|rejected
 * 
 * Only returns places that were suggested by users (local users),
 * not places automatically fetched from Google Maps via landmark identifier.
 */
export const getAllPlaces = async (req, res) => {
  try {
    const { status } = req.query;
    
    // Build query - only get places that were submitted by users (not auto-fetched)
    // Places from landmark identifier don't have submittedBy field
    const query = {
      submittedBy: { $exists: true, $ne: null } // Only user-suggested places
    };
    
    // Add status filter if provided
    if (status && (status === 'pending' || status === 'approved' || status === 'rejected')) {
      query.status = status;
    } else if (status === 'all' || !status) {
      // Get all statuses including null (for backward compatibility)
      query.$or = [
        { status: { $in: ['pending', 'approved', 'rejected'] } },
        { status: null } // Include old places without status
      ];
    }

    const places = await Place.find(query)
      .select(ADMIN_PLACE_FIELDS)
      .populate("submittedBy", "name email role")
      .populate("reviewedBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ places });
  } catch (error) {
    console.error("Error fetching places:", error);
    return res.status(500).json({ message: "Failed to fetch places" });
  }
};

export const approvePlace = async (req, res) => {
  try {
    const { placeId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(placeId)) {
      return res.status(400).json({ message: "Invalid placeId" });
    }

    const updated = await Place.findByIdAndUpdate(
      placeId,
      {
        $set: {
          status: "approved",
          reviewedBy: req.user?._id,
          reviewedAt: new Date(),
          rejectionReason: null,
        },
      },
      { new: true }
    ).select(ADMIN_PLACE_FIELDS);

    if (!updated) return res.status(404).json({ message: "Place not found" });

    return res.json({ message: "Place approved", place: updated });
  } catch (error) {
    console.error("Error approving place:", error);
    return res.status(500).json({ message: "Failed to approve place" });
  }
};

export const rejectPlace = async (req, res) => {
  try {
    const { placeId } = req.params;
    const { reason } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(placeId)) {
      return res.status(400).json({ message: "Invalid placeId" });
    }

    const updated = await Place.findByIdAndUpdate(
      placeId,
      {
        $set: {
          status: "rejected",
          reviewedBy: req.user?._id,
          reviewedAt: new Date(),
          rejectionReason: typeof reason === "string" ? reason.trim() : "Rejected by admin",
        },
      },
      { new: true }
    ).select(ADMIN_PLACE_FIELDS);

    if (!updated) return res.status(404).json({ message: "Place not found" });

    return res.json({ message: "Place rejected", place: updated });
  } catch (error) {
    console.error("Error rejecting place:", error);
    return res.status(500).json({ message: "Failed to reject place" });
  }
};

/**
 * Get place by ID with full details
 * GET /admin/places/:placeId
 */
export const getPlaceById = async (req, res) => {
  try {
    const { placeId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(placeId)) {
      return res.status(400).json({ message: "Invalid placeId" });
    }

    const place = await Place.findById(placeId)
      .select(ADMIN_PLACE_FIELDS + " latitude longitude googlePlaceId types")
      .populate("submittedBy", "name email role profilePicture")
      .populate("reviewedBy", "name email")
      .lean();

    if (!place) {
      return res.status(404).json({ message: "Place not found" });
    }

    return res.json({ place });
  } catch (error) {
    console.error("Error fetching place:", error);
    return res.status(500).json({ message: "Failed to fetch place details" });
  }
};

/**
 * Batch approve multiple places
 * POST /admin/places/batch-approve
 */
export const batchApprovePlaces = async (req, res) => {
  try {
    const { placeIds } = req.body;

    if (!Array.isArray(placeIds) || placeIds.length === 0) {
      return res.status(400).json({ message: "placeIds array is required" });
    }

    // Validate all IDs
    const validIds = placeIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return res.status(400).json({ message: "No valid place IDs provided" });
    }

    const result = await Place.updateMany(
      { _id: { $in: validIds }, status: "pending" },
      {
        $set: {
          status: "approved",
          reviewedBy: req.user?._id,
          reviewedAt: new Date(),
          rejectionReason: null,
        },
      }
    );

    return res.json({
      message: `Successfully approved ${result.modifiedCount} place(s)`,
      approvedCount: result.modifiedCount,
      totalRequested: validIds.length,
    });
  } catch (error) {
    console.error("Error batch approving places:", error);
    return res.status(500).json({ message: "Failed to batch approve places" });
  }
};

/**
 * Batch reject multiple places
 * POST /admin/places/batch-reject
 */
export const batchRejectPlaces = async (req, res) => {
  try {
    const { placeIds, reason } = req.body;

    if (!Array.isArray(placeIds) || placeIds.length === 0) {
      return res.status(400).json({ message: "placeIds array is required" });
    }

    // Validate all IDs
    const validIds = placeIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return res.status(400).json({ message: "No valid place IDs provided" });
    }

    const rejectionReason = typeof reason === "string" ? reason.trim() : "Rejected by admin";

    const result = await Place.updateMany(
      { _id: { $in: validIds }, status: "pending" },
      {
        $set: {
          status: "rejected",
          reviewedBy: req.user?._id,
          reviewedAt: new Date(),
          rejectionReason: rejectionReason,
        },
      }
    );

    return res.json({
      message: `Successfully rejected ${result.modifiedCount} place(s)`,
      rejectedCount: result.modifiedCount,
      totalRequested: validIds.length,
    });
  } catch (error) {
    console.error("Error batch rejecting places:", error);
    return res.status(500).json({ message: "Failed to batch reject places" });
  }
};


