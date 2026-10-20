import { api, apiClient } from '../client';
import type {
  ChemistryImportResult,
  ChemistryNumericField,
  FeedChemistry,
  FeedChemistryCreate,
  FeedType,
  SensorDevice,
  SensorDeviceCreate,
  SensorDeviceUpdate,
  StorageObject,
  StorageObjectWrite,
  StorageSensor,
  StorageSensorCreate,
  StorageStats,
  StorageStatus,
  StorageUnit,
} from '@/lib/types/storage/storage';

// Пути сверены с backend/storage/urls.py. Все списки — массивы без пагинации.
const BASE = '/api/storage';

// ---- Лейблы (choices из backend/storage/models.py) ----

export const FEED_TYPE_LABELS: Record<FeedType, string> = {
  hay: 'Сено',
  silage: 'Силос',
  grain: 'Зерно',
  other: 'Другое',
};

export const UNIT_LABELS: Record<StorageUnit, string> = {
  t: 'т',
  kg: 'кг',
  m3: 'м³',
};

export const STATUS_LABELS: Record<StorageStatus, string> = {
  normal: 'Норма',
  warning: 'Отклонение',
};

export const CHEMISTRY_FIELD_LABELS: Record<ChemistryNumericField, { label: string; unit: string }> = {
  dry_matter: { label: 'Сухое вещество', unit: '%' },
  protein: { label: 'Протеин', unit: '%' },
  fat: { label: 'Жир', unit: '%' },
  fiber: { label: 'Клетчатка', unit: '%' },
  ash: { label: 'Зола', unit: '%' },
  starch: { label: 'Крахмал', unit: '%' },
  sugar: { label: 'Сахар', unit: '%' },
  energy: { label: 'ОЭ', unit: 'МДж' },
};

// Имя, под которым бэк отдаёт шаблон (Content-Disposition).
export const CHEMISTRY_TEMPLATE_FILENAME = 'feed_chemistry_template.xlsx';

// ---- Объекты хранения ----

export function getStorageObjects(): Promise<StorageObject[]> {
  return api.get<StorageObject[]>(`${BASE}/`);
}

export function getStorageObject(id: number): Promise<StorageObject> {
  return api.get<StorageObject>(`${BASE}/${id}/`);
}

export function createStorageObject(data: StorageObjectWrite): Promise<StorageObject> {
  return api.post<StorageObject>(`${BASE}/`, data);
}

export function updateStorageObject(id: number, data: Partial<StorageObjectWrite>): Promise<StorageObject> {
  return api.patch<StorageObject>(`${BASE}/${id}/`, data);
}

export function deleteStorageObject(id: number): Promise<void> {
  return api.delete<void>(`${BASE}/${id}/`);
}

export function getStorageStats(): Promise<StorageStats> {
  return api.get<StorageStats>(`${BASE}/stats/`);
}

// ---- Показания датчиков ----

export function getStorageSensors(storageId: number): Promise<StorageSensor[]> {
  return api.get<StorageSensor[]>(`${BASE}/${storageId}/sensors/`);
}

export function addStorageSensor(storageId: number, data: StorageSensorCreate): Promise<StorageSensor> {
  return api.post<StorageSensor>(`${BASE}/${storageId}/sensors/`, data);
}

// ---- Устройства ----

export function getSensorDevices(storageId: number): Promise<SensorDevice[]> {
  return api.get<SensorDevice[]>(`${BASE}/${storageId}/devices/`);
}

export function createSensorDevice(storageId: number, data: SensorDeviceCreate): Promise<SensorDevice> {
  return api.post<SensorDevice>(`${BASE}/${storageId}/devices/`, data);
}

export function updateSensorDevice(
  storageId: number,
  deviceId: number,
  data: SensorDeviceUpdate,
): Promise<SensorDevice> {
  return api.patch<SensorDevice>(`${BASE}/${storageId}/devices/${deviceId}/`, data);
}

export function deleteSensorDevice(storageId: number, deviceId: number): Promise<void> {
  return api.delete<void>(`${BASE}/${storageId}/devices/${deviceId}/`);
}

// ---- Химия корма ----

export function getStorageChemistry(storageId: number): Promise<FeedChemistry[]> {
  return api.get<FeedChemistry[]>(`${BASE}/${storageId}/chemistry/`);
}

export function addStorageChemistry(storageId: number, data: FeedChemistryCreate): Promise<FeedChemistry> {
  return api.post<FeedChemistry>(`${BASE}/${storageId}/chemistry/`, data);
}

/**
 * Импорт анализов из xlsx. multipart/form-data, имя поля — `file`.
 * Content-Type для FormData apiClient не выставляет: boundary подставит браузер.
 */
export function importStorageChemistry(storageId: number, file: File): Promise<ChemistryImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient<ChemistryImportResult>(`${BASE}/${storageId}/chemistry/import/`, {
    method: 'POST',
    body: formData,
  });
}

/**
 * Скачивание xlsx-шаблона. Эндпоинт под JWT, поэтому обычная ссылка не
 * подходит: забираем blob через apiClient и отдаём браузеру.
 */
export async function downloadChemistryTemplate(): Promise<void> {
  const blob = await apiClient<Blob>(`${BASE}/chemistry/template/`, {
    method: 'GET',
    responseType: 'blob',
  });

  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = CHEMISTRY_TEMPLATE_FILENAME;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    // Отзываем в следующем тике: синхронный revoke прерывает скачивание в части браузеров.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
