import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface TikTokAuth {
  accessToken: string;
  openId: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  tokenExpiry?: number;
  refreshToken?: string;
}

const AUTH_KEY = 'tiktok_auth';

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private subject = new BehaviorSubject<TikTokAuth | null>(this.loadFromStorage());
  readonly auth$ = this.subject.asObservable();

  get current(): TikTokAuth | null {
    return this.subject.value;
  }

  setAuth(auth: TikTokAuth): void {
    localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
    this.subject.next(auth);
  }

  clear(): void {
    localStorage.removeItem(AUTH_KEY);
    this.subject.next(null);
  }

  private loadFromStorage(): TikTokAuth | null {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    try {
      const auth = JSON.parse(raw) as TikTokAuth;
      if (auth.tokenExpiry && auth.tokenExpiry < Date.now()) {
        localStorage.removeItem(AUTH_KEY);
        return null;
      }
      return auth;
    } catch {
      localStorage.removeItem(AUTH_KEY);
      return null;
    }
  }
}
