// Поле в данных температуры (вложенное)
export interface TemperatureFieldNested {
  id: number;
  no: string; // Номер поля
}

// Запись температурных данных
export interface IntegrationTemperature {
  id: number;
  integration: number;
  field: TemperatureFieldNested;
  integration_log: number;
  time: string; // ISO datetime
  temperature_c: number;
  humidity_percent: number;
  wind_speed_m_s: number;
  pressure_hpa: number;
  precipitation_probability_percent: number;
  precipitation_intensity_mm_hr: number;
}

// Ответ списка температурных данных
export interface IntegrationTemperatureListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: IntegrationTemperature[];
}