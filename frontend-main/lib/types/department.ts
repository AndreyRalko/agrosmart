export interface Department {
  id: number;
  name_ru: string;
  name_kk: string;
}

export interface DepartmentCreate {
  name_ru: string;
  name_kk: string;
}

export interface DepartmentUpdate {
  name_ru?: string;
  name_kk?: string;
}

export interface DepartmentListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Department[];
}