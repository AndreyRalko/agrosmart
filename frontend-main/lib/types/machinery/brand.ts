export interface MachineryBrand {
  id: number;
  name: string;
}

export interface MachineryBrandCreate {
  name: string;
}

export interface MachineryBrandUpdate {
  name?: string;
}

export interface MachineryBrandListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: MachineryBrand[];
}