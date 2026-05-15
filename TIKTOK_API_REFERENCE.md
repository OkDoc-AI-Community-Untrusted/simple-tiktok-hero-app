# TikTok API Reference for Hero App

This document details the TikTok Content Posting API capabilities used by the Simple TikTok Hero App.

## API Overview

The TikTok Content Posting API allows developers to:

- Create and publish videos directly to creator accounts
- Upload draft videos for later publishing
- Retrieve user information
- Manage video metadata (captions, hashtags, etc.)

### API Base URL

```
https://open.tiktokapis.com/v1
```

### Authentication

All API requests require:

```
Authorization: Bearer {access_token}
Content-Type: application/json
```

Access tokens are obtained through OAuth 2.0 flow.

## Endpoints Used

### 1. OAuth Token Exchange

**Endpoint:** `POST /oauth/token/`

**Purpose:** Exchange authorization code for access token

**Request:**
```json
{
  "client_key": "your_client_id",
  "client_secret": "your_client_secret",
  "code": "authorization_code_from_callback",
  "grant_type": "authorization_code",
  "redirect_uri": "https://your-app.com"
}
```

**Response:**
```json
{
  "data": {
    "access_token": "...",
    "expires_in": 86400,
    "open_id": "...",
    "refresh_token": "...",
    "token_type": "Bearer",
    "scope": "user.info.basic,video.upload"
  },
  "message": "success"
}
```

**Used In:** `AuthService.handleOAuthCallback()`

---

### 2. Get User Info

**Endpoint:** `GET /user/info/`

**Purpose:** Retrieve current user's profile information

**Request:**
```
GET /user/info/?fields=open_id,union_id,avatar_url,display_name,username,follower_count,video_count,like_count
Authorization: Bearer {access_token}
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `fields` | string | Comma-separated fields to retrieve |

**Available Fields:**
- `open_id`: Unique identifier
- `union_id`: Cross-platform identifier
- `avatar_url`: Profile picture URL
- `display_name`: User's display name
- `username`: @username
- `follower_count`: Number of followers
- `video_count`: Total videos uploaded
- `like_count`: Total likes received

**Response:**
```json
{
  "data": {
    "user": {
      "open_id": "123456789",
      "union_id": "xyz789",
      "avatar_url": "https://...",
      "display_name": "John Doe",
      "username": "johndoe",
      "follower_count": 1500,
      "video_count": 42,
      "like_count": 5230
    }
  },
  "message": "success"
}
```

**Used In:** `TikTokService.getUserInfo()`, `AuthService.handleOAuthCallback()`

---

### 3. Initialize Video Upload

**Endpoint:** `POST /video/upload/`

**Purpose:** Get upload URL for video files

**Request:**
```
POST /video/upload/
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Response:**
```json
{
  "data": {
    "upload_url": "https://upload.tiktok.com/v1/upload",
    "upload_id": "vid_12345..."
  },
  "message": "success"
}
```

**Upload Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `upload_url` | string | URL to upload video to |
| `upload_id` | string | Unique identifier for this upload |

**Used In:** `TikTokService.uploadVideo()`

---

### 4. Create Video Post

**Endpoint:** `POST /post/create/`

**Purpose:** Create and publish a new video post

**Request:**
```json
{
  "source_info": {
    "source": "SCHEDULE_POST",
    "schedule_type": "NOW"
  },
  "post_info": {
    "title": "This is my awesome video!",
    "cover_img": "https://..."
  },
  "video_id": "vid_12345..."
}
```

**Request Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `source_info.source` | string | Always `"SCHEDULE_POST"` for API posts |
| `source_info.schedule_type` | string | `"NOW"` for immediate posting |
| `post_info.title` | string | Post caption (max 2,200 chars) |
| `post_info.cover_img` | string | Custom thumbnail URL (optional) |
| `video_id` | string | ID from upload initialization |

**Response:**
```json
{
  "data": {
    "video_id": "v1234567890123456789"
  },
  "message": "success"
}
```

**Used In:** `TikTokService.createPost()`

---

## OAuth Flow

### Authorization Request

```
GET https://www.tiktok.com/v1/oauth/authorize/?
  client_key={your_client_id}&
  response_type=code&
  scope=user.info.basic,video.create&
  redirect_uri={your_redirect_uri}&
  state={random_state}
```

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| `client_key` | Your TikTok Client ID |
| `response_type` | Always `"code"` |
| `scope` | Space-separated permissions |
| `redirect_uri` | Must match registered URI |
| `state` | Random string for CSRF protection |

**Scopes Used:**
- `user.info.basic` - Get user basic info
- `video.create` - Create video posts
- `video.upload` - Upload video drafts

### Authorization Response

User is redirected to:

```
{redirect_uri}?code={auth_code}&state={state}
```

Extract the `code` and exchange for token in backend.

---

## File Upload Specifications

### Supported Formats

**Video:**
- Format: MP4, WebM
- Codec: H.264 or VP9
- Resolution: Min 720p, Max 4K
- Frame rate: 24-60 fps
- Bitrate: 512 kbps - 68 mbps

**Image (Optional Cover):**
- Format: JPEG, PNG
- Resolution: 1080x1920px (9:16 aspect ratio)
- Max size: 5MB

### File Constraints

| Constraint | Value |
|-----------|-------|
| Max file size | 4GB |
| Min duration | 3 seconds |
| Max duration | 600 seconds |
| Min width | 540px |
| Max framerate | 60fps |
| Supported formats | MP4, WebM |

### Upload Procedure

```
1. Call POST /video/upload/ to get upload_url and upload_id
2. Upload video file to the upload_url (via multipart form)
3. Use upload_id in POST /post/create/ to publish
```

