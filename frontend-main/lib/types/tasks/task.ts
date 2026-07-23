export type TaskStatus = 'created' | 'pending' | 'in_progress' | 'completed';

export interface TaskUser {
  id: number;
  lastname: string;
  firstname: string;
  patronymic: string | null;
}

export interface TaskOperation {
  id: number;
  name: string;
  name_kk: string;
  name_ru: string;
}

export interface TaskCultureVariety {
  id: number;
  name: string;
  name_kk: string;
  name_ru: string;
}

export interface TaskPhysicalField {
  id: number;
  no: string;
}

export interface TaskFieldValue {
  id: number;
  field_name: string;
  value_numeric: number | null;
  condition: Record<string, number>;
  field_name_kk: string | null;
  field_name_ru: string;
}

export interface Task {
  id: number;
  creator: TaskUser;
  responsible: TaskUser;
  operation: TaskOperation;
  culture_variety: TaskCultureVariety;
  physical_field: TaskPhysicalField;
  status: TaskStatus;
  deadline: string;
  note: string | null;
  field_values: TaskFieldValue[];
}

export interface TaskListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Task[];
}

// POST body
export interface TaskFieldValueInput {
  field_ref: number;
  value_numeric: number;
}

export interface TaskCreate {
  responsible: number;
  operation: number;
  culture_variety: number;
  physical_field: number;
  deadline: string; // "YYYY-MM-DD"
  field_values_input: TaskFieldValueInput[];
  note?: string | null;
  is_force?: boolean; // true = игнорировать condition ошибки
}

export interface TaskUpdate {
  responsible?: number;
  operation?: number;
  culture_variety?: number;
  physical_field?: number;
  status?: TaskStatus;
  deadline?: string;
  note?: string | null;
  field_values_input?: TaskFieldValueInput[];
}

// Ошибка при нарушении условий (422 без is_force)
export interface TaskConditionError {
  code: 'check_condition__error';
  condition: Record<string, string | number>;
  field_ref: string | number;
  field_name?: string;
  metric_key?: string | null;
  metric_label?: string | null;
  explain: string;
  value: string | number | null;
}

export interface TaskConditionErrorResponse {
  errors: TaskConditionError[];
}