# Setup Guide

This guide walks you through everything you need to run the **Simple TikTok
Hero App** end-to-end:

1. Register a TikTok developer app and get a client key / secret.
2. Run a small backend that holds the client secret and proxies the v2
   Content Posting API.
3. Run this Angular frontend and connect it to your backend.

## 1. TikTok developer setup

1. Sign in at <https://developers.tiktok.com/> and click **Manage apps →
   Create app**.
2. Under **Add products** add **Login Kit** and **Content Posting API**.
3. In the **Login Kit** settings, add a **Redirect URI** for every origin
   you want to sign in from. For local development use the exact origin you
   serve the app from, e.g. `http://localhost:4200`. For GitHub Pages use
   the deployed URL, e.g. `https://<user>.github.io/simple-tiktok-hero-app/`.
4. Under **Scopes**, request:
   - `user.info.basic`
   - `video.upload`
   - `video.publish`
5. For posting, enable **Direct Post** under Content Posting API.
6. Copy the **Client Key** and **Client Secret** from the app dashboard.

> Apps in the "sandbox" tier can only post to TikTok accounts you've added
> as test users. Submit for review once you're ready for public use.

## 2. The backend

The browser cannot hold your **Client Secret**, so you need a small server
to:

- exchange the OAuth `code` for an access token,
- fetch creator info,
- initialize and finalize video uploads.

Below is a minimal reference implementation in Node 20 + Express. Drop it
into a fresh directory.

### `package.json`

```json
{
  "name": "tiktok-hero-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": { "start": "node server.js" },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2"
  }
}
```

### `.env`

```
TIKTOK_CLIENT_KEY=...
TIKTOK_CLIENT_SECRET=...
FRONTEND_ORIGIN=http://localhost:4200
PORT=3000
```

### `server.js`

```js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN?.split(',') ?? '*',
}));

const TT = 'https://open.tiktokapis.com';
const KEY = process.env.TIKTOK_CLIENT_KEY;
const SECRET = process.env.TIKTOK_CLIENT_SECRET;

function bearer(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

// 1. OAuth code → access token, plus a quick user info lookup
app.post('/api/auth/tiktok/callback', async (req, res) => {
  try {
    const { code, redirect_uri } = req.body;
    const tokenRes = await fetch(`${TT}/v2/oauth/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: KEY,
        client_secret: SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri,
      }),
    });
    const token = await tokenRes.json();
    if (!tokenRes.ok || token.error) {
      return res.status(400).json(token);
    }

    // Best-effort user info; ignore failure
    let user = {};
    try {
      const u = await fetch(
        `${TT}/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username`,
        { headers: { Authorization: `Bearer ${token.access_token}` } }
      );
      const body = await u.json();
      user = body?.data?.user ?? {};
    } catch {}

    res.json({
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_in: token.expires_in,
      open_id: token.open_id ?? user.open_id,
      avatar_url: user.avatar_url,
      display_name: user.display_name,
      username: user.username,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 2. Creator info — required before posting, gives privacy options etc.
app.post('/api/tiktok/creator-info', async (req, res) => {
  const token = bearer(req);
  const r = await fetch(`${TT}/v2/post/publish/creator_info/query/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  res.status(r.status).json(await r.json());
});

// 3. Initialize a video upload (we use FILE_UPLOAD so the client PUTs the file)
app.post('/api/tiktok/video/init', async (req, res) => {
  const token = bearer(req);
  const { title, privacy_level, video_size } = req.body;
  const r = await fetch(`${TT}/v2/post/publish/video/init/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      post_info: {
        title,
        privacy_level: privacy_level || 'SELF_ONLY',
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: {
        source: 'FILE_UPLOAD',
        video_size,
        chunk_size: video_size,
        total_chunk_count: 1,
      },
    }),
  });
  res.status(r.status).json(await r.json());
});

// 4. Poll publish status
app.post('/api/tiktok/publish/status', async (req, res) => {
  const token = bearer(req);
  const r = await fetch(`${TT}/v2/post/publish/status/fetch/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ publish_id: req.body.publish_id }),
  });
  res.status(r.status).json(await r.json());
});

app.listen(process.env.PORT || 3000);
```

Run it:

```bash
npm install
npm start
```

> The video file itself goes **directly from the browser to TikTok** via the
> `upload_url` returned in step 3 — it does not pass through your backend.

## 3. The frontend

```bash
npm install
npm start
```

Open <http://localhost:4200>, then in the app's first screen:

1. Click **Configure first**.
2. Paste the **TikTok Client Key**.
3. Paste the **Backend URL** (e.g. `http://localhost:3000`).
4. **Save**, then **Continue with TikTok** — a popup opens, you authorize,
   and you land back in the app.

## 4. Deploying to GitHub Pages

The repo includes `.github/workflows/deploy.yml`. After pushing to `main`:

1. In your repo settings go to **Pages → Build and deployment** and select
   **GitHub Actions** as the source.
2. The workflow runs `npm run build:prod` and publishes
   `dist/simple-tiktok-hero-app`.
3. Add the resulting URL (e.g. `https://<user>.github.io/<repo>/`) as a
   **Redirect URI** in your TikTok app so the popup OAuth flow works in
   production too.

## Troubleshooting

**Popup is blocked** — most browsers require the popup to open from a real
user click. Make sure you click **Continue with TikTok** directly; voice /
tool-driven login may need a user gesture first.

**404 from `https://www.tiktok.com/v2/auth/authorize/`** — your client key
is wrong or the app is in a region where Login Kit isn't enabled. Verify
the key in the dev portal.

**`redirect_uri_mismatch`** — the redirect URI in the request must match a
URI registered under your app's Login Kit settings, character for character
(trailing slash matters).

**`scope_not_authorized`** — request the `video.publish` / `video.upload`
scopes in the dev portal, then re-authorize.

**`spam_risk_user_banned_from_posting`** — TikTok caps roughly 15 posts per
creator per 24 hours via the API. Try again later or with a different
account.
