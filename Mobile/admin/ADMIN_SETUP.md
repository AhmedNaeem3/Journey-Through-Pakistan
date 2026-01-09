# Admin Panel Setup - Mobile App

## Overview

The mobile app includes a complete admin panel that mirrors the web admin functionality. The admin panel is separate from regular user authentication and **does not have a signup option** - only login is available.

## Admin Login Flow

1. **From Main Login Screen**:
   - Open the app
   - You'll see the regular login screen with email/password fields
   - At the bottom, there's an **"Admin Login"** button
   - Tap this button to navigate to the Admin Login screen

2. **Admin Login Screen**:
   - **NO SIGNUP OPTION** - Only login is available
   - Enter admin email and password
   - Tap "Sign In"
   - If credentials are valid and user has admin privileges, you'll be redirected to the Admin Dashboard

## Admin Dashboard Features

After successful admin login, you'll have access to:

### 1. **Dashboard Overview**
   - Total Users statistics
   - Active Sessions
   - Pending Posts
   - Flagged Content
   - Recent Activity Feed

### 2. **Manage Users** 👥
   - View all users
   - Search and filter users
   - Edit user details
   - Delete users
   - View user profiles

### 3. **Manage Admins** 👤
   - View all admin users
   - Create new admins
   - Update admin roles
   - Remove admin privileges

### 4. **Manage Places/Recommendations** 📍
   - View all recommendations
   - Edit place details
   - Delete recommendations
   - Manage place categories

### 5. **Moderation** 🔍
   - Review flagged content
   - Approve or reject posts
   - Manage reported content

### 6. **Analytics** 📊
   - View user trends
   - Content statistics
   - Platform metrics

### 7. **Notifications** 🔔
   - Send notifications to all users
   - View notification history
   - Manage notification settings

## Navigation

From the Admin Dashboard, tap any of the action buttons to navigate to the respective management screens. Use the "Logout" button in the top-right corner to return to the login screen.

## API Integration

The admin panel uses the same backend API as the web admin:
- Admin login endpoint: `/users/login` (with `x-admin-panel: true` header)
- All admin endpoints are prefixed with `/admin/`
- Admin token is stored separately from regular user token

## Security

- Admin authentication is separate from regular user authentication
- Admin tokens are stored in `adminToken` (separate from `token`)
- Admin routes require valid admin credentials
- Only users with `isAdmin: true` and `adminRole` can access admin features

## Troubleshooting

### Can't access admin panel
- Verify your user account has `isAdmin: true` and `adminRole` set in the database
- Check that you're using the correct admin credentials
- Ensure the backend server is running and accessible

### Admin login fails
- Check server logs for authentication errors
- Verify CORS settings allow mobile app origin
- Ensure admin token is being stored correctly

### Navigation issues
- Make sure all admin screens are properly registered in `App.js`
- Check that AdminContext is properly wrapping the app

## Files Structure

```
MobileApp/
├── src/
│   ├── screens/
│   │   ├── AdminLoginScreen.jsx      # Admin login (NO signup)
│   │   ├── AdminDashboardScreen.jsx  # Main admin dashboard
│   │   ├── ManageUsersScreen.jsx     # User management
│   │   ├── ManageAdminsScreen.jsx     # Admin management
│   │   ├── ManageRecommendationsScreen.jsx  # Places management
│   │   ├── ModerationScreen.jsx      # Content moderation
│   │   ├── AnalyticsScreen.jsx       # Analytics dashboard
│   │   └── NotificationsScreen.jsx   # Notifications
│   ├── context/
│   │   └── AdminContext.jsx           # Admin authentication context
│   └── services/
│       └── adminApi.js                # Admin API calls
└── App.js                             # Navigation setup
```

## Notes

- Admin login screen has **NO signup option** - this is intentional
- Regular users cannot access admin features
- Admin session persists until logout
- Admin token is separate from regular user token

