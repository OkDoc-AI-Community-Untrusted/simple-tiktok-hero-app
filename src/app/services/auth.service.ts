import { Injectable } from '@angular/core';

export interface TikTokAuth {
  accessToken: string;
  userId: string;
  username: string;
  displayName: string;
  profileImageUrl?: string;
  tokenExpiry?: number;
  refreshToken?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly AUTH_STORAGE_KEY = 'tiktok_auth';
  private readonly TOKEN_EXPIRY_KEY = 'tiktok_token_expiry';

  constructor() {}

  saveAuth(auth: TikTokAuth): void {
    localStorage.setItem(this.AUTH_STORAGE_KEY, JSON.stringify(auth));
    if (auth.tokenExpiry) {
      localStorage.setItem(
        this.TOKEN_EXPIRY_KEY,
        auth.tokenExpiry.toString()
      );
    }
  }

  getStoredAuth(): TikTokAuth | null {
    const stored = localStorage.getItem(this.AUTH_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const auth: TikTokAuth = JSON.parse(stored);
    const expiry = localStorage.getItem(this.TOKEN_EXPIRY_KEY);

    if (expiry && parseInt(expiry) < Date.now()) {
      this.logout();
      return null;
    }

    return auth;
  }

  isAuthenticated(): boolean {
    return this.getStoredAuth() !== null;
  }

  logout(): void {
    localStorage.removeItem(this.AUTH_STORAGE_KEY);
    localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
  }

  getAccessToken(): string | null {
    const auth = this.getStoredAuth();
    return auth?.accessToken || null;
  }

  handleOAuthCallback(code: string): Promise<TikTokAuth> {
    return new Promise(async (resolve, reject) => {
      try {
        const backendUrl = localStorage.getItem('backend_url') || '';
        const response = await fetch(`${backendUrl}/api/auth/tiktok/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          reject(new Error('Failed to authenticate with TikTok'));
          return;
        }

        const data = await response.json();
        const auth: TikTokAuth = {
          accessToken: data.access_token,
          userId: data.open_id,
          username: data.username,
          displayName: data.display_name,
          profileImageUrl: data.avatar_url,
          tokenExpiry: data.expires_in
            ? Date.now() + data.expires_in * 1000
            : undefined,
          refreshToken: data.refresh_token,
        };

        this.saveAuth(auth);
        resolve(auth);
      } catch (error) {
        reject(error);
      }
    });
  }

  startOAuthFlow(): void {
    const clientId = localStorage.getItem('tiktok_client_id') || '';
    const redirectUri = encodeURIComponent(window.location.origin);
    const scope = 'user.info.basic,video.create';
    const responseType = 'code';

    const authUrl = `https://www.tiktok.com/v1/oauth/authorize/?client_key=${clientId}&response_type=${responseType}&scope=${scope}&redirect_uri=${redirectUri}&state=${Math.random()
      .toString(36)
      .substring(7)}`;

    window.location.href = authUrl;
  }
}
