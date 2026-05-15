# Simple TikTok Hero App

A simple, responsive TikTok web application built with Angular and Ionic, designed as an OkDoc Hero App plugin. Create and manage TikTok posts directly from this app with OAuth authentication and session persistence.

## Features

- **OAuth Authentication**: Secure login with TikTok accounts
- **Session Persistence**: Automatically remember user sessions with localStorage
- **Content Creation**: Upload videos/images and add captions to create posts
- **Responsive Design**: Works seamlessly on mobile devices and smaller screens
- **OkDoc SDK Integration**: Fully integrated with OkDoc's iframe plugin system
- **Voice Command Support**: Control the app using voice commands through OkDoc
- **Real-time Notifications**: Notify OkDoc host when posts are created

## Tech Stack

- **Frontend**: Angular 20, Ionic 8
- **Styling**: SCSS
- **SDK**: OkDoc Plugin SDK (iframe)
- **Deployment**: GitHub Pages

## Project Structure

```
simple-tiktok-hero-app/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── login/          # Login & OAuth setup
│   │   │   ├── post/           # Post creation form
│   │   │   └── nav/            # Navigation & user menu
│   │   ├── services/
│   │   │   ├── auth.service.ts      # Authentication logic
│   │   │   ├── tiktok.service.ts    # TikTok API calls
│   │   │   └── okdoc.service.ts     # OkDoc SDK integration
│   │   ├── app.component.*     # Main app component
│   │   └── app.module.ts       # Angular module
│   ├── styles.scss             # Global styles
│   ├── main.ts                 # Angular bootstrap
│   └── index.html              # HTML entry point
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions deployment
├── angular.json                # Angular config
├── tsconfig.json              # TypeScript config
└── package.json               # Dependencies

## Setup Instructions

### Prerequisites

- Node.js 20+ and npm 10+
- A TikTok Developer Account
- Backend API server (for OAuth callback handling)

### 1. Install Dependencies

```bash
npm install
```

### 2. Obtain TikTok API Credentials

1. Go to [TikTok Developer Portal](https://developers.tiktok.com/)
2. Create a new application
3. Note your **Client ID** and **Client Secret**
4. Set Redirect URI to your app's URL: `https://your-domain.com` or `http://localhost:4200`
5. Request access to the **Content Posting API** and **User Info** scopes

### 3. Set Up Backend Server

You need a backend server to handle OAuth callbacks safely. Here's a minimal example using Node.js/Express:

```javascript
// backend/auth-handler.js
const express = require('express');
const axios = require('axios');
const app = express();

app.post('/api/auth/tiktok/callback', async (req, res) => {
  const { code } = req.body;
  const clientId = process.env.TIKTOK_CLIENT_ID;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const redirectUri = process.env.REDIRECT_URI;

  try {
    const response = await axios.post(
      'https://open.tiktokapis.com/v1/oauth/token/',
      {
        client_key: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      }
    );

    const { access_token, open_id, expires_in, refresh_token } = response.data;

    // Fetch user info
    const userResponse = await axios.get(
      'https://open.tiktokapis.com/v1/user/info/',
      {
        headers: { Authorization: `Bearer ${access_token}` },
        params: { fields: 'open_id,union_id,avatar_url,display_name,username' }
      }
    );

    const userData = userResponse.data.data.user;

    res.json({
      access_token,
      open_id,
      expires_in,
      refresh_token,
      avatar_url: userData.avatar_url,
      display_name: userData.display_name,
      username: userData.username
    });
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(400).json({ message: 'Authentication failed' });
  }
});

app.listen(3000, () => console.log('Backend server running on port 3000'));
```

### 4. Configure the App

When you first load the app, you'll see a login screen. Click "Configure API Keys" and enter:

- **TikTok Client ID**: Your app's Client ID from the Developer Portal
- **Backend URL**: Your backend server URL (e.g., `http://localhost:3000`)

