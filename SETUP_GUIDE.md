# Simple TikTok Hero App - Complete Setup Guide

This guide walks you through setting up the Simple TikTok Hero App from scratch.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Get TikTok Developer Credentials](#get-tiktok-developer-credentials)
3. [Set Up Backend Server](#set-up-backend-server)
4. [Local Development](#local-development)
5. [Configuration](#configuration)
6. [Deployment](#deployment)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- Node.js 20.0.0 or higher
- npm 10.0.0 or higher
- A modern web browser (Chrome, Firefox, Safari, Edge)
- A TikTok Developer Account
- Git (for version control)

### Verify Installation

```bash
node --version    # Should be v20.0.0 or higher
npm --version     # Should be 10.0.0 or higher
git --version     # Should be installed
```

## Get TikTok Developer Credentials

### Step 1: Create Developer Account

1. Go to [TikTok Developer Console](https://developers.tiktok.com/)
2. Click "Start Building" or log in with your account
3. Create a new account if you don't have one (or use existing TikTok account)

### Step 2: Create Application

1. In the Developer Console, click "Create an app"
2. Select "Web" as your platform
3. Fill in the application details:
   - **Application Name**: "TikTok Hero App" (or your choice)
   - **Use Case**: "Content Management"
   - **Description**: "A Hero App for creating TikTok content"
   - **Legal Agreement**: Accept terms and continue

### Step 3: Get Your Client Credentials

1. After app creation, go to the "Settings" tab
2. Under "Basic Information", note:
   - **Client Key** (Client ID): You'll need this
   - **Client Secret**: Store this securely (never share!)

3. Scroll to "Redirect URLs" and add:
   ```
   For local development: http://localhost:4200
   For production: https://your-domain.com
   ```

### Step 4: Request API Permissions

1. Go to the "Permissions" tab
2. Request the following scopes:
   - `user.info.basic` - Get user basic information
   - `video.create` - Create videos (direct post)
   - `video.upload` - Upload videos to drafts
   - `video.list` - List user videos (optional)

3. Submit your request for review (may take 1-3 business days)

### Step 5: Set Up Webhook (Optional)

For production apps, consider setting up webhooks:

1. Go to "Webhooks" section
2. Enter your backend server webhook URL
3. Verify the webhook configuration

## Set Up Backend Server

The backend server handles OAuth securely. Here's a complete implementation:

### Backend Implementation

Create a new directory for your backend:

```bash
mkdir tiktok-hero-backend
cd tiktok-hero-backend
npm init -y
npm install express axios cors dotenv body-parser
```

Create `server.js`:

```javascript
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configuration
const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v1';
const CLIENT_ID = process.env.TIKTOK_CLIENT_ID;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:4200';

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// OAuth callback handler
app.post('/api/auth/tiktok/callback', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'Missing authorization code' });
    }

    // Exchange code for access token
    const tokenResponse = await axios.post(
      `${TIKTOK_API_BASE}/oauth/token/`,
      {
        client_key: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI
      },
      { timeout: 10000 }
    );

    const { access_token, refresh_token, expires_in, open_id } = tokenResponse.data;

    // Get user information
    const userResponse = await axios.get(
      `${TIKTOK_API_BASE}/user/info/`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        params: {
          fields: 'open_id,union_id,avatar_url,display_name,username'
        },
        timeout: 10000
      }
    );

    const userData = userResponse.data.data.user;

    // Return combined response to frontend
    res.json({
      access_token,
      refresh_token,
      expires_in,
      open_id,
      avatar_url: userData.avatar_url,
      display_name: userData.display_name,
      username: userData.username
    });
  } catch (error) {
    console.error('OAuth callback error:', error.response?.data || error.message);
    res.status(400).json({
      message: error.response?.data?.error || 'Authentication failed'
    });
  }
});

// Video upload initialization
app.post('/api/tiktok/upload/init', async (req, res) => {
  try {
    const { access_token } = req.body;

    if (!access_token) {
      return res.status(401).json({ message: 'Missing access token' });
    }

    const uploadResponse = await axios.post(
      `${TIKTOK_API_BASE}/video/upload/`,
      {},
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    const { data: uploadData } = uploadResponse.data;

    res.json({
      uploadUrl: uploadData.upload_url,
      uploadId: uploadData.upload_id
    });
  } catch (error) {
    console.error('Upload init error:', error.response?.data || error.message);
    res.status(400).json({
      message: error.response?.data?.error || 'Failed to initialize upload'
    });
  }
});

// Create post
app.post('/api/tiktok/post/create', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.replace('Bearer ', '');

    if (!accessToken) {
      return res.status(401).json({ message: 'Missing access token' });
    }

    const { caption, videoId, coverImageUrl } = req.body;

    const postResponse = await axios.post(
      `${TIKTOK_API_BASE}/post/create/`,
      {
        source_info: {
          source: 'SCHEDULE_POST',
          schedule_type: 'NOW'
        },
        post_info: {
          title: caption || '',
          cover_img: coverImageUrl
        },
        video_id: videoId
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    res.json({
      video_id: postResponse.data.data.video_id,
      success: true
    });
  } catch (error) {
    console.error('Create post error:', error.response?.data || error.message);
    res.status(400).json({
      message: error.response?.data?.error || 'Failed to create post'
    });
  }
});

// Get user info
app.get('/api/tiktok/user/info', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.replace('Bearer ', '');

    if (!accessToken) {
      return res.status(401).json({ message: 'Missing access token' });
    }

    const userResponse = await axios.get(
      `${TIKTOK_API_BASE}/user/info/`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          fields: 'open_id,union_id,avatar_url,display_name,username,follower_count,video_count,like_count'
        },
        timeout: 10000
      }
    );

    res.json(userResponse.data.data.user);
  } catch (error) {
    console.error('Get user info error:', error.response?.data || error.message);
    res.status(400).json({
      message: error.response?.data?.error || 'Failed to get user info'
    });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📝 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:4200'}`);
  console.log(`🔑 Client ID: ${CLIENT_ID ? '✓ Set' : '✗ Missing'}`);
});
```

Create `.env` file:

```
TIKTOK_CLIENT_ID=your_client_id_here
TIKTOK_CLIENT_SECRET=your_client_secret_here
REDIRECT_URI=http://localhost:4200
FRONTEND_URL=http://localhost:4200
NODE_ENV=development
PORT=3000
```

Run the backend:

```bash
npm start
```

## Local Development

### Step 1: Clone or Download

If using git:

```bash
git clone https://github.com/yourusername/simple-tiktok-hero-app.git
cd simple-tiktok-hero-app
```

Or download and extract the ZIP file.

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Start Development Server

```bash
npm start
```

The app will open at `http://localhost:4200`

### Step 4: Configure API Keys

1. Click "Configure API Keys" on the login page
2. Enter:
   - **TikTok Client ID**: Your Client Key from TikTok Developer Console
   - **Backend URL**: `http://localhost:3000`
3. Click "Save Configuration"

### Step 5: Login with TikTok

1. Click "Login with TikTok"
2. You'll be redirected to TikTok's authorization page
3. Authorize the app
4. You'll be redirected back to the app
5. Your session will be saved

## Configuration

### Environment Variables

Create a `.env` file in the root directory (for the frontend):

```env
# Optional: Set custom API base URL
# TIKTOK_API_BASE=https://open.tiktokapis.com/v1
```

### localStorage Configuration

The app stores these in browser localStorage:

- `tiktok_client_id` - Your TikTok Client ID
- `tiktok_auth` - Authentication token and user info
- `backend_url` - Backend server URL

To clear stored data:

```javascript
// In browser console
localStorage.clear();
```

## Deployment

### Deploy to GitHub Pages

1. Push your code to GitHub:

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. In GitHub repository settings:
   - Go to "Settings" → "Pages"
   - Select "GitHub Actions" as the source

3. The GitHub Actions workflow will automatically:
   - Install dependencies
   - Build the project
   - Deploy to GitHub Pages

Your app will be available at: `https://yourusername.github.io/simple-tiktok-hero-app/`

### Deploy to Custom Server (Nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /var/www/tiktok-hero-app/dist/simple-tiktok-hero-app;
        try_files $uri $uri/ /index.html;
    }
}
```

Build and upload:

```bash
npm run build:prod
# Upload dist/simple-tiktok-hero-app to /var/www/tiktok-hero-app/
```

### Deploy Backend

For production, use a service like Heroku, Railway, or AWS:

**Heroku Example:**

```bash
heroku create your-app-name
heroku config:set TIKTOK_CLIENT_ID=your_client_id
heroku config:set TIKTOK_CLIENT_SECRET=your_client_secret
heroku config:set REDIRECT_URI=https://your-app-name.herokuapp.com
heroku config:set FRONTEND_URL=https://your-domain.com

git push heroku main
```

## Troubleshooting

### "Client ID is required" or "Backend URL is required"

**Solution:**
1. Click "Configure API Keys" on login page
2. Re-enter your credentials
3. Make sure both fields are filled
4. Click "Save Configuration"

### OAuth Redirect Loop

**Possible causes:**
1. Redirect URI mismatch in TikTok Developer Console
2. Backend server not running
3. CORS issues

**Solution:**
1. Verify Redirect URI in TikTok Console matches your app URL
2. Ensure backend server is running: `npm start` in backend directory
3. Check browser console for CORS errors
4. Verify `FRONTEND_URL` in backend `.env` file

### "Failed to authenticate" Error

**Possible causes:**
1. Invalid Client ID or Secret
2. Backend server offline
3. Network connectivity issue
4. Code has expired (valid for ~1 minute)

**Solution:**
1. Verify Client ID in app configuration
2. Check backend server logs
3. Try again (codes are temporary)
4. Check internet connection

### "Access token expired"

**Solution:**
1. Logout and login again
2. The app will refresh your session

### CORS Error

**Solution:**
1. Ensure `FRONTEND_URL` in backend `.env` matches your frontend URL
2. Check that CORS is enabled in backend
3. Verify both frontend and backend are running

### Session Not Persisting

**Solution:**
1. Check that localStorage is enabled in browser
2. Clear localStorage and re-login: `localStorage.clear()` in console
3. Try incognito/private mode to test

### Video Upload Fails

**Possible causes:**
1. File exceeds 4GB limit
2. Format not supported (use MP4 or WebM)
3. Video duration not between 3-600 seconds

**Solution:**
1. Check file size and format
2. Try with a smaller test file
3. Check backend server logs for details

## Need Help?

1. **OkDoc Issues**: Check [OkDoc SDK Documentation](https://github.com/okDoc-ai/plugin-sdk)
2. **TikTok Issues**: Check [TikTok Developer Docs](https://developers.tiktok.com/)
3. **Angular Issues**: Check [Angular Documentation](https://angular.io/)
4. **Open an Issue**: Report problems on GitHub

## Additional Resources

- [TikTok Content Posting API Reference](https://developers.tiktok.com/doc/content-posting-api-reference/)
- [OAuth Authorization Flow](https://developers.tiktok.com/doc/content-posting-api-get-started)
- [Angular Best Practices](https://angular.io/guide/styleguide)
- [Ionic Component Library](https://ionicframework.com/docs/components)