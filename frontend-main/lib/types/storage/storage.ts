// Типы раздела «Хранение кормов».
// Источник правды — backend/storage/models.py и backend/storage/serializers.py.
//
// DecimalField DRF отдаёт строками ("12.50"), поэтому здесь они string.
// Исключение — /stats/: там агрегаты собираются в APIView и кодируются как числа.

export type FeedType = 'hay' | 'silage' | 'grain' | 'other';
export type StorageUnit = 't' | 'kg' | 'm3';
/** Вычисляется на бэке: warning, если t > 25 °C или влажность > 80 %. */
export type StorageStatus = 'normal' | 'warning';

// ---- Устройства (SensorDeviceSerializer) ----

export interface SensorDevice {
  id: number;
  storage: number;
  name: string;
  /** Уникален во всей системе, не только в пределах объекта. */
  device_id: string;
  is_active: boolean;
  created_at: string;
  last_seen: string | null;
}

export interface SensorDeviceCreate {
  /** Сериализатор требует storage в теле, хотя он есть и в URL. */
  storage: number;
  name: string;
  device_id: string;
  is_active?: boolean;
}

export type SensorDeviceUpdate = Partial<Omit<SensorDeviceCreate, 'storage'>>;

// ---- Показания (StorageSensorSerializer) ----

export interface StorageSensor {
  id: number;
  temperature: string | null;
  humidity: string | null;
  status: StorageStatus;
  device: SensorDevice | null;
  created_at: string;
}

/**
 * Тело POST /sensors/. Бэк принимает один из двух форматов:
 * прямой {temperature?, humidity?} или от устройства {name, type, value}.
 * Не переданное значение бэк записывает как 0.
 */
export type StorageSensorCreate =
  | { temperature?: string; humidity?: string }
  | { name: string; type: 'temperature' | 'humidity'; value: string };

// ---- Объект хранения (StorageObjectSerializer / StorageObjectWriteSerializer) ----

export interface StorageObject {
  id: number;
  name: string;
  location: string;
  feed_type: FeedType;
  /** Свободный текст (CharField), не ссылка на /culture/. */
  culture: string;
  unit: StorageUnit;
  current_amount: string;
  max_capacity: string;
  notes: string;
  status: StorageStatus;
  latest_sensor: StorageSensor | null;
  created_at: string;
}

export interface StorageObjectWrite {
  name: string;
  location: string;
  feed_type: FeedType;
  culture?: string;
  unit?: StorageUnit;
  current_amount?: string;
  max_capacity: string;
  notes?: string;
}

export interface StorageStats {
  total_objects: number;
  total_current_amount: number;
  total_capacity: number;
  deviations: number;
}

// ---- Химия корма (FeedChemistrySerializer) ----

export const CHEMISTRY_NUMERIC_FIELDS = [
  'dry_matter', 'protein', 'fat', 'fiber', 'ash', 'starch', 'sugar', 'energy',
] as const;
export type ChemistryNumericField = typeof CHEMISTRY_NUMERIC_FIELDS[number];

export type FeedChemistry = {
  id: number;
  sample_name: string;
  notes: string;
  created_at: string;
} & Record<ChemistryNumericField, string | null>;

export type FeedChemistryCreate = {
  sample_name?: string;
  notes?: string;
} & Partial<Record<ChemistryNumericField, string | null>>;

/**
 * Ячейка импорта, которую не удалось привести к числу. Строка при этом
 * всё равно сохраняется, в ячейку пишется NULL.
 */
export interface ChemistryImportError {
  row: number;
  field: string;
  value: unknown;
  error: string;
}

export interface ChemistryImportResult {
  imported: number;
  errors: ChemistryImportError[];
}
