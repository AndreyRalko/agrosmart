import { api } from '../client';
import type { NotificationListResponse } from '@/lib/types/notification/notification';

export async function getNotifications(): Promise<NotificationListResponse> {
  return api.get<NotificationListResponse>('/notification/?page_size=100');
}

export async function markNotificationRead(id: number): Promise<{ status: string }> {
  return api.patch<{ status: string }>(`/notification/status/${id}/`, { status: 'read' });
}