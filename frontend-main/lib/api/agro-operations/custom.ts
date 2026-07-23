import { apiClient } from '../client';

// Условие для конкретного поля
export interface FieldCondition {
  field: number; // ID поля
  values: {
    eq?: number;
    ne?: number;
    gt?: number;
    gte?: number;
    lt?: number;
    lte?: number;
  };
}

// Запрос на установку условий для сорта + операция
export interface SetConditionsRequest {
  culture_variety: number; // ID сорта
  operation: number; // ID операции
  conditions: FieldCondition[];
}

// Успешный ответ
export interface SetConditionsSuccess {
  msg: string; // "ok"
}

// Ошибки валидации условий
export interface ConditionValidationError {
  values?: {
    non_field_errors?: string[];
    values?: string[];
    [key: string]: string[] | undefined;
  };
}

export interface SetConditionsError {
  conditions?: ConditionValidationError[];
  detail?: {
    conditions?: {
      msg: string;
      unknown_fields_id: number[];
    };
  };
}

// Условие поля из operation-custom/by-culture-variety
export interface VarietyFieldCondition {
  id: number;
  values: {
    eq?: number;
    ne?: number;
    gt?: number;
    gte?: number;
    lt?: number;
    lte?: number;
  };
}

// Поле операции из operation-custom/by-culture-variety
export interface VarietyOperationField {
  id: number;
  name: string;
  type: number; // 0 или 1
  required: boolean;
  integration: {
    id: number;
    name: string;
    icon: string | null;
    name_kk: string;
    name_ru: string;
  } | null;
  integration_field?: {
    id: number;
    name: string;
    field_name: string;
    name_kk: string;
    name_ru: string;
  } | null;
  conditions: VarietyFieldCondition[];
  name_kk: string;
  name_ru: string;
}

// Операция из operation-custom/by-culture-variety
export interface VarietyOperation {
  id: number;
  name: string;
  fields: VarietyOperationField[];
  name_kk: string;
  name_ru: string;
}

export interface VarietyOperationsResponse {
  results: VarietyOperation[];
}

// Получить операции сорта с полями и условиями
export async function getByCultureVariety(varietyId: number): Promise<VarietyOperationsResponse> {
  return await apiClient<VarietyOperationsResponse>(
    `/agro-op/operation-custom/by-culture-variety/?culture_variety=${varietyId}`
  );
}

// Установить условия для сорта + операция
export async function setConditions(data: SetConditionsRequest): Promise<SetConditionsSuccess> {
  return await apiClient<SetConditionsSuccess>(
    '/agro-op/operation-custom/by-culture-variety/set-conditions/',
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    }
  );
}