import { Injectable } from '@angular/core';

const CLIENT_KEY = 'tiktok_client_key';
const BACKEND_KEY = 'tiktok_backend_url';

@Injectable({ providedIn: 'root' })
export class ConfigService {
  get clientKey(): string {
    return localStorage.getItem(CLIENT_KEY) || '';
  }

  get backendUrl(): string {
    return (localStorage.getItem(BACKEND_KEY) || '').replace(/\/+$/, '');
  }

  get isConfigured(): boolean {
    return !!this.clientKey && !!this.backendUrl;
  }

  save(clientKey: string, backendUrl: string): void {
    localStorage.setItem(CLIENT_KEY, clientKey.trim());
    localStorage.setItem(BACKEND_KEY, backendUrl.trim().replace(/\/+$/, ''));
  }

  get redirectUri(): string {
    return window.location.origin + window.location.pathname;
  }
}
