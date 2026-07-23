export interface AnimalBreed {
  id: number;
  name: string;
}

export interface AnimalBreedDetail {
  id: number;
  name_ru: string;
  name_kk: string;
}

export interface AnimalBreedCreate {
  name_ru: string;
  name_kk: string;
}

export interface AnimalBreedUpdate {
  name_ru?: string;
  name_kk?: string;
}

export interface AnimalBreedListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: AnimalBreed[];
}