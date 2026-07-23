import Cookies from 'js-cookie';
import type { TokenResponse } from '@/lib/types/auth';
import { buildApiUrl } from './api-url';

export async function login(username: string, password: string): Promise<TokenResponse> {
  const response = await fetch(buildApiUrl('token'), {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Accept-Language': 'ru',
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Login failed' }));
    throw new Error(error.message || 'Login failed');
  }

  const data: TokenResponse = await response.json();
  
  if (data.access) {
    localStorage.setItem('access_token', data.access);
    Cookies.set('access_token', data.access, { expires: 1 }); // 1 день
  }
  if (data.refresh) {
    localStorage.setItem('refresh_token', data.refresh);
    Cookies.set('refresh_token', data.refresh, { expires: 7 }); // 7 дней
  }

  return data;
}

export async function refreshToken(): Promise<TokenResponse> {
  const refresh = localStorage.getItem('refresh_token');
  
  if (!refresh) {
    throw new Error('No refresh token');
  }

  const response = await fetch(buildApiUrl('token/refresh'), {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Accept-Language': 'ru',
    },
    body: JSON.stringify({ refresh }),
  });

  if (!response.ok) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    throw new Error('Refresh failed');
  }

  const data = await response.json();
  
  if (data.access) {
    localStorage.setItem('access_token', data.access);
    Cookies.set('access_token', data.access, { expires: 1 });
  }
  if (data.refresh) {
    localStorage.setItem('refresh_token', data.refresh);
    Cookies.set('refresh_token', data.refresh, { expires: 7 });
  }

  return data;
}

export function getAccessToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('access_token');
  }
  return null;
}

export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    window.location.href = '/login';
  }
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}