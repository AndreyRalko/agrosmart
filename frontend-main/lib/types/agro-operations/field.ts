import type { Condition } from './condition';
import type { IntegrationNested } from './integration-nested';

export interface IntegrationField {
  id: number;
  name: string;
  field_name?: string;
  name_kk: string;
  name_ru: string;
}

export interface AgroField {
  id: number;
  name: string;
  type: number; // 0 = начальные, 1 = финишные
  required: boolean;
  operation: number;
  integration: IntegrationNested | null;
  integration_field: IntegrationField | null; // null = ручное поле
  conditions: Condition[];
  name_ru: string;
  name_kk: string;
}

export interface AgroFieldDetail {
  id: number;
  name: string;
  type: number;
  required: boolean;
  operation: number;
  integration: IntegrationNested | null;
  integration_field: IntegrationField | null;
  conditions: Condition[];
  name_ru: string;
  name_kk: string;
}

export interface AgroFieldCreate {
  operation: number;
  integration?: number | null;
  integration_field?: number | null;
  type: number;
  required: boolean;
  name_ru: string;
  name_kk: string;
}

export interface AgroFieldUpdate {
  operation?: number;
  integration?: number | null;
  integration_field?: number | null;
  type?: number;
  required?: boolean;
  name_ru?: string;
  name_kk?: string;
}

export interface AgroFieldListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: AgroField[];
}