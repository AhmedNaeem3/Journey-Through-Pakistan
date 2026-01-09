# Frontend Integration - Personalized Recommendation System

## Overview
The frontend has been fully integrated with the personalized recommendation system backend. Users can now save posts with hashtags, and the system will automatically fetch places from Google Maps and provide personalized recommendations.

## Updated Files

### 1. API Layer (`src/api/recommendationsApi.jsx`)
- **Updated**: `getPersonalizedRecommendations()` to use new endpoint `/api/recommendations/personalized`
- **Added**: `getUserInterests()` to fetch user interest profile
- **Changes**: Converts `lat/lng` params to `latitude/longitude` for new API

### 2. Recommendations Page (`src/pages/Recommendations.jsx`)
**Major Updates:**
- ✅ Displays place images from Google Maps
- ✅ Shows per-place recommendation reasons
- ✅ Displays matched tags for each recommendation
- ✅ Shows distance, rating, and address
- ✅ User interests display section (toggleable)
- ✅ Enhanced card design with images

**New Features:**
- Place images from `place.images` array
- Per-place `reasonForRecommendation` display
- Matched tags badges
- User interests section showing tag weights
- Better visual hierarchy

### 3. Post Detail Page (`src/pages/PostDetail.jsx`)
**Added:**
- ✅ Save post functionality with handler
- ✅ Save state management
- ✅ Notification when post is saved
- ✅ Visual feedback (bookmark icon fill)

### 4. Community Page (`src/pages/Community.jsx`)
**Enhanced:**
- ✅ Improved save post handler
- ✅ Logs tag processing information

## API Endpoints Used

### 1. Get Personalized Recommendations
```javascript
GET /api/recommendations/personalized?latitude=31.5497&longitude=74.3436
```

**Response Structure:**
```json
{
  "success": true,
  "recommendations": [
    {
      "_id": "...",
      "name": "Badshahi Mosque",
      "description": "...",
      "address": "Lahore, Pakistan",
      "coordinates": {
        "latitude": 31.5880,
        "longitude": 74.3099
      },
      "images": ["https://..."],
      "rating": 4.7,
      "tags": ["historical", "architecture"],
      "types": ["mosque", "tourist_attraction"],
      "reasonForRecommendation": "Based on your interest in 'historical' (saved 12 times)",
      "matchedTags": ["historical"],
      "score": 92.5,
      "distanceMeters": 15234
    }
  ],
  "count": 10
}
```

### 2. Get User Interests
```javascript
GET /api/recommendations/interests
```

**Response Structure:**
```json
{
  "success": true,
  "interests": [
    { "tag": "historical", "weight": 12 },
    { "tag": "architecture", "weight": 8 }
  ],
  "totalSavedPosts": 25,
  "lastUpdated": "2024-01-15T10:30:00Z"
}
```

### 3. Save Post (Existing, Enhanced Backend)
```javascript
POST /api/posts/:id/save
```

**Response:**
```json
{
  "saved": true,
  "message": "Post saved"
}
```

## User Flow

### 1. Save Post with Hashtags
```
User saves post → Backend extracts hashtags → Updates user interest profile → 
Fetches places from Google Maps (async) → Saves places to database
```

### 2. View Recommendations
```
User visits Recommendations page → Fetches personalized recommendations → 
Displays places with images, reasons, and matched tags
```

### 3. View User Interests
```
User clicks "Show your interests" → Displays tag weights from saved posts → 
Shows how many times each tag was saved
```

## UI Components

### Recommendation Card
- **Image**: First image from `place.images` or placeholder
- **Rating Badge**: Top-right corner with star icon
- **Name**: Place name (bold)
- **Address**: Below name (muted)
- **Description**: Truncated to 2 lines
- **Distance & Rating**: Icons with values
- **Matched Tags**: Badges showing matched interest tags
- **Reason**: Italic text explaining why recommended
- **Actions**: Save and Mark Visited buttons

### User Interests Section
- **Toggle Button**: Show/Hide interests
- **Tag Badges**: Display tag name and weight (frequency)
- **Tooltip**: Shows "Saved X times" on hover
- **Helper Text**: Encourages saving more posts

## Styling

### Recommendation Cover Image
```css
.recommendation-cover {
  background-image: url(...);
  background-size: cover;
  background-position: center;
  height: 200px;
  border-radius: 8px 8px 0 0;
}
```

### Tag Badges
- Primary color for matched tags
- Info color for user interests
- Responsive flex-wrap layout

## Error Handling

- ✅ Graceful fallback if recommendations fail to load
- ✅ Empty state message when no recommendations
- ✅ Error logging for debugging
- ✅ Loading states for all async operations

## Future Enhancements

1. **Real-time Updates**: Refresh recommendations when new posts are saved
2. **Interest Management**: Allow users to manually add/remove interests
3. **Recommendation Feedback**: Thumbs up/down to improve recommendations
4. **Place Details Modal**: Click to see full place information
5. **Share Recommendations**: Share recommended places with friends

## Testing Checklist

- [x] Save post with hashtags
- [x] View recommendations page
- [x] Display place images
- [x] Show recommendation reasons
- [x] Display matched tags
- [x] Toggle user interests display
- [x] Save/unsave places
- [x] Mark places as visited
- [x] Handle empty states
- [x] Handle loading states
- [x] Error handling

## Notes

- Place fetching happens asynchronously in the background
- Recommendations update based on saved posts over time
- User interests are automatically updated when posts are saved/unsaved
- Images are loaded from Google Maps Places API photo references

