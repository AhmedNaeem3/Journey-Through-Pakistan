import UserInterest from "../models/userInterest.models.js";

/**
 * Update user interest profile based on various actions
 * @param {string} userId - User ID
 * @param {Array<string>} tags - Tags to increment
 * @param {number} increment - Increment value (default: 1)
 * @param {string} actionType - Type of action (post_created, post_liked, place_viewed, landmark_used)
 */
export async function updateUserInterests(userId, tags, increment = 1, actionType = "post_created") {
  if (!userId || !tags || tags.length === 0) {
    return;
  }

  try {
    // Find or create user interest profile
    let userInterest = await UserInterest.findOne({ user: userId });

    if (!userInterest) {
      userInterest = new UserInterest({
        user: userId,
        tagWeights: new Map(),
        tagWeightsObj: {},
        totalSavedPosts: 0,
      });
    }

    // Normalize and increment tags
    const normalizedTags = tags
      .map(tag => {
        // Remove # symbol and normalize
        let normalized = tag.replace(/^#+/, "").trim().toLowerCase();
        return normalized;
      })
      .filter(tag => tag.length > 0);

    // Increment weights for each tag
    for (const tag of normalizedTags) {
      userInterest.incrementTagWeight(tag, increment);
    }

    // Update total saved posts only for post_created action
    if (actionType === "post_created" || actionType === "post_saved") {
      userInterest.totalSavedPosts += increment;
    }

    userInterest.lastUpdated = new Date();
    await userInterest.save();
  } catch (error) {
    console.error(`❌ Error updating user interests for ${userId}:`, error.message);
    // Don't throw - this is non-critical
  }
}

/**
 * Extract tags from post text
 * @param {string} text - Post text
 * @returns {Array<string>} - Array of hashtags
 */
export function extractTagsFromText(text) {
  if (!text || typeof text !== "string") return [];
  
  // Match hashtags: #word or #wordWord
  const hashtagRegex = /#(\w+)/g;
  const matches = text.matchAll(hashtagRegex);
  
  return Array.from(matches, match => match[1]);
}

/**
 * Extract tags from post object
 * @param {Object} post - Post object
 * @returns {Array<string>} - Array of tags
 */
export function extractTagsFromPost(post) {
  if (!post) return [];
  
  const tags = [];
  
  // Extract from text
  if (post.text) {
    tags.push(...extractTagsFromText(post.text));
  }
  
  // Extract from hashtags array if present
  if (Array.isArray(post.hashtags)) {
    tags.push(...post.hashtags.map(tag => tag.replace(/^#+/, "")));
  }
  
  // Extract from tags array if present
  if (Array.isArray(post.tags)) {
    tags.push(...post.tags.map(tag => tag.replace(/^#+/, "")));
  }
  
  return [...new Set(tags)]; // Remove duplicates
}