---

## Rate Limits & Quotas

### API Rate Limits

| Endpoint | Limit |
|----------|-------|
| `/oauth/token/` | 1000 req/day per app |
| `/user/info/` | 1000 req/hour per token |
| `/video/upload/` | 100 req/hour per token |
| `/post/create/` | 100 req/hour per token |

### Content Quotas

| Quota | Limit |
|-------|-------|
| Posts per 24 hours | ~15 posts per creator |
| Videos per creator | Unlimited |
| Max video length | 600 seconds |

⚠️ **Note:** The 15 posts per day limit varies by account. Some accounts may have higher limits.

---

## Error Responses

### Error Format

```json
{
  "error": "error_code",
  "error_description": "Human-readable error message",
  "message": "error details"
}
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `invalid_request` | Missing/invalid parameters | Check request format |
| `unauthorized` | Invalid/expired token | Re-authenticate |
| `forbidden` | Insufficient permissions | Request additional scopes |
| `not_found` | Video ID doesn't exist | Verify upload ID |
| `rate_limit_exceeded` | Too many requests | Wait before retrying |
| `invalid_video` | Video format/size issues | Check file specifications |

### Handling Errors in App

```typescript
try {
  const result = await tiktokService.createPost(data);
} catch (error) {
  if (error.response?.data?.error === 'unauthorized') {
    // Token expired, need to re-authenticate
    authService.logout();
  } else if (error.response?.status === 429) {
    // Rate limited
    showError('Too many requests, try again later');
  } else {
    // Generic error
    showError(error.response?.data?.error_description);
  }
}
```

---

## Token Lifecycle

### Token Expiry

- **Access Token Duration:** 24 hours (86,400 seconds)
- **Refresh Token Duration:** 365 days
- **Indicator:** `expires_in` field in response

### Token Refresh

```typescript
// Backend handler for token refresh
POST /oauth/token/
{
  "client_key": "...",
  "client_secret": "...",
  "refresh_token": "...",
  "grant_type": "refresh_token"
}
```

### App Implementation

The app handles token expiry by:

1. Storing expiry time: `auth.tokenExpiry = Date.now() + expiresIn * 1000`
2. Checking on auth retrieval:
   ```typescript
   if (expiry && parseInt(expiry) < Date.now()) {
     logout(); // Token expired
   }
   ```
3. Prompting re-login when needed

---

## Content Policies

### Video Guidelines

- ✓ Original content
- ✓ Community guidelines compliant
- ✓ Appropriate for general audience
- ✗ Copyrighted music without rights
- ✗ Explicit content
- ✗ Misleading information

### Caption Guidelines

- Max 2,200 characters
- Support for hashtags: #hashtag
- Support for mentions: @username
- Support for emojis
- Links may trigger review

### Posting Limits

⚠️ **Important Limitations:**

1. **Daily Limit:** ~15 posts per day per creator account
2. **No Scheduling:** API posts immediately (no future scheduling)
3. **No Bulk Upload:** One video at a time
4. **Content Review:** Videos may be reviewed by TikTok

---

## Best Practices

### 1. Error Handling

```typescript
try {
  await tiktokService.createPost(postData);
  notifyPostCreated();
} catch (error) {
  if (error.response?.status === 401) {
    authService.logout();
  } else {
    showUserError('Failed to create post');
  }
}
```

### 2. Token Management

```typescript
// Store token with expiry
const auth = {
  accessToken: data.access_token,
  tokenExpiry: Date.now() + data.expires_in * 1000,
  refreshToken: data.refresh_token
};
authService.saveAuth(auth);

// Check before use
const token = authService.getAccessToken();
if (!token) {
  // Prompt re-login
}
```

### 3. File Validation

```typescript
function validateVideo(file: File): boolean {
  // Check format
  if (!['video/mp4', 'video/webm'].includes(file.type)) {
    return false;
  }

  // Check size
  if (file.size > 4 * 1024 * 1024 * 1024) {
    return false;
  }

  // Check duration (requires loading video)
  return true;
}
```

### 4. User Feedback

```typescript
// Show progress
startPosting();
notifyUser('Uploading video...');

// Handle success
postSuccess = 'Post created successfully!';
resetForm();

// Handle errors with detail
postError = error.response?.data?.error_description;
```

---

## Testing

### Test Accounts

- Create a dedicated TikTok test account
- Use that account for development
- Test posting limits and quotas

### Test Videos

- 10 second MP4
- 30 second WebM
- With and without cover image
- With various caption lengths

### Manual Testing

```bash
# 1. Start backend server
cd backend
npm start

# 2. Start frontend
npm start

# 3. Test OAuth flow
# Login and verify tokens are received

# 4. Test video upload
# Select test video and create post

# 5. Verify on TikTok
# Check if post appears on creator account
```

---

## Resources

- [TikTok Developer Documentation](https://developers.tiktok.com/)
- [Content Posting API Guide](https://developers.tiktok.com/products/content-posting-api/)
- [OAuth Authorization](https://developers.tiktok.com/doc/content-posting-api-get-started)
- [API Reference](https://developers.tiktok.com/doc/content-posting-api-reference/)

---

## Changelog

### TikTok API v1 (Current)

- ✓ Create posts with captions
- ✓ Upload videos (MP4, WebM)
- ✓ Custom cover images
- ✓ OAuth authentication
- ✓ User info retrieval

### Known Limitations

- ✗ No scheduled posting (posts immediately)
- ✗ No bulk uploads
- ✗ No video editing API
- ✗ Limited analytics data
- ✗ No direct message API