export type NotificationStatus = 'sent' | 'read';
export type NotificationType = 'optimal_conditions' | string;

export interface CheckedCondition {
  condition: Record<string, number>;
  field_ref: number;
  field_name: string;
  field_type: number;
  value_numeric: number;
}

export interface NotificationContextData {
  id: number;
  field_id: number;
  field_no: string;
  time: string;
  checked_conditions: CheckedCondition[];
  culture_variety_id: number;
  culture_variety_name: string;
  culture_variety_name_ru: string;
  culture_variety_name_kk: string;
  operation_id: number;
  operation_name: string;
  operation_name_ru: string;
  operation_name_kk: string;
}

export interface Notification {
  id: number;
  setting: number;
  type: NotificationType;
  status: NotificationStatus;
  title: string;
  msg: string;
  payload: Record<string, number>;
  context_data: NotificationContextData;
  created_at: string;
  updated_at: string;
  title_ru: string;
  title_kk: string;
  msg_ru: string;
  msg_kk: string;
}

export interface NotificationListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Notification[];
}