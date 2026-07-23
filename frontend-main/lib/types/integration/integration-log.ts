// Статусы логов интеграции
export type IntegrationLogStatus = -1 | 0 | 1; // -1 = Failed, 0 = Pending, 1 = Success

// Типы ошибок
export type ErrorType = 'api_http' | 'validation' | 'network' | 'timeout' | 'unknown';

// Структура ошибки
export interface IntegrationLogError {
  stage: string;
  field_id?: number;
  location?: string;
  response_text_snippet?: string;
  [key: string]: any; // Дополнительные поля ошибок
}

// Лог интеграции из списка
export interface IntegrationLog {
  id: number;
  integration: number;
  status: IntegrationLogStatus;
  status_display: string; // "Failed" | "Pending" | "Success"
  error_type: ErrorType | null;
  http_status: number | null;
  error: IntegrationLogError | null;
  result: any | null;
  created_at: string; // ISO datetime
}

// Ответ списка логов
export interface IntegrationLogListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: IntegrationLog[];
}