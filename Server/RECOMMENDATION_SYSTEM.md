# Personalized Recommendation System Documentation

## Overview
This system provides personalized place recommendations based on user-saved posts and their interest tags. When users save posts with hashtags, the system extracts tags, searches Google Maps Places API, and builds a personalized recommendation engine.

## Architecture

### Models

#### 1. UserInterest Model (`models/userInterest.models.js`)
Tracks user interest profiles based on saved posts:
- `user`: Reference to User
- `tagWeights`: Map of tag -> frequency count
- `tagWeightsObj`: Plain object version for MongoDB aggregation
- `totalSavedPosts`: Total count of saved posts
- `lastUpdated`: Timestamp of last update

#### 2. Place Model (existing, enhanced)
Stores places fetched from Google Maps:
- `googlePlaceId`: Unique Google Place ID
- `name`, `address`, `description`
- `latitude`, `longitude`, `location` (GeoJSON)
- `tags`: Array of interest tags
- `rating`, `popularityScore`
- `media`: Array of images/videos
- `source`: "google_maps"
- `fetchedAt`: Timestamp

### Services

#### 1. Google Maps Service (`services/googleMapsService.js`)
- `normalizeTag(tag)`: Converts tags like "#badshahiMosque" → "Badshahi Mosque"
- `searchPlaces(query)`: Text Search API with caching
- `getPlaceDetails(placeId)`: Place Details API with caching
- `processTagAndFetchPlaces(tag)`: Complete workflow to fetch and process places

#### 2. Recommendation Service (`services/recommendationService.js`)
Enhanced with tag weight scoring:
- Combines predefined interests + saved post tags
- Weighted scoring based on tag frequency
- Distance, rating, and popularity scoring

### API Endpoints

#### POST `/api/posts/:id/save`
**Updated functionality:**
- Extracts hashtags from saved post
- Updates user interest profile (increments tag weights)
- Fetches places from Google Maps for each tag (async)
- Saves places to database

**Request:**
```http
POST /api/posts/:id/save
Authorization: Bearer <token>
```

**Response:**
```json
{
  "saved": true,
  "message": "Post saved"
}
```

#### GET `/api/recommendations/personalized`
**Get personalized recommendations**

**Request:**
```http
GET /api/recommendations/personalized?latitude=31.5497&longitude=74.3436
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "recommendations": [
    {
      "_id": "...",
      "name": "Badshahi Mosque",
      "description": "Historic mosque in Lahore...",
      "address": "Lahore, Punjab, Pakistan",
      "coordinates": {
        "latitude": 31.5880,
        "longitude": 74.3099
      },
      "images": ["https://..."],
      "rating": 4.7,
      "tags": ["historical", "architecture"],
      "types": ["mosque", "tourist_attraction"],
      "reasonForRecommendation": "Based on your interest in 'historical' (saved 5 times)",
      "matchedTags": ["historical"],
      "score": 85.5,
      "distanceMeters": 15234
    }
  ],
  "count": 10
}
```

#### GET `/api/recommendations/interests`
**Get user interest profile**

**Request:**
```http
GET /api/recommendations/interests
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "interests": [
    { "tag": "historical", "weight": 12 },
    { "tag": "architecture", "weight": 8 },
    { "tag": "culture", "weight": 5 }
  ],
  "totalSavedPosts": 25,
  "lastUpdated": "2024-01-15T10:30:00Z"
}
```

## Workflow

### 1. User Saves a Post
```
User saves post with hashtags: #badshahiMosque #historical #architecture
  ↓
Extract tags: ["badshahiMosque", "historical", "architecture"]
  ↓
Normalize tags: ["Badshahi Mosque", "Historical", "Architecture"]
  ↓
Update UserInterest profile (increment tag weights)
  ↓
For each tag:
  - Search Google Maps: "Badshahi Mosque Pakistan"
  - Get place details
  - Save to Place collection (avoid duplicates by googlePlaceId)
```

### 2. Get Recommendations
```
User requests recommendations
  ↓
Get UserInterest profile
  ↓
Combine predefined interests + saved post tags
  ↓
Query Place collection with:
  - Tag matching (weighted)
  - Distance (if location provided)
  - Rating & popularity
  ↓
Rank and return top 10 places
```

## Tag Normalization Examples

| Input | Output |
|-------|--------|
| `#badshahiMosque` | `Badshahi Mosque` |
| `#historical` | `Historical` |
| `#architecture` | `Architecture` |
| `badshahi mosque` | `Badshahi Mosque` |
| `HISTORICAL` | `Historical` |

## Caching Strategy

- **Google Maps API responses**: Cached in-memory for 24 hours
- **Cache keys**: `search:{query}` and `details:{placeId}`
- **Future enhancement**: Can be replaced with Redis for distributed caching

## Performance Considerations

1. **Async Processing**: Place fetching happens asynchronously (doesn't block save response)
2. **Duplicate Prevention**: Uses `googlePlaceId` to avoid duplicate places
3. **Aggregation Pipeline**: Uses MongoDB aggregation for efficient scoring
4. **Candidate Limiting**: Limits to 600 candidates before scoring
5. **Result Limiting**: Returns top 10 recommendations

## Security

- ✅ API keys stored in environment variables
- ✅ Never exposed to frontend
- ✅ Server-side only Google Maps API calls
- ✅ User authentication required for all endpoints

## Error Handling

- Graceful fallback if Google Maps API fails
- Continues processing other tags if one fails
- Logs errors without breaking user experience
- Returns empty arrays if no places found

## Sample Response JSON

```json
{
  "success": true,
  "recommendations": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Badshahi Mosque",
      "description": "The Badshahi Mosque is a Mughal era mosque in Lahore...",
      "address": "Fort Rd, Walled City, Lahore, Punjab 54000, Pakistan",
      "coordinates": {
        "latitude": 31.5880,
        "longitude": 74.3099
      },
      "images": [
        "https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=...&key=..."
      ],
      "rating": 4.7,
      "tags": ["historical", "architecture", "mosque"],
      "types": ["mosque", "place_of_worship", "tourist_attraction"],
      "reasonForRecommendation": "Based on your interest in 'historical' (saved 12 times)",
      "matchedTags": ["historical", "architecture"],
      "score": 92.5,
      "distanceMeters": 15234
    }
  ],
  "count": 10
}
```

## Future Enhancements

1. Redis caching for distributed systems
2. Machine learning for better recommendations
3. Real-time recommendation updates
4. Batch processing for multiple tags
5. User feedback loop (thumbs up/down on recommendations)

