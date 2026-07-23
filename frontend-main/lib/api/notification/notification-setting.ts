import { api } from '../client';
import type {
  NotificationSetting,
  NotificationSettingCreate,
  NotificationSettingUpdate,
  NotificationSettingListResponse,
} from '@/lib/types/notification/notification-setting';

export async function getNotificationSettings(): Promise<NotificationSettingListResponse> {
  return api.get<NotificationSettingListResponse>('/notification/setting/');
}

export async function createNotificationSetting(
  data: NotificationSettingCreate
): Promise<NotificationSetting> {
  return api.post<NotificationSetting>('/notification/setting/', data);
}

export async function updateNotificationSetting(
  id: number,
  data: NotificationSettingUpdate
): Promise<NotificationSetting> {
  return api.patch<NotificationSetting>(`/notification/setting/${id}/`, data);
}

export async function deleteNotificationSetting(id: number): Promise<void> {
  return api.delete<void>(`/notification/setting/${id}/`);
}