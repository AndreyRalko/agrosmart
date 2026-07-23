import { api } from '../client';
import { getAccessToken } from '../auth';
import { buildApiUrl } from '../api-url';
import type {
  Task,
  TaskCreate,
  TaskUpdate,
  TaskListResponse,
  TaskConditionErrorResponse,
} from '@/lib/types/tasks/task';

export class TaskConditionException extends Error {
  constructor(public readonly data: TaskConditionErrorResponse) {
    super('check_condition__error');
    this.name = 'TaskConditionException';
  }
}

export async function getTasks(): Promise<TaskListResponse> {
  return api.get<TaskListResponse>('/task/');
}

export async function getTask(id: number): Promise<Task> {
  return api.get<Task>(`/task/${id}/`);
}

/**
 * Создать задание.
 * При condition ошибках (400 + {errors: [...]}) бросает TaskConditionException.
 * Передайте is_force: true чтобы проигнорировать условия.
 */
export async function createTask(data: TaskCreate): Promise<Task> {
  const token = getAccessToken();

  const response = await fetch(buildApiUrl('task'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': 'ru',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });

  const json = await response.json();

  if (!response.ok) {
    // condition ошибки — 400 с { errors: [...] }
    if (json?.errors && Array.isArray(json.errors)) {
      throw new TaskConditionException(json as TaskConditionErrorResponse);
    }
    throw new Error(json?.detail || json?.message || `Request failed: ${response.status}`);
  }

  return json as Task;
}

export async function updateTask(id: number, data: TaskUpdate): Promise<Task> {
  return api.patch<Task>(`/task/${id}/`, data);
}

export async function deleteTask(id: number): Promise<void> {
  return api.delete<void>(`/task/${id}/`);
}