# Journey Through Pakistan - Complete Project Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Database Models](#database-models)
6. [Authentication & Authorization](#authentication--authorization)
7. [API Endpoints](#api-endpoints)
8. [Frontend Pages & Features](#frontend-pages--features)
9. [Real-Time Features (Socket.IO)](#real-time-features-socketio)
10. [AI Integration](#ai-integration)
11. [Google APIs Integration](#google-apis-integration)
12. [File Upload & Media Management](#file-upload--media-management)
13. [Recommendation System](#recommendation-system)
14. [Landmark Identification System](#landmark-identification-system)
15. [Implementation Details](#implementation-details)

---

## Project Overview

**Journey Through Pakistan** is a comprehensive full-stack travel and tourism platform that helps users discover, explore, and share experiences about landmarks and places across Pakistan. The platform combines AI-powered landmark recognition, real-time social features, personalized recommendations, and location-based services.

### Key Capabilities
- **AI-Powered Landmark Recognition**: Multi-step detection system using Google Vision API
- **Real-Time Communication**: Socket.IO-based messaging, notifications, and video calling
- **Personalized Recommendations**: ML-based recommendation engine using user interests and saved posts
- **Social Media Features**: Posts, stories, comments, likes, hashtags
- **Location Services**: GPS tracking, Google Maps integration, distance calculations
- **Admin Management**: Comprehensive admin panel for content moderation and analytics

---

## Architecture

### Three-Tier Architecture

```
┌─────────────────────────────────────────────────┐
│         Presentation Layer                       │
│  ┌──────────────┐  ┌──────────────┐            │
│  │  React.js    │  │ React Native │            │
│  │  (Web App)   │  │ (Mobile App) │            │
│  └──────────────┘  └──────────────┘            │
└─────────────────────────────────────────────────┘
                    │
                    │ HTTP/REST + WebSocket
                    ▼
┌─────────────────────────────────────────────────┐
│         Application Layer                        │
│  ┌──────────────────────────────────────────┐  │
│  │  Node.js + Express.js                     │  │
│  │  - RESTful API                            │  │
│  │  - Socket.IO Server                       │  │
│  │  - Authentication Middleware             │  │
│  │  - File Upload Handling                   │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                    │
                    │ Mongoose ODM
                    ▼
┌─────────────────────────────────────────────────┐
│         Data Layer                               │
│  ┌──────────────────────────────────────────┐  │
│  │  MongoDB Atlas                            │  │
│  │  - User Data                              │  │
│  │  - Posts & Content                       │  │
│  │  - Places & Landmarks                    │  │
│  │  - Messages & Conversations             │  │
│  │  - Notifications                         │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### Real-Time Communication Architecture

```
Client (React/React Native)
    │
    ├─► HTTP REST API (Express.js)
    │   └─► MongoDB
    │
    └─► WebSocket (Socket.IO)
        ├─► Real-time Messages
        ├─► Notifications
        ├─► Online Status
        └─► Video Call Signaling
```

---

## Technology Stack

### Backend (Server)
- **Runtime**: Node.js
- **Framework**: Express.js 5.1.0
- **Database**: MongoDB (MongoDB Atlas)
- **ODM**: Mongoose 8.17.0
- **Real-Time**: Socket.IO 4.8.1
- **Authentication**: JWT (jsonwebtoken 9.0.2)
- **Password Hashing**: bcrypt 6.0.0
- **File Upload**: Multer 2.0.2
- **Cloud Storage**: Cloudinary 1.41.0
- **Email**: Nodemailer 7.0.5
- **Scheduling**: node-cron 4.2.1
- **HTTP Client**: Axios
- **Environment**: dotenv 17.2.1

### Frontend - Web User App
- **Framework**: React 19.1.1
- **Routing**: react-router-dom 7.9.1
- **HTTP Client**: Axios 1.12.2
- **Real-Time**: socket.io-client 4.8.1
- **UI Library**: Bootstrap 5.3.8, react-bootstrap 2.10.10
- **Icons**: react-icons 5.5.0
- **Animations**: framer-motion 12.23.13
- **Charts**: recharts 3.3.0
- **Notifications**: react-toastify 11.0.5
- **Build Tool**: Vite 7.1.2

### Frontend - Admin Panel
- **Framework**: React 19.1.1
- **Routing**: react-router-dom 6.26.0
- **HTTP Client**: Axios 1.6.0
- **Charts**: recharts 2.12.0
- **Icons**: react-icons 5.2.1
- **Build Tool**: Vite 7.1.7

### External APIs & Services
- **AI**: Google Gemini AI (gemini-2.5-flash-lite)
- **Maps**: Google Maps API, Google Places API
- **Vision**: Google Cloud Vision API
- **Authentication**: Google OAuth2
- **Places**: Foursquare API
- **Text Analysis**: TextRazor API

---

## Project Structure

```
Journey-Through-Pakistan/
├── Server/                    # Backend Node.js Application
│   ├── controller/            # Business logic controllers
│   ├── routers/              # API route definitions
│   ├── models/               # MongoDB Mongoose models
│   ├── middleware/           # Express middleware
│   ├── services/             # Business services
│   ├── utils/                # Utility functions
│   ├── cronJobs/             # Scheduled tasks
│   ├── backups/              # Database backups
│   ├── index.js              # Server entry point
│   └── connection.js        # MongoDB connection
│
├── Web/
│   ├── user/                 # User-facing web application
│   │   ├── src/
│   │   │   ├── pages/        # Page components
│   │   │   ├── components/   # Reusable components
│   │   │   ├── api/          # API client functions
│   │   │   ├── context/      # React Context providers
│   │   │   └── utils/        # Utility functions
│   │   └── package.json
│   │
│   └── admin/                # Admin panel web application
│       ├── src/
│       │   ├── pages/        # Admin pages
│       │   ├── components/   # Admin components
│       │   └── api/          # Admin API clients
│       └── package.json
│
└── Mobile/                   # React Native mobile apps
    ├── user/                 # User mobile app
    └── admin/                # Admin mobile app
```

---

## Database Models

### 1. User Model (`user.models.js`)
**Purpose**: Stores user account information and profile data

**Key Fields**:
- `name`, `email`, `password` (hashed with bcrypt)
- `role`: "tourist" | "local"
- `isAdmin`: Boolean
- `adminRole`: "ceo" | "supervisor" | "manager" | "team_admin" | null
- `phone`, `city`, `bio`
- `profilePicture`, `coverPicture`
- `interests`: Array of predefined interests
- `travelTime`: "1_day" | "3_days" | "7_days"
- `friends`: Array of user IDs
- `friendRequests`: Array of pending requests
- `sentRequests`: Array of sent requests
- `visitedPlaces`: Array of place IDs
- `savedPlaces`: Array of place IDs
- `auth0Id`: For Google OAuth integration

**Indexes**: `email` (unique), `auth0Id` (sparse)

### 2. Place Model (`place.models.js`)
**Purpose**: Stores place/landmark information from Google Places API and user submissions

**Key Fields**:
- `googlePlaceId`: Unique Google Place ID (indexed, sparse, unique)
- `name`, `address`, `description`
- `latitude`, `longitude`
- `location`: GeoJSON Point for geospatial queries
- `tags`: Array of interest tags (lowercase)
- `types`: Array of Google Place types
- `rating`, `user_ratings_total`
- `popularityScore`: Calculated popularity metric
- `estimatedCost`: Number
- `media`: Array of image/video objects
- `photos`: Array of photo URLs
- `status`: "approved" | "pending" | "rejected"
- `source`: "google_maps" | "user_submission"
- `submittedBy`: Reference to User (for user-submitted places)
- `reviewedBy`: Reference to User (admin who reviewed)
- `rejectionReason`: String (if rejected)

**Indexes**: `googlePlaceId` (sparse, unique), `location` (2dsphere), `popularityScore`, `status`

### 3. Post Model (`post.models.js`)
**Purpose**: Stores user-generated posts in the community feed

**Key Fields**:
- `author`: Reference to User
- `text`: Post content
- `imageUrl`: Cloudinary URL
- `hashtags`: Array of hashtag strings
- `place`: String (location name)
- `likes`: Array of user IDs
- `comments`: Array of comment objects
- `savedBy`: Array of user IDs
- `reports`: Array of report objects

**Indexes**: `author`, `createdAt` (for sorting)

### 4. Message Model (`message.models.js`)
**Purpose**: Stores individual chat messages

**Key Fields**:
- `conversationId`: Reference to Conversation
- `sender`: Reference to User
- `recipient`: Reference to User
- `text`: Message content
- `imageUrl`: Cloudinary URL (optional)
- `readAt`: Timestamp
- `edited`: Boolean
- `editedAt`: Timestamp
- `deleted`: Boolean

**Indexes**: `conversationId`, `sender`, `recipient`, `createdAt`

### 5. Conversation Model (`conversation.models.js`)
**Purpose**: Manages chat conversations between users

**Key Fields**:
- `participants`: Array of 2 user IDs
- `lastMessage`: Reference to Message
- `lastMessageAt`: Timestamp

**Indexes**: `participants` (for quick lookup)

### 6. Notification Model (`notification.models.js`)
**Purpose**: Stores system notifications for users

**Key Fields**:
- `user`: Reference to User (recipient)
- `type`: Notification type (e.g., "like", "comment", "friend_request")
- `actor`: Reference to User (who triggered the notification)
- `message`: Notification text
- `post`: Reference to Post (if related)
- `status`: Reference to Status (if related)
- `readAt`: Timestamp
- `createdAt`: Timestamp

**Indexes**: `user`, `readAt`, `createdAt`

### 7. Group Model (`group.models.js`)
**Purpose**: Manages community groups

**Key Fields**:
- `name`, `description`
- `admin`: Reference to User
- `members`: Array of user IDs
- `pendingRequests`: Array of user IDs
- `privacy`: "public" | "private"
- `category`: String
- `location`: String
- `coverPicture`: String

### 8. Status Model (`status.models.js`)
**Purpose**: Stores temporary status updates (stories feature)

**Key Fields**:
- `author`: Reference to User
- `text`: Status content
- `imageUrl`: Cloudinary URL
- `expiresAt`: Timestamp (24 hours from creation)
- `viewedBy`: Array of user IDs

**Indexes**: `author`, `expiresAt` (for cleanup)

### 9. LandmarkSearch Model (`landmarkSearch.models.js`)
**Purpose**: Tracks user landmark identification searches

**Key Fields**:
- `user`: Reference to User
- `landmark_found`: Boolean
- `name`: Place name
- `place_id`: Google Place ID
- `location`: { lat, lng }
- `confidence`: Number (0-1)
- `distance`: Number (meters)
- `address`, `types`, `rating`
- `labels`: Array of detected labels
- `method`: Detection method used
- `photos`: Array of photo URLs

### 10. UserInterest Model (`userInterest.models.js`)
**Purpose**: Tracks user interests based on saved posts

**Key Fields**:
- `user`: Reference to User
- `tagWeights`: Map of tag -> frequency count
- `tagWeightsObj`: Plain object version for MongoDB aggregation
- `totalSavedPosts`: Number
- `lastUpdated`: Timestamp

### 11. Settings Model (`settings.models.js`)
**Purpose**: Stores application-wide settings

**Key Fields**:
- `appName`, `appUrl`
- `googleApiKey`, `googlePlacesApiKey`, `googleVisionApiKey`, `googleGeminiApiKey`
- `textRazorApiKey`
- `maintenanceMode`: Boolean
- Various configuration fields

### 12. SecurityLog Model (`securityLog.models.js`)
**Purpose**: Tracks security events and user actions

**Key Fields**:
- `user`: Reference to User
- `action`: String (e.g., "login", "logout", "post_created")
- `ipAddress`: String
- `userAgent`: String
- `details`: Object
- `timestamp`: Date

---

## Authentication & Authorization

### Authentication Flow

#### 1. **Email/Password Authentication**
```
User submits credentials
    ↓
POST /auth/login
    ↓
Server validates credentials (bcrypt password comparison)
    ↓
Generate JWT token (expires in 7 days)
    ↓
Set HTTP-only cookie: appToken
    ↓
Return user data (without password)
```

**Implementation**:
- **File**: `Server/controller/authController.js`
- **Route**: `POST /auth/login`
- **Middleware**: None (public endpoint)
- **Token Storage**: HTTP-only cookie + returned in response
- **Token Expiry**: 7 days

#### 2. **Google OAuth2 Authentication**
```
User clicks "Sign in with Google"
    ↓
Redirect to Google OAuth consent screen
    ↓
User authorizes
    ↓
Google redirects to /auth/google/callback
    ↓
Server exchanges code for access token
    ↓
Fetch user info from Google
    ↓
Find or create user in database
    ↓
Generate JWT token
    ↓
Set cookie and redirect to dashboard
```

**Implementation**:
- **File**: `Server/controller/authController.js`
- **Routes**: 
  - `GET /auth/google` - Initiates OAuth flow
  - `GET /auth/google/callback` - Handles OAuth callback
- **Library**: passport-auth0 (configured for Google)

#### 3. **Signup Flow**
```
User submits signup form
    ↓
POST /auth/signup
    ↓
Validate email uniqueness
    ↓
Hash password with bcrypt (10 rounds)
    ↓
Create user in database
    ↓
Send OTP to email (if enabled)
    ↓
Return success response
```

**Implementation**:
- **File**: `Server/controller/authController.js`
- **Route**: `POST /auth/signup`
- **OTP**: Optional email verification via Nodemailer

#### 4. **JWT Token Verification**
```
Request with Authorization header or cookie
    ↓
Middleware: verifyToken (Server/middleware/auth.js)
    ↓
Extract token from:
  - Authorization: Bearer <token>
  - Cookie: appToken
    ↓
Verify token signature with SECRET_KEY
    ↓
Decode and attach user info to req.user
    ↓
Continue to route handler
```

**Implementation**:
- **File**: `Server/middleware/auth.js`
- **Function**: `verifyToken(req, res, next)`
- **Error Handling**: Returns 401 if token invalid/missing

### Authorization (Role-Based Access Control)

#### Admin Authorization
```
Request to admin route
    ↓
verifyToken middleware (checks authentication)
    ↓
requirePermission middleware (checks admin role)
    ↓
Verify user.isAdmin === true
    ↓
Allow access or return 403
```

**Implementation**:
- **File**: `Server/middleware/adminAuth.js`
- **Function**: `requirePermission(permission)`
- **Admin Roles**: "ceo", "supervisor", "manager", "team_admin"

#### Protected Routes
- **User Routes**: Require `verifyToken`
- **Admin Routes**: Require `verifyToken` + `requirePermission`
- **Public Routes**: No authentication required

---

## API Endpoints

### Authentication Routes (`/auth`)
**File**: `Server/routers/authRouter.js`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/signup` | User registration | No |
| POST | `/auth/login` | User login | No |
| POST | `/auth/logout` | User logout | Yes |
| GET | `/auth/me` | Get current user | Yes |
| GET | `/auth/google` | Initiate Google OAuth | No |
| GET | `/auth/google/callback` | Google OAuth callback | No |
| POST | `/auth/verify-otp` | Verify OTP code | No |
| POST | `/auth/resend-otp` | Resend OTP | No |

### User Routes (`/users`)
**File**: `Server/routers/userRouter.js`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/users` | Get all users | Yes |
| GET | `/users/:id` | Get user by ID | Yes |
| PUT | `/users/:id` | Update user profile | Yes |
| POST | `/users/:id/friend-request` | Send friend request | Yes |
| POST | `/users/:id/accept-friend` | Accept friend request | Yes |
| POST | `/users/:id/decline-friend` | Decline friend request | Yes |
| POST | `/users/:id/unfriend` | Remove friend | Yes |
| GET | `/users/stats` | Get user statistics | Yes |

### Post Routes (`/posts`)
**File**: `Server/routers/postRouter.js`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/posts` | Get all posts (feed) | Yes |
| POST | `/posts` | Create new post | Yes |
| GET | `/posts/:id` | Get post by ID | Yes |
| PUT | `/posts/:id` | Update post | Yes (owner only) |
| DELETE | `/posts/:id` | Delete post | Yes (owner only) |
| POST | `/posts/:id/like` | Like/unlike post | Yes |
| POST | `/posts/:id/comment` | Add comment | Yes |
| DELETE | `/posts/:id/comment/:commentId` | Delete comment | Yes |
| POST | `/posts/:id/save` | Save/unsave post | Yes |
| POST | `/posts/:id/report` | Report post | Yes |

**File Upload**: Uses `multer` middleware, uploads to Cloudinary

### Place Routes (`/api/places`)
**File**: `Server/routers/placeRouter.js`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/places/autocomplete` | Get place autocomplete suggestions | No |
| GET | `/api/places/details` | Get place details by Google Place ID | No |
| GET | `/api/places/by-google-id/:googlePlaceId` | Find or create place by Google Place ID | Yes |
| GET | `/api/places/:placeId` | Get place by MongoDB _id | Yes |
| POST | `/api/places/:placeId/visit` | Mark place as visited | Yes |
| POST | `/api/places/:placeId/save` | Save/unsave place | Yes |
| GET | `/api/places/saved` | Get saved places | Yes |
| GET | `/api/places/visited` | Get visited places | Yes |
| GET | `/api/places/:placeId/photos` | Get place photos | Yes |

### Landmark Routes (`/landmarks`)
**File**: `Server/routers/landmarkRouter.js`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/landmarks/identify` | Identify landmark from image | Yes |
| GET | `/landmarks/nearby` | Get nearby places | No |
| GET | `/landmarks/nearby-for-landmark` | Get nearby places for landmark | No |
| GET | `/landmarks/:landmarkId` | Get landmark by ID | No (public) |
| GET | `/landmarks/photo/:photoReference` | Proxy Google Places photo | No |
| GET | `/landmarks/user/count` | Get user's landmark count | Yes |
| POST | `/landmarks/save` | Save landmark | Yes |
| GET | `/landmarks/saved` | Get saved landmarks | Yes |
| DELETE | `/landmarks/saved/:landmarkId` | Delete saved landmark | Yes |

### Message Routes (`/messages`)
**File**: `Server/routers/messageRouter.js`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/messages/conversations` | Get all conversations | Yes |
| GET | `/messages/conversation/:conversationId` | Get messages in conversation | Yes |
| POST | `/messages/upload` | Upload message image | Yes |
| PUT | `/messages/:messageId` | Edit message | Yes |
| DELETE | `/messages/:messageId` | Delete message | Yes |

**Note**: Real-time messaging primarily uses Socket.IO, REST API for history

### Notification Routes (`/notifications`)
**File**: `Server/routers/notificationRouter.js`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/notifications` | Get all notifications | Yes |
| PUT | `/notifications/:id/read` | Mark notification as read | Yes |
| PUT | `/notifications/read-all` | Mark all as read | Yes |
| DELETE | `/notifications/:id` | Delete notification | Yes |

### Recommendation Routes (`/api/recommendations`)
**File**: `Server/routers/recommendationRouter.js`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/recommendations/personalized` | Get personalized recommendations | Yes |
| GET | `/api/recommendations/interests` | Get user interest profile | Yes |

### Group Routes (`/groups`)
**File**: `Server/routers/groupRouter.js`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/groups` | Get all groups (with search) | Yes |
| POST | `/groups` | Create new group | Yes |
| GET | `/groups/:id` | Get group by ID | Yes |
| PUT | `/groups/:id` | Update group | Yes (admin only) |
| DELETE | `/groups/:id` | Delete group | Yes (admin only) |
| POST | `/groups/:id/join` | Join group | Yes |
| POST | `/groups/:id/leave` | Leave group | Yes |
| POST | `/groups/:id/upload` | Upload group cover | Yes |

### Status Routes (`/statuses`)
**File**: `Server/routers/statusRouter.js`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/statuses` | Get all statuses (stories) | Yes |
| POST | `/statuses` | Create new status | Yes |
| DELETE | `/statuses/:id` | Delete status | Yes (owner only) |
| POST | `/statuses/:id/view` | Mark status as viewed | Yes |

### Gemini Routes (`/gemini`)
**File**: `Server/routers/geminiRouter.js`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/gemini/generate` | Generate AI content | Yes |

### Admin Routes (`/admin`)
**File**: `Server/routers/adminRouter.js`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/admin/users` | Get all users | Yes (Admin) |
| PUT | `/admin/users/:id` | Update user | Yes (Admin) |
| DELETE | `/admin/users/:id` | Delete user | Yes (Admin) |
| GET | `/admin/posts` | Get all posts | Yes (Admin) |
| DELETE | `/admin/posts/:id` | Delete post | Yes (Admin) |
| GET | `/admin/places` | Get all places | Yes (Admin) |
| GET | `/admin/places/pending` | Get pending places | Yes (Admin) |
| GET | `/admin/places/:id` | Get place by ID | Yes (Admin) |
| PUT | `/admin/places/:id/approve` | Approve place | Yes (Admin) |
| PUT | `/admin/places/:id/reject` | Reject place | Yes (Admin) |
| POST | `/admin/places/batch-approve` | Batch approve places | Yes (Admin) |
| POST | `/admin/places/batch-reject` | Batch reject places | Yes (Admin) |
| GET | `/admin/analytics` | Get analytics data | Yes (Admin) |
| GET | `/admin/security-logs` | Get security logs | Yes (Admin) |

### Config Routes (`/api/config`)
**File**: `Server/routers/configRouter.js`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/config/google-maps-key` | Get Google Maps API key (public) | No |

---

## Frontend Pages & Features

### User Web Application (`Web/user/src/pages/`)

#### 1. **LandingPage** (`landingPage.jsx`)
**Route**: `/`
**Purpose**: Public landing page before authentication

**Features**:
- Hero section with app introduction
- Feature highlights
- Call-to-action buttons (Sign Up / Login)
- Responsive design

**Implementation**:
- No authentication required
- Static content with animations
- Navigation to signup/login

#### 2. **LoginPage** (`LoginPage.jsx`)
**Route**: `/login`
**Purpose**: User authentication

**Features**:
- Email/password login form
- Google Sign-In button (OAuth)
- Form validation
- Error handling
- Redirect to dashboard on success

**Implementation**:
- Uses `LoginForm` component
- Calls `handleLogin` from `AuthContext`
- Sets JWT token in HTTP-only cookie
- Redirects based on user role/interests

#### 3. **SignupPage** (`SignupPage.jsx`)
**Route**: `/signup`
**Purpose**: New user registration

**Features**:
- Registration form (name, email, password, role, city)
- Profile picture upload
- Role selection (tourist/local)
- Form validation
- OTP verification (optional)

**Implementation**:
- Uses `SignupForm` component
- Image upload to Cloudinary via backend
- Calls `handleSignup` from `AuthContext`
- Redirects to OTP verification or interests selection

#### 4. **OTPVerification** (`OtpVerify.jsx`)
**Route**: `/verify-otp`
**Purpose**: Email verification via OTP

**Features**:
- 6-digit OTP input
- Auto-submit on complete
- Resend OTP button
- Countdown timer
- Error handling

**Implementation**:
- Uses `react-otp-input` library
- Calls `/auth/verify-otp` endpoint
- Redirects to interests selection on success

#### 5. **InterestsSelection** (`InterestsSelection.jsx`)
**Route**: `/select-interests`
**Purpose**: Onboarding - select user interests

**Features**:
- Multiple interest selection
- Predefined interests: history, nature, culture, food, adventure
- Travel time selection (1 day, 3 days, 7 days)
- Save preferences

**Implementation**:
- Updates user profile with interests
- Required for new users
- Redirects to dashboard after completion

#### 6. **Dashboard** (`DashBoard.jsx`)
**Route**: `/dashboard`
**Purpose**: Main user dashboard with statistics and quick actions

**Features**:
- **Welcome Section**: Personalized greeting based on role
- **Quick Actions**: 4 buttons (Landmark ID, New Community Post, Chat with Local, Get recommendations)
- **Statistics Cards**:
  - Saved Places count
  - Landmarks Identified count
  - Community Contributions count
  - Local Connections count
- **Attractions Chart**: Line chart showing community attractions over time (7 days, 30 days, 12 months)
- **Recent Activities**: List of recent user activities
- **Personalized Recommendations**: AI-powered place recommendations with reasons

**Implementation**:
- Uses `recharts` for data visualization
- Real-time data polling (3-second intervals)
- Fetches from multiple endpoints:
  - `getCommunityAttractionsByMonth(period)`
  - `getRecentActivities()`
  - `getUserStats()`
  - `getLocalConnections()`
  - `getPersonalizedRecommendations()`
- Skeleton loaders for loading states
- Responsive grid layout

**Data Flow**:
```
Component Mount
    ↓
Fetch all data in parallel
    ↓
Update state with results
    ↓
Set up polling intervals
    ↓
Re-fetch every 3 seconds (activities, stats)
    ↓
Cleanup on unmount
```

#### 7. **Landmark** (`Landmark.jsx`)
**Route**: `/landmark`
**Purpose**: Landmark identification interface

**Features**:
- **Interactive Map**: Embedded Google Maps showing user location
- **Location Management**: 
  - Auto-fetch current location on page load
  - "Use Current Location" button
  - Display coordinates badge
- **Image Upload**:
  - Drag & drop zone
  - File browser
  - Image preview
  - Clear selection
- **Identify Button**: Triggers landmark identification
- **Nearest Places**: Shows nearby places when location is set

**Implementation**:
- Uses browser `navigator.geolocation` API
- File upload via `FileReader` API
- Calls `identifyLandmark(file, lat, lng)` API
- Stores result in `sessionStorage`
- Navigates to `/landmark/result` on success
- Fetches nearby places using `getNearbyPlaces(lat, lng)`

**Landmark Identification Flow**:
```
User uploads image
    ↓
Get user's current location
    ↓
POST /landmarks/identify
  - Multipart form data (image file)
  - Body: { lat, lng }
    ↓
Backend processes:
  1. Convert image to base64
  2. Call Google Vision API (LANDMARK_DETECTION, WEB_DETECTION, LABEL_DETECTION, TEXT_DETECTION)
  3. Multi-step fallback detection
  4. Verify with Google Places API
  5. Return result
    ↓
Store result in sessionStorage
    ↓
Navigate to /landmark/result
```

#### 8. **LandmarkResult** (`LandmarkResult.jsx`)
**Route**: `/landmark/result`
**Purpose**: Display landmark identification results

**Features**:
- **Hero Section**: 
  - Large place name
  - Detection method badge (Landmark Detection, Web Detection, etc.)
  - Confidence percentage
  - Visual similarity indicator (if applicable)
- **Main Photo**: Large hero image with gallery
- **Location Info**: Address, coordinates, Google Maps link
- **AI Description**: 
  - Auto-generated using Gemini AI
  - Includes exact coordinates and address in prompt
  - Formatted with headings and sections
  - "Ask Anything" button for interactive queries
- **Distance Calculation**: Distance from user's current location (Haversine formula)
- **Nearby Places**: List of nearby attractions
- **Community Posts**: Related posts with location tags
- **Actions**: Share, Save, View on Google Maps

**Implementation**:
- Reads result from `sessionStorage`
- Fetches photos using `getPlacePhotos(place_id)`
- Auto-generates description on mount:
  ```javascript
  Prompt includes:
  - Exact place name
  - Exact coordinates (lat, lng)
  - Exact address
  - Instructions to describe THIS SPECIFIC location
  ```
- Calculates distance using Haversine formula
- Fetches nearby places using `getNearbyPlacesForLandmark(lat, lng)`
- Uses `GeminiModal` for interactive AI queries
- Shares landmark via shareable URL: `/landmark/view/:landmarkId`

**Detection Methods Displayed**:
- "Landmark Detection" - Famous landmarks detected
- "Visual Similarity" - Web detection used
- "Label Detection" - Building/place type detected
- "Text Search" - Text-based search
- "Nearby Search" - Location-based fallback

#### 9. **LandmarkView** (`LandmarkView.jsx`)
**Route**: `/landmark/view/:landmarkId`
**Purpose**: Public view of landmark (shareable link)

**Features**:
- Similar to LandmarkResult but public (no auth required)
- Read-only view
- Shareable link functionality

#### 10. **Community** (`Community.jsx`)
**Route**: `/community`
**Purpose**: Social media feed with posts and stories

**Features**:
- **Stories Section**: Horizontal scrollable stories (24-hour status updates)
- **Post Feed**: 
  - Infinite scroll
  - Post cards with author, text, images
  - Like, comment, share buttons
  - Hashtag display
  - Place tags
- **Create Post**: 
  - Text input
  - Image upload
  - Hashtag auto-extraction (TextRazor API)
  - Place tagging
- **Status Creation**: Create temporary status (stories)
- **Filtering**: Filter by hashtags, places

**Implementation**:
- Fetches posts using `listPosts()` API
- Real-time updates via Socket.IO for new posts
- Infinite scroll with pagination
- Image upload to Cloudinary
- TextRazor integration for hashtag extraction
- Status expiration (24 hours) handled by backend

**Post Creation Flow**:
```
User creates post
    ↓
Upload image to Cloudinary (if provided)
    ↓
Extract hashtags using TextRazor API
    ↓
POST /posts
  {
    text, imageUrl, hashtags, place
  }
    ↓
Backend:
  - Save post to database
  - Emit Socket.IO event to all users
  - Create notifications for mentions
    ↓
Frontend receives real-time update
    ↓
Add post to feed
```

#### 11. **PostDetail** (`PostDetail.jsx`)
**Route**: `/community/post/:postId`
**Purpose**: Detailed view of a single post

**Features**:
- Full post display
- All comments with replies
- Like/unlike functionality
- Comment creation
- Author profile link
- Related posts section

**Implementation**:
- Fetches post by ID
- Real-time comment updates via Socket.IO
- Nested comment threading
- Optimistic UI updates

#### 12. **Chats** (`Chats.jsx`)
**Route**: `/chats`
**Purpose**: Real-time messaging interface

**Features**:
- **Conversation List**: Left sidebar with all conversations
- **Chat Window**: Right side with messages
- **Message Features**:
  - Text messages
  - Image messages
  - Message editing
  - Message deletion
  - Read receipts
  - Typing indicators
- **Online Status**: Green dot for online users
- **New Chat**: Button to start new conversation
- **Search**: Search conversations

**Implementation**:
- Socket.IO for real-time messaging
- REST API for message history
- Image upload to Cloudinary before sending
- Conversation management
- Unread message badges
- Sound notifications (Web Audio API)

**Real-Time Message Flow**:
```
User sends message
    ↓
Upload image (if any) to Cloudinary
    ↓
Socket.IO emit: 'send-message'
  {
    conversationId, recipientId, text, imageUrl
  }
    ↓
Server:
  - Create/update conversation
  - Save message to database
  - Emit 'new-message' to conversation room
  - Emit to recipient's personal room
    ↓
Recipients receive real-time message
    ↓
Update UI immediately
```

#### 13. **Profile** (`Profile.jsx`)
**Route**: `/profile?userId=:id`
**Purpose**: User profile page

**Features**:
- **Profile Header**: 
  - Cover picture
  - Profile picture
  - Name, bio, city
  - Friend count
  - Edit profile button (if own profile)
- **Profile Tabs**:
  - Posts (user's posts)
  - Saved Posts
  - Visited Places
  - Friends
- **Friend Actions**: Add friend, accept/decline request, message
- **Statistics**: Posts count, friends count, landmarks identified

**Implementation**:
- Fetches user by ID from query parameter
- Different view for own profile vs others
- Friend request management
- Profile editing with image uploads

#### 14. **Search** (`Search.jsx`)
**Route**: `/search?q=:query&tab=:tab`
**Purpose**: Universal search page

**Features**:
- **Search Input**: Single input for all search types
- **Tabs**: All, People, Posts, Places, Groups
- **Places Tab**:
  - Google Places autocomplete integration
  - Real-time suggestions (300ms debounce)
  - Dropdown with place suggestions
  - Click to navigate to place detail
- **People Tab**: User search results
- **Posts Tab**: Post search results
- **Groups Tab**: Group search results

**Implementation**:
- Uses `getPlaceAutocomplete(input)` for places
- Uses `searchUsers(query)` for people
- Uses `searchPosts(query)` for posts
- Uses `listGroups({ search: query })` for groups
- Debounced input (300ms)
- Tab-based filtering
- Click outside to close dropdowns

**Places Search Flow**:
```
User types in Places tab
    ↓
Debounce 300ms
    ↓
GET /api/places/autocomplete?input=:query
    ↓
Backend proxies Google Places Autocomplete API
    ↓
Returns: { place_id, main_text, secondary_text }
    ↓
Display suggestions dropdown
    ↓
User selects suggestion
    ↓
GET /api/places/by-google-id/:googlePlaceId
    ↓
Backend finds or creates place in database
    ↓
Navigate to /user/place/:placeId (MongoDB _id)
```

#### 15. **PlaceDetailPage** (`PlaceDetailPage.jsx`)
**Route**: `/user/place/:placeId`
**Purpose**: Detailed view of a place

**Features**:
- **Hero Section**: 
  - Large place name
  - Address
  - Main image with expandable gallery
- **AI Description**: 
  - Auto-generated using Gemini AI
  - Includes exact coordinates in prompt
  - Tourism-friendly format
  - "Ask Anything" button
- **Map Section**: Embedded Google Map with marker
- **Distance From User**: 
  - Requests browser geolocation
  - Calculates distance using Haversine formula
  - Displays in km/m
- **Nearby Recommendations**: 
  - Fetches nearby places (restaurants, landmarks, parks)
  - Shows distance and ratings
  - Click to navigate

**Implementation**:
- Handles both MongoDB `_id` and Google Place ID
- Fetches place using `getPlaceById()` or `getPlaceByGoogleId()`
- Auto-generates description with location context
- Uses browser Geolocation API
- Haversine formula for distance calculation
- Fetches nearby places using `getNearbyPlaces(lat, lng)`

#### 16. **Recommendations** (`Recommendations.jsx`)
**Route**: `/recommendations`
**Purpose**: Personalized place recommendations

**Features**:
- **Recommendation Cards**: 
  - Place name, image, description
  - Distance from user
  - Reason for recommendation
  - Matched interests/tags
  - Score display
- **Filtering**: By interest tags
- **Sorting**: By score, distance, rating

**Implementation**:
- Calls `getPersonalizedRecommendations(userId, userLocation)`
- Uses recommendation service with weighted scoring
- Displays reason for each recommendation
- Click to navigate to place detail

#### 17. **MyPlaces** (`MyPlaces.jsx`)
**Route**: `/my-places`
**Purpose**: User's saved and visited places

**Features**:
- **Tabs**: Saved Places, Visited Places
- **Place Cards**: Grid layout with images
- **Actions**: Remove from saved, mark as visited
- **Filters**: By tags, types

**Implementation**:
- Fetches using `getSavedPlaces()` and `getVisitedPlaces()`
- Updates via `toggleSavePlace()` and `markPlaceVisited()`

#### 18. **SuggestPlace** (`SuggestPlace.jsx`)
**Route**: `/suggest-place`
**Purpose**: User place submission form

**Features**:
- **Location Search**: 
  - Google Places autocomplete
  - Real-time suggestions
  - Address auto-fill
- **Form Fields**:
  - Place name (from autocomplete)
  - Address (from autocomplete)
  - Description
  - Tags
  - Estimated cost
  - Photos upload
- **Submission**: Creates place with "pending" status

**Implementation**:
- Uses same autocomplete as Search page
- Fetches place details to get coordinates
- Image upload to Cloudinary
- Creates place via POST endpoint
- Admin approval required

#### 19. **Notifications** (`Notifications.jsx`)
**Route**: `/notifications`
**Purpose**: Notification center

**Features**:
- **Notification List**: All user notifications
- **Types**: Like, comment, friend request, admin announcement
- **Actions**: 
  - Mark as read
  - Mark all as read
  - Delete notification
  - Navigate to related content
- **Real-Time Updates**: Socket.IO for new notifications

**Implementation**:
- Fetches using `listNotifications()`
- Real-time updates via Socket.IO
- Sound notifications (Web Audio API)
- Toast notifications for new items
- Auto-mark as read on click

#### 20. **GroupDetail** (`GroupDetail.jsx`)
**Route**: `/group/:groupId`
**Purpose**: Group page with members and posts

**Features**:
- **Group Info**: Name, description, cover picture
- **Members List**: All group members
- **Group Posts**: Posts from group members
- **Join/Leave**: Join or leave group
- **Admin Actions**: Manage group (if admin)

**Implementation**:
- Fetches group by ID
- Checks membership status
- Handles join/leave requests
- Displays group-specific feed

#### 21. **SavedPosts** (`SavedPosts.jsx`)
**Route**: `/saved-posts`
**Purpose**: User's saved posts

**Features**:
- Grid layout of saved posts
- Remove from saved
- Navigate to post detail

#### 22. **Settings** (`Settings.jsx`)
**Route**: `/settings`
**Purpose**: User settings and preferences

**Features**:
- Profile editing
- Password change
- Privacy settings
- Notification preferences
- Account deletion

---

### Admin Web Application (`Web/admin/src/pages/`)

#### 1. **Dashboard** (`Dashboard.jsx`)
**Route**: `/`
**Purpose**: Admin overview dashboard

**Features**:
- **Statistics Cards**: 
  - Total users
  - Total posts
  - Pending approvals
  - Active admins
- **Charts**: 
  - User growth over time
  - Post activity
  - Place submissions
- **Recent Activity**: Latest admin actions

#### 2. **ManageUsers** (`ManageUsers.jsx`)
**Route**: `/users`
**Purpose**: User management

**Features**:
- User list with search
- Filter by role
- View user details
- Edit user
- Delete user
- Promote to admin

#### 3. **ManageAdmins** (`ManageAdmins.jsx`)
**Route**: `/admins`
**Purpose**: Admin management

**Features**:
- Admin list
- Admin roles (CEO, Supervisor, Manager, Team Admin)
- Assign/remove admin roles
- View admin activity

#### 4. **ManageRecommendations** (`ManageRecommendations.jsx`)
**Route**: `/recommendations`
**Purpose**: Place recommendation moderation

**Features**:
- **Place List**: All user-submitted places
- **Status Badges**: Approved, Pending, Rejected
- **Filtering**: By status
- **Batch Actions**:
  - Select all pending
  - Approve selected
  - Reject selected
- **Detail Modal**: 
  - Full place information
  - Photos
  - Submission details
  - Approve/Reject buttons
- **Single Actions**: Approve, Reject, View details

**Implementation**:
- Fetches using `getAllPlaces()` (filtered by `submittedBy`)
- Updates status instead of removing from list
- Batch operations via `batchApprovePlaces()` and `batchRejectPlaces()`
- PlaceDetailModal component for detailed view

#### 5. **Analytics** (`Analytics.jsx`)
**Route**: `/analytics`
**Purpose**: Platform analytics

**Features**:
- User growth charts
- Post activity
- Engagement metrics
- Geographic distribution
- Popular places

#### 6. **Moderation** (`Moderation.jsx`)
**Route**: `/moderation`
**Purpose**: Content moderation

**Features**:
- Reported posts
- Reported users
- Moderation actions
- Ban/unban users

#### 7. **Notifications** (`Notifications.jsx`)
**Route**: `/notifications`
**Purpose**: Admin notification management

**Features**:
- Create admin announcements
- Send notifications to users
- Notification templates

#### 8. **Settings** (`Settings.jsx`)
**Route**: `/settings`
**Purpose**: Application settings

**Features**:
- API key management
- Maintenance mode toggle
- Email configuration
- General settings

#### 9. **SecurityLogs** (`SecurityLogs.jsx`)
**Route**: `/security`
**Purpose**: Security audit logs

**Features**:
- Security event logs
- User action tracking
- IP address logging
- Filter by user, action, date

#### 10. **Profile** (`Profile.jsx`)
**Route**: `/profile`
**Purpose**: Admin profile

**Features**:
- Admin profile editing
- Change password
- Profile picture

---

## Real-Time Features (Socket.IO)

### Socket.IO Server Setup
**File**: `Server/index.js`

**Configuration**:
```javascript
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
    methods: ["GET", "POST"]
  }
});
```

**Authentication Middleware**:
- Verifies JWT token from `socket.handshake.auth.token` or cookie
- Attaches user to socket: `socket.userId`, `socket.user`
- Rejects connection if authentication fails

### Socket Events

#### 1. **Connection Events**
```javascript
io.on('connection', (socket) => {
  // User connected
  // Join user's personal room: user_${userId}
  // Emit 'user-online' to friends
});
```

#### 2. **Message Events**
- `join-conversation`: Join conversation room
- `leave-conversation`: Leave conversation room
- `send-message`: Send new message
- `edit-message`: Edit existing message
- `delete-message`: Delete message
- `new-message`: Receive new message (broadcast)
- `message-edited`: Message edited notification
- `message-deleted`: Message deleted notification

**Message Flow**:
```
Client emits 'send-message'
    ↓
Server:
  1. Create/update conversation
  2. Save message to database
  3. Populate sender/recipient
  4. Update conversation lastMessage
    ↓
Emit 'new-message' to:
  - Conversation room (if users in room)
  - Recipient's personal room (if not in conversation)
    ↓
Clients receive and update UI
```

#### 3. **Online Status Events**
- `user-online`: User came online
- `user-offline`: User went offline

**Implementation**:
- Maintains `onlineUsers` Map on server
- Emits to all connected users
- Updates online status in real-time

#### 4. **Notification Events**
- Real-time notifications for:
  - New likes
  - New comments
  - Friend requests
  - Admin announcements

### Socket.IO Client (Frontend)
**File**: `Web/user/src/context/SocketContext.jsx`

**Features**:
- Auto-connects on authentication
- Manages connection state
- Handles reconnection
- Sound notifications for messages
- Online users tracking

**Connection**:
```javascript
const socket = io('http://localhost:3000', {
  auth: { token: getCookie('appToken') },
  transports: ['websocket', 'polling'],
  withCredentials: true
});
```

---

## AI Integration

### Google Gemini AI

#### 1. **Content Generation**
**Endpoint**: `POST /gemini/generate`
**File**: `Server/controller/geminiController.js`

**Purpose**: Generate AI-powered content (descriptions, answers)

**Implementation**:
- Uses Google Gemini API (gemini-2.5-flash-lite model)
- Configurable temperature (default: 0.7)
- Error handling and retries
- Rate limiting consideration

**Usage**:
- Landmark descriptions (with coordinates)
- Place descriptions (with coordinates)
- Interactive AI assistant (GeminiModal)
- Answering user questions about places

#### 2. **Landmark Description Generation**
**File**: `Web/user/src/pages/LandmarkResult.jsx`

**Prompt Structure**:
```
A user uploaded an image, and our image analysis system identified 
the following EXACT location from that image:

IDENTIFIED PLACE NAME: "UOL Garden"
IDENTIFIED COORDINATES: 31.391866699999998, 74.2406608
IDENTIFIED ADDRESS: 96RR+P7V, Lahore, Pakistan

CRITICAL INSTRUCTIONS:
1. Describe THIS SPECIFIC location identified from the image
2. DO NOT provide a generic description
3. Use the exact name, coordinates, and address provided
4. Describe what "UOL Garden" is at this specific location

Include information about:
- What "UOL Garden" is at coordinates 31.39..., 74.24...
- The specific location and its surroundings
- Historical significance
- Cultural importance
- Notable features
- Why people visit
- Interesting facts

Format with clear sections and headings.
Remember: Describe the EXACT location identified, not generic.
```

#### 3. **Interactive AI Assistant**
**Component**: `GeminiModal.jsx`

**Features**:
- Modal interface for AI queries
- Context-aware prompts (includes location data)
- Streaming responses (if supported)
- Error handling
- Loading states

**Usage**:
- "Ask Anything About This Place" button
- Passes location coordinates and address
- Generates contextual responses

---

## Google APIs Integration

### 1. Google Places API

#### Autocomplete
**Endpoint**: `GET /api/places/autocomplete?input=:query`
**File**: `Server/controller/placeController.js` → `getPlaceAutocomplete()`

**Implementation**:
- Proxies Google Places Autocomplete API
- API key from environment variables
- Returns: `place_id`, `main_text`, `secondary_text`
- No `types` restriction (allows all place types)

**Usage**:
- Search page (Places tab)
- SuggestPlace page (location input)
- Real-time suggestions with 300ms debounce

#### Place Details
**Endpoint**: `GET /api/places/details?place_id=:id`
**File**: `Server/controller/placeController.js` → `getPlaceDetails()`

**Implementation**:
- Proxies Google Places Details API
- Fetches: name, address, geometry, photos, types, rating
- Returns coordinates and full address

#### Find or Create Place
**Endpoint**: `GET /api/places/by-google-id/:googlePlaceId`
**File**: `Server/controller/placeController.js` → `getPlaceByGoogleId()`

**Implementation**:
- Checks database for existing place by `googlePlaceId`
- If not found, fetches from Google Places API
- Creates place in database with status "approved"
- Fetches photos using Google Places Photos API
- Returns MongoDB place document

**Flow**:
```
User selects place from autocomplete
    ↓
GET /api/places/by-google-id/:googlePlaceId
    ↓
Backend:
  1. Check Place.findOne({ googlePlaceId })
  2. If not found:
     - Call Google Places Details API
     - Get photos from Google Places Photos API
     - Create Place document
  3. Return place with MongoDB _id
    ↓
Navigate to /user/place/:placeId (MongoDB _id)
```

### 2. Google Cloud Vision API

#### Landmark Detection
**File**: `Server/controller/landmarkController.js` → `detectLandmarksWithVision()`

**Features Detected**:
- `LANDMARK_DETECTION`: Famous landmarks with coordinates
- `WEB_DETECTION`: Web entities and visually similar images
- `LABEL_DETECTION`: Building types and place categories
- `TEXT_DETECTION`: Text in images (signs, names)

**Multi-Step Detection Flow**:
```
Step 1: LANDMARK_DETECTION
  - If high confidence → Use coordinates + name
  - Verify with Places API
  - If verified → Return result

Step 2: WEB_DETECTION (if Step 1 fails)
  - Extract web entities
  - Extract page titles
  - Build search queries
  - Query Places API Text Search
  - If found → Return result

Step 3: LABEL_DETECTION + TEXT_DETECTION (if Step 2 fails)
  - Extract labels (building, mosque, restaurant, etc.)
  - Extract text from image
  - Build search queries
  - Query Places API
  - If found → Return result

Step 4: Nearby Search (Final Fallback)
  - Use user's location
  - Query Places API Nearby Search
  - Return nearest places
```

**Implementation Details**:
- Single Vision API call with all features
- Processes results in priority order
- Fallback to next step if previous fails
- Returns detection method and confidence

### 3. Google Maps API

#### Embedded Maps
**Usage**: Display maps in iframes
- Landmark page: User location map
- PlaceDetailPage: Place location map
- LandmarkResult: Landmark location map

**URL Format**:
```
https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed
```

#### Public API Key
**Endpoint**: `GET /api/config/google-maps-key`
**File**: `Server/controller/configController.js`

**Purpose**: Provides Google Maps API key for frontend map rendering
**Security**: Key should be restricted by HTTP referrer in Google Cloud Console

---

## File Upload & Media Management

### Cloudinary Integration

#### Configuration
**File**: `Server/utils/cloudinary.js`

**Setup**:
- Cloud name, API key, API secret from environment variables
- Configured for image and video uploads
- Automatic optimization and transformation

#### Upload Endpoints

**1. Profile Picture Upload**
- **Route**: `POST /users/upload-profile`
- **Middleware**: `uploadProfile` (Multer)
- **File**: `Server/middleware/uploadProfile.js`
- **Max Size**: 5MB
- **Formats**: jpg, jpeg, png

**2. Cover Picture Upload**
- **Route**: `POST /users/upload-cover`
- **Middleware**: `uploadCover`
- **Max Size**: 10MB

**3. Post Image Upload**
- **Route**: `POST /posts/upload`
- **Middleware**: `uploadPost`
- **Max Size**: 10MB

**4. Status Image Upload**
- **Route**: `POST /statuses/upload`
- **Middleware**: `uploadStatus`
- **Max Size**: 10MB

**5. Message Image Upload**
- **Route**: `POST /messages/upload`
- **Middleware**: `uploadChat`
- **Max Size**: 5MB

**6. Group Cover Upload**
- **Route**: `POST /groups/upload`
- **Middleware**: `uploadGroup`
- **Max Size**: 10MB

**7. Place Photo Upload**
- **Route**: `POST /api/places/upload`
- **Middleware**: `uploadPlaceSuggestion`
- **Max Size**: 10MB

**8. Landmark Image Upload**
- **Route**: `POST /landmarks/identify`
- **Middleware**: `uploadLandmark`
- **Max Size**: 10MB

### Upload Flow
```
Frontend: User selects file
    ↓
Create FormData with file
    ↓
POST /endpoint/upload
  - Multipart form data
  - Multer middleware processes file
    ↓
Upload to Cloudinary
  - Generate unique filename
  - Apply transformations
  - Get secure URL
    ↓
Return Cloudinary URL to frontend
    ↓
Frontend uses URL in API request
```

### Image Optimization
- Automatic format conversion (WebP when supported)
- Responsive image sizes
- Lazy loading
- CDN delivery via Cloudinary

---

## Recommendation System

### Architecture
**File**: `Server/services/recommendationService.js`

### Scoring Algorithm

**Weights**:
- Interest Match: 40 points
- Distance: 30 points (closer = higher)
- Rating: 20 points (if rating >= 4)
- Popularity: 10 points (scaled from popularityScore)

### Recommendation Flow

```
User requests recommendations
    ↓
Get user profile:
  - Predefined interests
  - Saved post tags (from UserInterest)
  - Visited places (to exclude)
  - User location (if available)
    ↓
Query Place collection:
  - Exclude visited places
  - Filter by tags/interests
  - If location provided: Use $geoNear (2dsphere)
  - Limit to 600 candidates
    ↓
Calculate scores for each place:
  - Interest match score (weighted by tag frequency)
  - Distance score (inverse distance)
  - Rating score (if >= 4)
  - Popularity score
    ↓
Sort by total score (descending)
    ↓
Return top 10 recommendations
    ↓
Include:
  - Place details
  - Score breakdown
  - Reason for recommendation
  - Matched tags
  - Distance
```

### Interest Profiling

**UserInterest Model**:
- Tracks tags from saved posts
- `tagWeights`: Map of tag -> frequency
- Updated when user saves post with hashtags

**Tag Extraction**:
- From post hashtags
- Normalized to lowercase
- Weighted by frequency

**Combination**:
- Predefined interests (from user profile)
- Saved post tags (from UserInterest)
- Combined and deduplicated

### Distance Calculation
- Uses MongoDB `$geoNear` for geospatial queries
- Haversine formula for distance calculation
- Max distance: 2000km (covers Pakistan)
- Distance score: Linear decay (closer = higher score)

---

## Landmark Identification System

### Multi-Step Detection Pipeline

**File**: `Server/controller/landmarkController.js`

### Step 1: Vision API Detection
**Function**: `detectLandmarksWithVision(apiKey, imageBase64)`

**API Call**:
```javascript
POST https://vision.googleapis.com/v1/images:annotate
{
  requests: [{
    image: { content: base64 },
    features: [
      { type: 'LANDMARK_DETECTION', maxResults: 5 },
      { type: 'WEB_DETECTION', maxResults: 10 },
      { type: 'LABEL_DETECTION', maxResults: 20 },
      { type: 'TEXT_DETECTION', maxResults: 10 }
    ]
  }]
}
```

**Results Extracted**:
- **Landmarks**: Name, confidence, coordinates (lat/lng)
- **Web Entities**: Descriptions, scores, entity IDs
- **Visually Similar Images**: URLs, scores
- **Pages with Matching Images**: Page titles, URLs
- **Labels**: Descriptions, scores (filtered > 0.5)
- **Text**: Detected text from image

### Step 2: Place Resolution

#### 2.1 Landmark Detection Path
**Function**: `verifyWithPlacesAPI()`

**Strategy 1: Vision Coordinates + Text Search**
```
If landmark has coordinates:
  1. Use coordinates from Vision API
  2. Text search with landmark name
  3. Filter results within 500m radius
  4. Get closest match
  5. If within 500m → Use this place
```

**Strategy 2: Vision Coordinates + Nearby Search**
```
If Strategy 1 fails:
  1. Use coordinates from Vision API
  2. Nearby search with 200m radius
  3. Filter places with photos
  4. Get closest match
```

**Strategy 3: Text Search with Name**
```
If no coordinates:
  1. Text search with landmark name
  2. Filter within 2km of user location
  3. Get closest match
```

#### 2.2 Web Detection Path
**Function**: `resolvePlaceFromWebDetection()`

**Process**:
1. Extract web entity descriptions (filter score > 0.5)
2. Extract place names from page titles
3. Combine with detected text
4. Build search queries
5. Query Places API Text Search for each query
6. Filter results within 2km
7. Return best match

#### 2.3 Label Detection Path
**Function**: `verifyWithPlacesAPI()` (fallback)

**Process**:
1. Extract relevant labels (mosque, restaurant, building, etc.)
2. Combine with detected text
3. Build location-specific queries
4. Query Places API
5. Return best match

#### 2.4 Nearby Search Fallback
**Function**: `getNearbyPlacesFallback()`

**Process**:
1. Nearby search with 2km radius
2. If labels available, search by place type
3. Sort by distance and rating
4. Return top results
5. If very close (< 100m) and has Vision results → Promote to main result

### Step 3: Result Enhancement

**Function**: `enhanceWithPopularLandmarks()`

**Process**:
- Check against popular landmarks cache
- If within 500m of popular landmark → Boost confidence
- Mark as `is_popular_landmark`

### Step 4: Photo Fetching

**Function**: `getPlaceDetailsWithPhotos()`

**Process**:
1. Get place details from Google Places Details API
2. Extract photo references
3. Generate proxy URLs: `/landmarks/photo/:photoReference?maxwidth=1600`
4. Return photo array with URLs

### Photo Proxy
**Endpoint**: `GET /landmarks/photo/:photoReference`
**File**: `Server/controller/landmarkController.js` → `proxyPlacePhoto()`

**Purpose**: Avoid CORS issues and API key exposure
**Implementation**:
- Fetches image from Google Places Photos API
- Returns image with proper headers
- Caching headers for performance
- Error handling

### Detection Metadata
Each result includes:
- `detection_method`: "landmark_detection" | "web_detection" | "label_detection" | "nearby_search"
- `detection_confidence`: Number (0-1)
- `method`: Detailed method string
- `visual_similarity`: Boolean (if web detection used)
- `web_entities`: Array (if web detection used)

---

## Implementation Details

### Frontend State Management

#### 1. **AuthContext** (`context/AuthContext.jsx`)
**Purpose**: Global authentication state

**State**:
- `user`: Current user object
- `loading`: Authentication loading state
- `isAuthenticated`: Boolean

**Methods**:
- `handleSignup(formData)`: User registration
- `handleLogin(credentials)`: User login
- `handleLogout()`: User logout
- `fetchUser()`: Get current user

**Implementation**:
- Checks authentication on mount
- Retries after OAuth redirect
- Listens to window focus events
- Provides user data to all components

#### 2. **SocketContext** (`context/SocketContext.jsx`)
**Purpose**: Real-time communication management

**State**:
- `socket`: Socket.IO client instance
- `isConnected`: Connection status
- `onlineUsers`: Set of online user IDs

**Features**:
- Auto-connects on authentication
- Handles reconnection
- Sound notifications for messages
- Online status tracking
- Conversation-aware notifications

### API Client Architecture

#### Base API Client (`api/api.jsx`)
**Purpose**: Centralized HTTP client configuration

**Features**:
- Axios instance with base URL
- Automatic token injection (from cookie)
- Error handling
- Request/response interceptors

**Configuration**:
```javascript
const api = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true, // For cookie-based auth
  headers: {
    'Content-Type': 'application/json'
  }
});
```

#### API Modules
- `authApi.jsx`: Authentication endpoints
- `placesApi.jsx`: Place-related endpoints
- `landmarkApi.jsx`: Landmark identification
- `postsApi.jsx`: Post management
- `messageApi.jsx`: Messaging
- `notificationsApi.jsx`: Notifications
- `recommendationsApi.jsx`: Recommendations
- `groupsApi.jsx`: Group management
- `statusesApi.jsx`: Status/stories
- `geminiApi.jsx`: AI content generation

### Error Handling

#### Frontend
- Try-catch blocks in async functions
- Error toasts via `react-toastify`
- Fallback UI states
- Graceful degradation

#### Backend
- Try-catch in all controllers
- Detailed error logging
- User-friendly error messages
- Status code consistency

### Performance Optimizations

#### Frontend
- **Debouncing**: Input fields (300ms)
- **Memoization**: `useMemo` for expensive calculations
- **Lazy Loading**: Images with loading="lazy"
- **Code Splitting**: Route-based splitting
- **Skeleton Loaders**: Better perceived performance

#### Backend
- **Caching**: In-memory cache for Google API responses (24 hours)
- **Database Indexing**: 
  - User: email, auth0Id
  - Place: googlePlaceId, location (2dsphere), popularityScore
  - Post: author, createdAt
  - Message: conversationId, sender, recipient
- **Aggregation Pipelines**: Efficient MongoDB queries
- **Candidate Limiting**: Limits before expensive scoring

### Security Measures

#### Authentication
- JWT tokens with expiration
- HTTP-only cookies
- Password hashing (bcrypt, 10 rounds)
- Token verification middleware

#### Authorization
- Role-based access control (RBAC)
- Admin permission checks
- Resource ownership verification

#### API Security
- CORS configuration
- Input validation
- SQL injection prevention (MongoDB)
- XSS prevention
- API key protection (server-side only)

#### Security Logging
- Tracks all user actions
- IP address logging
- User agent tracking
- Security event monitoring

### Database Optimization

#### Indexes
- **User**: email (unique), auth0Id (sparse)
- **Place**: googlePlaceId (sparse, unique), location (2dsphere), popularityScore
- **Post**: author, createdAt
- **Message**: conversationId, sender, recipient, createdAt
- **Notification**: user, readAt, createdAt

#### Geospatial Queries
- Uses MongoDB `$geoNear` for distance-based queries
- 2dsphere index on `location` field
- Efficient nearby place searches

### Real-Time Updates

#### Polling Strategy
- **Dashboard**: 3-second intervals for activities/stats
- **Notifications**: 3-second intervals
- **Chats**: Real-time via Socket.IO (no polling)

#### Socket.IO Rooms
- `user_${userId}`: Personal room for each user
- `conversation_${conversationId}`: Conversation-specific room
- Efficient message delivery

### Image Processing

#### Upload Flow
1. Frontend: User selects file
2. Create FormData
3. POST to upload endpoint
4. Multer processes file
5. Upload to Cloudinary
6. Return secure URL
7. Use URL in subsequent API calls

#### Cloudinary Features
- Automatic format optimization
- Responsive image generation
- CDN delivery
- Secure URLs
- Transformation API

---

## Key Algorithms & Formulas

### 1. Haversine Formula (Distance Calculation)
**Purpose**: Calculate distance between two geographic points

**Formula**:
```javascript
const R = 6371e3; // Earth's radius in meters
const φ1 = lat1 * π / 180;
const φ2 = lat2 * π / 180;
const Δφ = (lat2 - lat1) * π / 180;
const Δλ = (lng2 - lng1) * π / 180;

const a = Math.sin(Δφ/2)² + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2)²;
const c = 2 * Math.atan2(√a, √(1-a));
const distance = R * c; // Distance in meters
```

**Usage**:
- Distance from user to place
- Distance from landmark to nearby places
- Sorting places by distance

### 2. Recommendation Scoring Algorithm
**Purpose**: Calculate recommendation score for places

**Formula**:
```
Total Score = 
  (Interest Match Score × 40) +
  (Distance Score × 30) +
  (Rating Score × 20) +
  (Popularity Score × 10)

Where:
- Interest Match: Tag frequency weight (0-1) × 40
- Distance Score: (1 - distance/maxDistance) × 30
- Rating Score: (rating >= 4) ? 20 : 0
- Popularity Score: (popularityScore / maxPopularity) × 10
```

**Implementation**: `Server/services/recommendationService.js`

### 3. Tag Weight Calculation
**Purpose**: Determine user interest weights from saved posts

**Process**:
1. Extract hashtags from saved posts
2. Normalize tags (lowercase, remove #)
3. Count frequency of each tag
4. Store in UserInterest.tagWeights
5. Use frequency as weight in scoring

**Implementation**: Updated when user saves post with hashtags

### 4. Debouncing Algorithm
**Purpose**: Optimize API calls for autocomplete

**Implementation**:
```javascript
useEffect(() => {
  const timer = setTimeout(() => {
    // API call after 300ms of no typing
    fetchAutocomplete(input);
  }, 300);
  
  return () => clearTimeout(timer);
}, [input]);
```

**Usage**: Search inputs, place autocomplete

---

## Data Flow Examples

### Example 1: User Identifies Landmark
```
1. User uploads image on /landmark page
2. Frontend gets user's GPS location
3. POST /landmarks/identify
   - Multipart: image file
   - Body: { lat, lng }
4. Backend:
   a. Convert image to base64
   b. Call Google Vision API (all features)
   c. Multi-step detection:
      - Try LANDMARK_DETECTION
      - If fails → Try WEB_DETECTION
      - If fails → Try LABEL_DETECTION
      - If fails → Nearby Search
   d. Verify with Google Places API
   e. Fetch photos
   f. Return result with detection metadata
5. Frontend stores in sessionStorage
6. Navigate to /landmark/result
7. Display result with:
   - Detection method badge
   - Confidence percentage
   - AI-generated description (with coordinates)
   - Photos
   - Nearby places
```

### Example 2: User Searches for Place
```
1. User types in Search page (Places tab)
2. Debounce 300ms
3. GET /api/places/autocomplete?input=:query
4. Backend proxies Google Places Autocomplete API
5. Returns suggestions: { place_id, main_text, secondary_text }
6. Display dropdown
7. User selects suggestion
8. GET /api/places/by-google-id/:googlePlaceId
9. Backend:
   a. Check database for existing place
   b. If not found:
      - Fetch from Google Places Details API
      - Fetch photos
      - Create Place document
   c. Return MongoDB place
10. Navigate to /user/place/:placeId
11. Display place details with AI description
```

### Example 3: Real-Time Message
```
1. User sends message in Chats page
2. If image: Upload to Cloudinary first
3. Socket.IO emit: 'send-message'
   {
     conversationId, recipientId, text, imageUrl
   }
4. Server:
   a. Authenticate socket (JWT)
   b. Create/update conversation
   c. Save message to database
   d. Populate sender/recipient
   e. Update conversation lastMessage
   f. Emit 'new-message' to:
      - Conversation room
      - Recipient's personal room
5. Recipients receive real-time message
6. Update UI immediately
7. Play sound notification (if not viewing conversation)
8. Update unread badge
```

### Example 4: Personalized Recommendations
```
1. User visits /recommendations page
2. Get user location (if available)
3. GET /api/recommendations/personalized?latitude=:lat&longitude=:lng
4. Backend:
   a. Get user profile (interests, visited places)
   b. Get UserInterest (saved post tags)
   c. Combine interests + tags
   d. Query Place collection:
      - Exclude visited places
      - Filter by tags/interests
      - If location: Use $geoNear
      - Limit to 600 candidates
   e. Calculate scores:
      - Interest match (weighted)
      - Distance (if location provided)
      - Rating (if >= 4)
      - Popularity
   f. Sort by total score
   g. Return top 10
5. Frontend displays recommendation cards
6. Show reason for each recommendation
7. Click to navigate to place detail
```

---

## Environment Variables

### Server (.env)
```env
# Database
MONGODB_URI=mongodb+srv://...

# Server
PORT=3000
NODE_ENV=development
SECRET_KEY=your_jwt_secret_key

# Google APIs
GOOGLE_MAPS_API_KEY=your_key
GOOGLE_PLACES_API_KEY=your_key
GOOGLE_VISION_API_KEY=your_key
GOOGLE_GEMINI_API_KEY=your_key
GOOGLE_API_KEY=your_key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASSWORD=your_password

# TextRazor
TEXTRAZOR_API_KEY=your_key

# OAuth
AUTH0_DOMAIN=your_domain
AUTH0_CLIENT_ID=your_client_id
AUTH0_CLIENT_SECRET=your_client_secret
AUTH0_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

---

## Deployment Considerations

### Backend
- MongoDB Atlas for database
- Environment variables for secrets
- CORS configuration for production
- Rate limiting (recommended)
- Error logging service
- Backup strategy

### Frontend
- Build with Vite: `npm run build`
- Static file hosting
- Environment variables for API URLs
- CDN for assets

### Security
- HTTPS in production
- Secure cookie flags
- API key restrictions in Google Cloud Console
- Input validation
- Rate limiting
- Security headers

---

## Testing & Debugging

### Development Tools
- Nodemon for auto-restart
- Vite HMR for frontend
- MongoDB Compass for database inspection
- Postman/Thunder Client for API testing

### Logging
- Console logging in development
- Error logging with stack traces
- Security event logging
- API request logging

### Common Issues & Solutions

1. **CORS Errors**: Check CORS configuration in server
2. **Authentication Failures**: Verify JWT secret and token expiry
3. **Image Upload Failures**: Check Cloudinary credentials
4. **Google API Errors**: Verify API keys and enabled APIs
5. **Socket.IO Connection Issues**: Check authentication token

---

## Future Enhancements

### Planned Features
1. Machine learning for better recommendations
2. Redis caching for distributed systems
3. Real-time recommendation updates
4. User feedback loop (thumbs up/down)
5. Advanced analytics dashboard
6. Mobile app push notifications
7. Offline mode support
8. Multi-language support

### Performance Improvements
1. Database query optimization
2. Image lazy loading
3. Code splitting
4. Service worker for offline support
5. CDN for static assets

---

## Conclusion

This documentation provides a comprehensive overview of the Journey Through Pakistan project, covering all aspects from architecture to implementation details. The platform successfully combines AI-powered features, real-time communication, location services, and social media functionality to create an immersive travel experience for users exploring Pakistan.

**Key Strengths**:
- Scalable three-tier architecture
- Real-time features with Socket.IO
- AI integration for intelligent recommendations
- Comprehensive admin management
- Secure authentication and authorization
- Location-based services
- Modern, responsive UI/UX

**Technologies Mastered**:
- Full-stack JavaScript (Node.js, React, React Native)
- Real-time communication (Socket.IO)
- AI integration (Google Gemini)
- Cloud services (Cloudinary, MongoDB Atlas)
- Third-party APIs (Google Maps, Places, Vision)
- Database design and optimization
- Security best practices

---

*Last Updated: [Current Date]*
*Version: 1.0*
