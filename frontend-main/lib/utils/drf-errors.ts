import { ApiError } from '@/lib/api/client';

export interface DrfErrors {
  /** Общее сообщение: detail / error / non_field_errors или текст исключения. */
  message: string;
  /** Ошибки по полям формы: имя поля → текст. */
  fields: Record<string, string>;
}

const GENERAL_KEYS = ['detail', 'error', 'non_field_errors', 'message'];

function toText(value: unknown): string {
  if (Array.isArray(value)) return value.map(toText).join(' ');
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${toText(v)}`)
      .join('; ');
  }
  return value == null ? '' : String(value);
}

/**
 * Разбирает ошибку DRF на общее сообщение и ошибки полей.
 * Поля, которых нет в knownFields, уходят в общее сообщение, чтобы не потеряться.
 */
export function parseDrfError(err: unknown, knownFields: string[] = [], fallback = 'Произошла ошибка'): DrfErrors {
  const fields: Record<string, string> = {};
  const general: string[] = [];

  if (err instanceof ApiError && err.body && typeof err.body === 'object' && !Array.isArray(err.body)) {
    for (const [key, value] of Object.entries(err.body as Record<string, unknown>)) {
      const text = toText(value);
      if (!text) continue;
      if (knownFields.includes(key)) {
        fields[key] = text;
      } else if (GENERAL_KEYS.includes(key)) {
        general.push(text);
      } else {
        general.push(`${key}: ${text}`);
      }
    }
    if (err.status === 404 && general.length === 0 && Object.keys(fields).length === 0) {
      general.push('Не найдено');
    }
  } else if (err instanceof Error) {
    general.push(err.message);
  }

  const message = general.join('\n') || (Object.keys(fields).length ? '' : fallback);
  return { message, fields };
}
