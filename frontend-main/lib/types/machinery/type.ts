export interface MachineryType {
  id: number;
  name: string; // Динамическое поле от Accept-Language (приходит в GET list)
}

// Полный интерфейс для Create/Update ответов
export interface MachineryTypeDetail {
  id: number;
  name_ru: string;
  name_kk: string;
}

export interface MachineryTypeCreate {
  name_ru: string;
  name_kk: string;
}

export interface MachineryTypeUpdate {
  name_ru?: string;
  name_kk?: string;
}

export interface MachineryTypeListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: MachineryType[];
}