// Variety как вложенный объект
export interface Variety {
  id: number;
  name: string;
}

// Culture из списка
export interface Culture {
  id: number;
  name: string; // Локализованное имя
  varieties: Variety[];
  name_ru: string;
  name_kk: string;
}

// Culture детальный
export interface CultureDetail {
  id: number;
  name_ru: string;
  name_kk: string;
}

// Создание Culture
export interface CultureCreate {
  name_ru: string;
  name_kk: string;
}

// Обновление Culture
export interface CultureUpdate {
  name_ru?: string;
  name_kk?: string;
}

// Ответ списка Culture
export interface CultureListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Culture[];
}