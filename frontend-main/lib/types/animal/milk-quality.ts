export interface MilkQualityAnimalBreed {
  id: number;
  name: string;
}

export interface MilkQualityAnimal {
  id: number;
  breed: MilkQualityAnimalBreed;
  birthday: string;
  tag: string;
  daily_yield_litre: number;
}

export interface MilkQualityPerson {
  id: number;
  lastname: string;
  firstname: string;
  patronymic: string | null;
}

export interface MilkQuality {
  id: number;
  animal: MilkQualityAnimal;
  person_created: MilkQualityPerson;
  person_updated: MilkQualityPerson | null;
  report_date: string;
  fat_percent: number;
  protein_percent: number;
  created_at: string;
  updated_at: string;
}

export interface MilkQualityCreate {
  animal_id: number;
  fat_percent: number;
  protein_percent: number;
  report_date: string;
}

export interface MilkQualityUpdate {
  animal_id?: number;
  fat_percent?: number;
  protein_percent?: number;
  report_date?: string;
}

export interface MilkQualityListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: MilkQuality[];
}