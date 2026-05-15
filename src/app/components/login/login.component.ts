import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { ConfigService } from '../../services/config.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
})
export class LoginComponent {
  @Output() configured = new EventEmitter<void>();

  clientKey = this.config.clientKey;
  backendUrl = this.config.backendUrl;
  showConfig = !this.config.isConfigured;

  loading = false;
  error: string | null = null;

  constructor(private auth: AuthService, private config: ConfigService) {}

  get isConfigured(): boolean {
    return this.config.isConfigured;
  }

  saveConfig(): void {
    const key = this.clientKey.trim();
    const url = this.backendUrl.trim();
    if (!key || !url) {
      this.error = 'Both fields are required.';
      return;
    }
    try {
      new URL(url);
    } catch {
      this.error = 'Backend URL must be a valid http(s) URL.';
      return;
    }
    this.config.save(key, url);
    this.error = null;
    this.showConfig = false;
    this.configured.emit();
  }

  async loginWithTikTok(): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      await this.auth.startOAuthFlow();
      // Success — AuthStateService will push the new auth, AppComponent re-renders.
    } catch (e: any) {
      this.error = e?.message || 'Login failed.';
    } finally {
      this.loading = false;
    }
  }

  toggleConfig(): void {
    this.showConfig = !this.showConfig;
    this.error = null;
  }
}
