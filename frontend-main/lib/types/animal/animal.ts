export interface AnimalBreed {
  id: number;
  name: string;
}

export interface Animal {
  id: number;
  breed: AnimalBreed;
  birthday: string;
  tag: string;
  daily_yield_litre: number;
}

export interface AnimalCreate {
  breed_id: number;
  birthday: string;
  tag: string;
  daily_yield_litre: number;
}

export interface AnimalUpdate {
  breed_id?: number;
  birthday?: string;
  tag?: string;
  daily_yield_litre?: number;
}

export interface AnimalListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Animal[];
}