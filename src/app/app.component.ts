import { Component, OnInit, ViewChild } from '@angular/core';
import { AuthService } from './services/auth.service';
import { OkDocService } from './services/okdoc.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  isAuthenticated = false;
  currentUser: any = null;

  constructor(
    private authService: AuthService,
    private okDocService: OkDocService
  ) {}

  ngOnInit() {
    this.initializeApp();
  }

  private initializeApp() {
    const savedAuth = this.authService.getStoredAuth();
    if (savedAuth) {
      this.isAuthenticated = true;
      this.currentUser = savedAuth;
    }
    this.okDocService.initializeOkDoc();
  }

  onLogin(user: any) {
    this.isAuthenticated = true;
    this.currentUser = user;
  }

  onLogout() {
    this.isAuthenticated = false;
    this.currentUser = null;
    this.authService.logout();
  }
}
