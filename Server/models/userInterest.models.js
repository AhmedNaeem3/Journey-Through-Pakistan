import mongoose from "mongoose";

/**
 * User Interest Profile Model
 * Tracks user interests based on saved posts and their tags
 */
const userInterestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    
    // Tag frequency tracking: { tag: count }
    // Using Object instead of Map for better MongoDB aggregation support
    tagWeights: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    
    // Alternative: Store as plain object for easier aggregation queries
    // This will be synced with tagWeights Map
    tagWeightsObj: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    
    // Last updated timestamp
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    
    // Total posts saved count
    totalSavedPosts: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
userInterestSchema.index({ user: 1 });
userInterestSchema.index({ lastUpdated: -1 });

// Helper method to increment tag weight
userInterestSchema.methods.incrementTagWeight = function(tag, increment = 1) {
  const normalizedTag = tag.toLowerCase().trim();
  const currentWeight = this.tagWeights.get(normalizedTag) || 0;
  this.tagWeights.set(normalizedTag, currentWeight + increment);
  
  // Sync with plain object for MongoDB aggregation
  if (!this.tagWeightsObj) {
    this.tagWeightsObj = {};
  }
  this.tagWeightsObj[normalizedTag] = currentWeight + increment;
  
  this.totalSavedPosts += increment;
  this.lastUpdated = new Date();
};

// Pre-save hook to sync tagWeights Map with tagWeightsObj
userInterestSchema.pre('save', function(next) {
  // Sync Map to object
  if (this.tagWeights && this.tagWeights instanceof Map) {
    this.tagWeightsObj = {};
    for (const [key, value] of this.tagWeights.entries()) {
      this.tagWeightsObj[key] = value;
    }
  }
  next();
});

// Helper method to get top tags
userInterestSchema.methods.getTopTags = function(limit = 10) {
  const entries = Array.from(this.tagWeights.entries());
  entries.sort((a, b) => b[1] - a[1]); // Sort by weight descending
  return entries.slice(0, limit).map(([tag, weight]) => ({ tag, weight }));
};

const UserInterest = mongoose.model("UserInterest", userInterestSchema);

export default UserInterest;

