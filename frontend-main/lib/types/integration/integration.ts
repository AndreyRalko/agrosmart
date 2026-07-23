export interface IntegrationFieldOption {
  id: number;
  name: string;
  field_name: string;
  name_ru?: string;
  name_kk?: string;
}

export interface Integration {
  id: number;
  name: string; // Локализованное имя из API
  icon: string | null;
  api: string | null;
  every_minute?: number;
  name_ru?: string; // Может быть в ответе
  name_kk?: string; // Может быть в ответе
  fields?: IntegrationFieldOption[];
}

export interface IntegrationDetail {
  id: number;
  icon: string | null;
  name_ru: string;
  name_kk: string;
  api: string | null;
  every_minute: number;
  headers_hard: Record<string, string> | null;
  body_hard: Record<string, unknown> | null;
  params_hard: Record<string, unknown> | null;
  type: number;
}

export interface IntegrationCreate {
  name_ru: string;
  name_kk: string;
  icon?: string;
  type?: number;
  api?: string;
  every_minute?: number;
  headers_hard?: Record<string, string> | null;
  body_hard?: Record<string, unknown> | null;
  params_hard?: Record<string, unknown> | null;
}

export interface IntegrationUpdate {
  name_ru?: string;
  name_kk?: string;
  icon?: string;
  api?: string;
  every_minute?: number;
  headers_hard?: Record<string, string> | null;
  body_hard?: Record<string, unknown> | null;
  params_hard?: Record<string, unknown> | null;
}

export interface IntegrationListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Integration[];
}