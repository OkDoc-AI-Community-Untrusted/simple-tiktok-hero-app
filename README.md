# Simple TikTok Hero App

An OkDoc iframe plugin that lets a logged-in TikTok user upload a video with
a caption and publish it via the [TikTok Content Posting API].

Built with **Angular 20** and **Ionic 8** as standalone components.

[TikTok Content Posting API]: https://developers.tiktok.com/products/content-posting-api/

## Features

- TikTok OAuth (v2) with a popup window — works inside the OkDoc iframe.
- Session persists in `localStorage`; resumes on reload.
- Video posting form (caption + file picker) using TikTok's `/v2/post/publish/video/init/` flow.
- OkDoc SDK tools: `login`, `logout`, `get_user_info`, `publish_post`.
- Notifies the host on `auth_state_changed` and `post_published`.
- Mobile-first responsive design.
- GitHub Actions workflow that builds in production mode and deploys to GitHub Pages.

## Quick start

```bash
npm install
npm start          # dev server on http://localhost:4200
npm run build:prod # production build into dist/
```

On first launch the app prompts for two values:

- **TikTok Client Key** — from your app at <https://developers.tiktok.com/>.
- **Backend URL** — the URL of a small server that holds your TikTok
  **Client Secret** and proxies the OAuth token exchange and posting calls.
  TikTok forbids putting the client secret in a browser, so this backend is
  required. A complete Node/Express reference implementation is in
  [`SETUP_GUIDE.md`](SETUP_GUIDE.md).

Once configured, click **Continue with TikTok** to authenticate.

## Project layout

```
src/
  app/
    components/
      login/        login + configuration form
      post/         caption + video upload form
      nav/          top bar with user + logout
    services/
      auth-state.service.ts   BehaviorSubject<TikTokAuth | null>
      auth.service.ts         popup-based OAuth flow
      config.service.ts       client key + backend URL
      tiktok.service.ts       v2 Content Posting API client
      okdoc.service.ts        SDK init, tools, notifiers
    app.component.*           shell that switches login ↔ post
  index.html                  loads the OkDoc SDK + popup-callback shim
  main.ts                     standalone bootstrap
```

## OkDoc tools exposed

| Tool             | Description                                                              |
| ---------------- | ------------------------------------------------------------------------ |
| `login`          | Opens the TikTok OAuth popup.                                            |
| `logout`         | Clears stored credentials.                                               |
| `get_user_info`  | Returns the currently authenticated user (or an error if not signed in). |
| `publish_post`   | Publishes the video currently selected in the form using a given caption. |

`publish_post` deliberately reads the file the user picked in the visible
form — the SDK message channel cannot carry a `File` object, and we want to
keep the upload entirely client-side.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which runs
`npm run build:prod` and publishes `dist/simple-tiktok-hero-app` to GitHub
Pages. Output hashing (Angular's default in the `production` configuration)
gives every deploy a fresh set of bundle filenames, so users always pick up
the latest code without manual cache clearing.

## See also

- [`SETUP_GUIDE.md`](SETUP_GUIDE.md) — TikTok developer app setup, backend
  reference implementation, and troubleshooting.
- [TikTok Content Posting API docs][TikTok Content Posting API]
- [OkDoc Iframe Plugin guide](https://github.com/okDoc-ai/hero-app-sdk-docs/blob/master/DOCS/IframePluginGuide.md)
