import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss'],
})
export class NavComponent {
  @Input() isAuthenticated = false;
  @Input() currentUser: any = null;
  @Output() logout = new EventEmitter<void>();

  onLogout(): void {
    if (confirm('Are you sure you want to logout?')) {
      this.logout.emit();
    }
  }

  get displayName(): string {
    if (!this.currentUser) {
      return 'User';
    }
    return this.currentUser.displayName || this.currentUser.username || 'User';
  }
}
