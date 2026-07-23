export interface NotificationSettingParams {
  field_id: number;
  operation_id: number;
  culture_variety_id: number;
}

export interface NotificationSetting {
  id: number;
  type: string;
  params: NotificationSettingParams;
  every_minute: number;
  min_look_ahead_hours: number;
  look_ahead_hours: number;
  active_from_hour: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationSettingCreate {
  type: 'optimal_conditions';
  params: NotificationSettingParams;
  every_minute: number;
  min_look_ahead_hours: number;
  look_ahead_hours: number;
  active_from_hour: number;
  is_active: boolean;
}

export interface NotificationSettingUpdate {
  every_minute?: number;
  min_look_ahead_hours?: number;
  look_ahead_hours?: number;
  active_from_hour?: number;
  is_active?: boolean;
}

export interface NotificationSettingListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: NotificationSetting[];
}