// Разрешенные операторы для условий
// ВАЖНО: Нельзя использовать противоречивые комбинации!
// Примеры валидных комбинаций:
// - eq (только само по себе)
// - ne (только само по себе)  
// - gt, gte, lt, lte (можно комбинировать для диапазонов, например gte + lt)
// Примеры НЕвалидных комбинаций:
// - eq + любой другой оператор
// - ne + любой другой оператор
// - gt + gte (противоречие)
// - lt + lte (противоречие)
export type ConditionOperator = "eq" | "ne" | "gt" | "gte" | "lt" | "lte";

// Значения условий - динамический объект с операторами
export interface ConditionValues {
  eq?: number;
  ne?: number;
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
}

// Condition из списка
export interface Condition {
  id: number;
  // type убран - теперь type находится в Field
  field: number;
  values: ConditionValues;
  culture_variety: number;
}

// Condition детальный (такой же как из списка)
export interface ConditionDetail {
  id: number;
  field: number;
  values: ConditionValues;
  culture_variety: number;
}

// Создание Condition
export interface ConditionCreate {
  // type убран - теперь type задается в Field
  field: number;
  values: ConditionValues;
  culture_variety: number;
}

// Обновление Condition (partial update)
export interface ConditionUpdate {
  field?: number;
  values?: ConditionValues;
  culture_variety?: number;
}

// Ответ списка Condition
export interface ConditionListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Condition[];
}