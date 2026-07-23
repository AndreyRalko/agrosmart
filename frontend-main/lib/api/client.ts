/* eslint-disable @typescript-eslint/no-explicit-any */
import { getAccessToken, refreshToken, logout } from './auth';
import { buildApiUrl } from './api-url';

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { skipAuth = false, ...fetchOptions } = options;
  
  // Prepare headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept-Language': getLanguage(),
    ...fetchOptions.headers,
  };

  // Add Authorization header if not skipped
  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
  }

  try {
    let response = await fetch(buildApiUrl(endpoint), {
      ...fetchOptions,
      headers,
    });

    // Handle 401 - try refresh token
    if (response.status === 401 && !skipAuth) {
      try {
        await refreshToken();
        const newToken = getAccessToken();
        if (newToken) {
          (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
        }
        
        response = await fetch(buildApiUrl(endpoint), {
          ...fetchOptions,
          headers,
        });
      } catch (error) {
        logout();
        throw new Error('Session expired');
      }
    }

    if (!response.ok) {
      let errorMessage = `Request failed: ${response.status}`;
      
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          console.error('Backend error details:', errorData);
          
          // Обработка разных форматов ошибок от бэкенда
          if (typeof errorData === 'object') {
            if (errorData.message) {
              errorMessage = errorData.message;
            } else if (errorData.detail) {
              errorMessage = errorData.detail;
            } else {
              const lines: string[] = [];
              for (const [key, value] of Object.entries(errorData)) {
                if (Array.isArray(value)) {
                  value.forEach((v: any) => {
                    lines.push(typeof v === 'object' && v.detail ? `${key}: ${v.detail}` : `${key}: ${v}`);
                  });
                } else if (typeof value === 'object' && value !== null) {
                  for (const [subKey, subValue] of Object.entries(value as object)) {
                    if (Array.isArray(subValue)) {
                      subValue.forEach((v: any) => {
                        lines.push(typeof v === 'object' && v.detail ? `${subKey}: ${v.detail}` : `${subKey}: ${v}`);
                      });
                    }
                  }
              } else {
                lines.push(`${key}: ${value}`);
              }
            }
            if (lines.length) errorMessage = lines.join('\n');
          }
        }
        } else {
          const text = await response.text();
          console.error('Backend error (non-JSON):', text);
          if (text) errorMessage = text;
        }
      } catch (parseError) {
        console.error('Failed to parse error response:', parseError);
      }
      
      throw new Error(errorMessage);
    }

    // Проверяем статус 204 (No Content) для DELETE запросов
    if (response.status === 204) {
      return undefined as T;
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Convenience methods
export const api = {
  get: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiClient<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, data?: any, options?: RequestOptions) =>
    apiClient<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    }),

  put: <T = any>(endpoint: string, data?: any, options?: RequestOptions) =>
    apiClient<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  patch: <T = any>(endpoint: string, data?: any, options?: RequestOptions) =>
    apiClient<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiClient<T>(endpoint, { ...options, method: 'DELETE' }),
};

// Export for language management
export function setLanguage(lang: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('language', lang);
  }
}

export function getLanguage(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('language') || 'ru';
  }
  return 'ru';
}
