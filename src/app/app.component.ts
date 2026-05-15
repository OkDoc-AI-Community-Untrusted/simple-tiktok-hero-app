import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AuthStateService, TikTokAuth } from './services/auth-state.service';
import { OkDocService } from './services/okdoc.service';
import { ConfigService } from './services/config.service';
import { LoginComponent } from './components/login/login.component';
import { PostComponent } from './components/post/post.component';
import { NavComponent } from './components/nav/nav.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, LoginComponent, PostComponent, NavComponent],
})
export class AppComponent implements OnInit {
  auth: TikTokAuth | null = null;
  configured = false;

  constructor(
    private authState: AuthStateService,
    private config: ConfigService,
    private okdoc: OkDocService
  ) {}

  ngOnInit(): void {
    this.configured = this.config.isConfigured;
    this.authState.auth$.subscribe((auth) => (this.auth = auth));
    this.okdoc.init();
  }

  onConfigured(): void {
    this.configured = true;
  }
}
