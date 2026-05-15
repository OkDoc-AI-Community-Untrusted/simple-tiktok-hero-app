import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { TikTokAuth } from '../../services/auth-state.service';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class NavComponent {
  @Input() auth!: TikTokAuth;

  constructor(private authService: AuthService) {}

  get displayName(): string {
    return this.auth.displayName || this.auth.username || this.auth.openId;
  }

  logout(): void {
    if (confirm('Log out of TikTok?')) {
      this.authService.logout();
    }
  }
}
