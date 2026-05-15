import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { AuthService, TikTokAuth } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  @Output() login = new EventEmitter<TikTokAuth>();

  isLoading = false;
  error: string | null = null;
  showApiKeySetup = false;
  clientId = '';
  backendUrl = '';

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.clientId = localStorage.getItem('tiktok_client_id') || '';
    this.backendUrl = localStorage.getItem('backend_url') || '';
    this.checkOAuthCallback();
  }

  private checkOAuthCallback(): void {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (code && state) {
      this.handleOAuthCallback(code);
    }
  }

  async handleOAuthCallback(code: string): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      const auth = await this.authService.handleOAuthCallback(code);
      this.login.emit(auth);
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error: any) {
      this.error = error.message || 'Failed to authenticate';
    } finally {
      this.isLoading = false;
    }
  }

  startLogin(): void {
    if (!this.clientId) {
      this.error = 'Please configure API keys first';
      this.showApiKeySetup = true;
      return;
    }

    this.isLoading = true;
    this.authService.startOAuthFlow();
  }

  saveApiKeys(): void {
    if (!this.clientId || !this.backendUrl) {
      this.error = 'Please fill in all required fields';
      return;
    }

    localStorage.setItem('tiktok_client_id', this.clientId);
    localStorage.setItem('backend_url', this.backendUrl);

    this.error = null;
    this.showApiKeySetup = false;
  }

  toggleApiKeySetup(): void {
    this.showApiKeySetup = !this.showApiKeySetup;
    this.error = null;
  }
}
