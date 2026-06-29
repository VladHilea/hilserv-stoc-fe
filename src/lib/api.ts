import { browser } from '$app/environment';
import { goto } from '$app/navigation';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'ADMIN' | 'EMPLOYEE';
}

import { auth } from './auth.svelte';

export const getStoredToken = () => {
  return auth.token;
};

export const getStoredUser = (): User | null => {
  return auth.user;
};

export const logout = () => {
  auth.logout();
};

export const apiRequest = async (path: string, options: Omit<RequestInit, 'body'> & { body?: any } = {}) => {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Handle JSON request body
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
    if (typeof options.body === 'object') {
      options.body = JSON.stringify(options.body);
    }
  }

  const response = await fetch(`/api/v1${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    logout();
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({ message: 'API error occurred' }));
    throw new Error(errData.message || 'API request failed');
  }

  return response.json();
};
