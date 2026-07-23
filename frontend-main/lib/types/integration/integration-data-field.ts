// Данные от Open-Meteo (integration 7)
export interface WeatherData {
  temperature_c: number | null;
  humidity_percent: number | null;
  wind_speed_m_s: number | null;
  pressure_hpa: number | null;
  precipitation_probability_percent: number | null;
  precipitation_intensity_mm_hr: number | null;
}

// Данные от StormGlass (integration 8)
export interface SoilData {
  soilTemperature: number | null;
  soilMoisture: number | null;
  soilTemperature10cm: number | null;
  soilTemperature40cm: number | null;
  soilTemperature100cm: number | null;
  soilMoisture10cm: number | null;
  soilMoisture40cm: number | null;
  soilMoisture100cm: number | null;
  ph: number | null;
  salinity: number | null;
  oxygen: number | null;
  [key: string]: number | null | undefined;
}

export interface IntegrationDataField {
  id: number;
  integration: number;
  field: {
    id: number;
    no: string;
  };
  integration_log: number;
  time: string;
  data: WeatherData | SoilData | Record<string, number | null>;
}

export interface IntegrationDataFieldListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: IntegrationDataField[];
}