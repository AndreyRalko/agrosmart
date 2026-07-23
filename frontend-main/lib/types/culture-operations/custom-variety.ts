export interface VarietyCustomOperation {
  id: number;
  name: string;
  name_ru: string;
  name_kk: string;
}

export interface VarietyCustom {
  id: number;
  name: string;
  operations: VarietyCustomOperation[];
  name_ru: string;
  name_kk: string;
}

export interface VarietyCustomListResponse {
  results: VarietyCustom[];
}
