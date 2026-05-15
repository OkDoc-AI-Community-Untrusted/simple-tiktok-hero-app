import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AuthService } from './services/auth.service';
import { OkDocService } from './services/okdoc.service';
import { LoginComponent } from './components/login/login.component';
import { PostComponent } from './components/post/post.component';
import { NavComponent } from './components/nav/nav.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, LoginComponent, PostComponent, NavComponent],
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