These will be saved to localStorage for future sessions.

### 5. Run Development Server

```bash
npm start
```

Open [http://localhost:4200](http://localhost:4200) in your browser.

### 6. Build for Production

```bash
npm run build:prod
```

The build output will be in the `dist/simple-tiktok-hero-app` directory.

## Deployment

### Deploy to GitHub Pages

The app includes a GitHub Actions workflow that automatically deploys to GitHub Pages when you push to `main`.

1. Push your code to GitHub
2. Enable GitHub Pages in repository settings
3. Select "GitHub Actions" as the deployment source
4. The workflow will build and deploy automatically

### Deploy to Custom Server

1. Build the project: `npm run build:prod`
2. Upload the contents of `dist/simple-tiktok-hero-app` to your server
3. Configure your server to serve `index.html` for all routes (for Angular routing to work)

## OkDoc Integration

This app is designed to work as an OkDoc Hero App with the following tools:

### Available Tools

- **login**: Authenticate user with TikTok
- **create_post**: Create a new TikTok post with caption
- **logout**: Logout the current user
- **get_user_info**: Retrieve current user information

### Example Voice Commands

- "Login to TikTok"
- "Create a post with caption: Check out my new video!"
- "Get my user information"
- "Logout"

## API Limitations

⚠️ **Important**: TikTok has the following API limitations:

- **Daily Post Limit**: Approximately 15 posts per day per creator account (varies by account)
- **File Size**: Maximum 4GB per video
- **Video Format**: MP4 or WebM, 3-600 seconds long
- **Token Expiry**: Access tokens expire and need refresh
- **No Scheduled Posts**: The API doesn't support scheduling posts for future times

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Responsive Design

The app is fully responsive and works on:

- Desktop screens (1024px+)
- Tablets (600px - 1024px)
- Mobile phones (< 600px)
- iframe embeds (dynamically resizable)

## Cache Busting

The app implements cache busting through:

1. **Build Time Version**: Included in `index.html` meta tag
2. **Service Worker**: (Optional for offline support)
3. **Build Hashing**: Angular automatically hashes output files

To force users to get the latest version, clear browser cache or update the version in package.json.

## Troubleshooting

### "Not authenticated" error
- Make sure you've configured API keys in the login screen
- Check that your backend server is running
- Verify your Client ID and backend URL are correct

### "Failed to initialize upload"
- Ensure the backend server is accessible
- Check network requests in browser DevTools
- Verify CORS is properly configured on your backend

### OAuth redirect not working
- Confirm the Redirect URI in TikTok Developer Portal matches your app URL
- Check browser console for errors
- Ensure your backend server is running and accessible

### Session not persisting
- Check browser localStorage is enabled
- Clear localStorage manually if session data is corrupted
- Ensure cookies are allowed in browser settings

## Security Considerations

⚠️ **Security Notes**:

1. **Client Secret**: Never expose your TikTok Client Secret in the frontend
2. **OAuth Callback**: Always handle OAuth callback on a secure backend server
3. **Token Storage**: Access tokens are stored in localStorage (accessible to XSS attacks)
4. **HTTPS**: Use HTTPS in production to protect tokens in transit
5. **Environment Variables**: Never commit API keys to version control

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for personal or commercial use.

## Support

For issues or questions:

1. Check the [OkDoc Documentation](https://github.com/okDoc-ai/hero-app-sdk-docs)
2. Review [TikTok Developer Docs](https://developers.tiktok.com/)
3. Open an issue on GitHub
4. Contact the community

## References

- [OkDoc SDK Documentation](https://github.com/okDoc-ai/plugin-sdk)
- [OkDoc Hero App Guide](https://github.com/okDoc-ai/hero-app-sdk-docs)
- [TikTok Content Posting API](https://developers.tiktok.com/products/content-posting-api/)
- [Angular Documentation](https://angular.io/docs)
- [Ionic Documentation](https://ionicframework.com/docs)
