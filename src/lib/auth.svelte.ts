import { browser } from '$app/environment';
import { goto } from '$app/navigation';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'ADMIN' | 'EMPLOYEE';
}

class AuthState {
  user = $state<User | null>(null);
  token = $state<string | null>(null);

  constructor() {
    this.refresh();
  }

  refresh() {
    if (browser) {
      this.token = localStorage.getItem('wms_token');
      const userStr = localStorage.getItem('wms_user');
      if (userStr) {
        try {
          this.user = JSON.parse(userStr);
        } catch {
          this.user = null;
        }
      } else {
        this.user = null;
      }
    }
  }

  login(token: string, user: User) {
    this.token = token;
    this.user = user;
    if (browser) {
      localStorage.setItem('wms_token', token);
      localStorage.setItem('wms_user', JSON.stringify(user));
    }
  }

  logout() {
    this.token = null;
    this.user = null;
    if (browser) {
      localStorage.removeItem('wms_token');
      localStorage.removeItem('wms_user');
      goto('/login');
    }
  }
}

export const auth = new AuthState();
