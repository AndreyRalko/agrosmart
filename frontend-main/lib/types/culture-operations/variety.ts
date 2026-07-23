export interface Variety {
  id: number;
  name: string;
  op_cnt: unknown[];
  name_ru: string;
  name_kk: string;
}

export interface VarietyDetail {
  id: number;
  culture: number;
  name_ru: string;
  name_kk: string;
  options: VarietyOptions;
}

export interface NpkRemoval {
  N: number;
  P2O5: number;
  K2O: number;
}

export interface VarietyOptions {
  'npk-removal': NpkRemoval;
}

export interface VarietyCreate {
  culture: number;
  name_ru: string;
  name_kk: string;
  options: VarietyOptions;
}

export interface VarietyUpdate {
  culture?: number;
  name_ru?: string;
  name_kk?: string;
  options?: VarietyOptions;
}

export interface VarietyListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Variety[];
}