export interface MachineryBrand {
  id: number;
  name: string;
}

export interface MachineryType {
  id: number;
  name: string;
}

export interface Machinery {
  id: number;
  brand: MachineryBrand;
  type: MachineryType;
  year_production: number;
  gov_num: string;
}

export interface MachineryCreate {
  brand_id: number;
  type_id: number;
  year_production: number;
  gov_num: string;
}

export interface MachineryUpdate {
  brand_id?: number;
  type_id?: number;
  year_production?: number;
  gov_num?: string;
}

export interface MachineryListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Machinery[];
}