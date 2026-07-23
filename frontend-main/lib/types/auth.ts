export interface LoginFormData {
  username: string;
  password: string;
}

export interface TokenResponse {
  access: string;
  refresh: string;
}

export interface User {
  id: string;
  username: string;
  email?: string;
}