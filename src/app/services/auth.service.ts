import { Injectable } from '@angular/core';
import { AuthStateService, TikTokAuth } from './auth-state.service';
import { ConfigService } from './config.service';

const OAUTH_AUTHORIZE_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const OAUTH_SCOPES = 'user.info.basic,video.publish,video.upload';
const POPUP_FEATURES = 'width=600,height=750,left=200,top=100,resizable=yes,scrollbars=yes';

interface BackendTokenResponse {
  access_token: string;
  open_id: string;
  expires_in?: number;
  refresh_token?: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(
    private state: AuthStateService,
    private config: ConfigService
  ) {}

  isAuthenticated(): boolean {
    return this.state.current !== null;
  }

  getAccessToken(): string | null {
    return this.state.current?.accessToken ?? null;
  }

  logout(): void {
    this.state.clear();
  }

  /**
   * Opens TikTok OAuth in a popup window. The popup will redirect back to
   * our app, which detects it's running in a popup and posts the auth code
   * back to this window. Required because the app runs inside an iframe in
   * OkDoc — a full-page redirect would navigate the iframe away.
   */
  async startOAuthFlow(): Promise<TikTokAuth> {
    if (!this.config.isConfigured) {
      throw new Error('Configure your TikTok client key and backend URL first.');
    }

    const state = this.randomState();
    sessionStorage.setItem('oauth_state', state);

    const authUrl = this.buildAuthorizeUrl(state);
    const popup = window.open(authUrl, 'tiktok_auth', POPUP_FEATURES);

    if (!popup) {
      throw new Error('Popup was blocked. Allow popups for this site and try again.');
    }

    const code = await this.waitForCallback(popup, state);
    return this.exchangeCode(code);
  }

  private buildAuthorizeUrl(state: string): string {
    const params = new URLSearchParams({
      client_key: this.config.clientKey,
      response_type: 'code',
      scope: OAUTH_SCOPES,
      redirect_uri: this.config.redirectUri,
      state,
    });
    return `${OAUTH_AUTHORIZE_URL}?${params.toString()}`;
  }

  private waitForCallback(popup: Window, expectedState: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        window.removeEventListener('message', onMessage);
        clearInterval(pollClosed);
      };

      const onMessage = (event: MessageEvent) => {
        const data = event.data;
        if (!data || data.type !== 'tiktok_oauth_callback') return;
        cleanup();
        try {
          popup.close();
        } catch {
          // popup may already be closed
        }
        if (data.error) {
          reject(new Error(data.error_description || data.error));
        } else if (data.state !== expectedState) {
          reject(new Error('OAuth state mismatch — possible CSRF attempt.'));
        } else if (!data.code) {
          reject(new Error('No authorization code returned.'));
        } else {
          resolve(data.code);
        }
      };

      const pollClosed = setInterval(() => {
        if (popup.closed) {
          cleanup();
          reject(new Error('Login window was closed before completion.'));
        }
      }, 500);

      window.addEventListener('message', onMessage);
    });
  }

  private async exchangeCode(code: string): Promise<TikTokAuth> {
    const response = await fetch(`${this.config.backendUrl}/api/auth/tiktok/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirect_uri: this.config.redirectUri }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Token exchange failed: ${response.status} ${detail}`);
    }

    const data = (await response.json()) as BackendTokenResponse;

    const auth: TikTokAuth = {
      accessToken: data.access_token,
      openId: data.open_id,
      username: data.username,
      displayName: data.display_name,
      avatarUrl: data.avatar_url,
      refreshToken: data.refresh_token,
      tokenExpiry: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
    };

    this.state.setAuth(auth);
    return auth;
  }

  private randomState(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
}
