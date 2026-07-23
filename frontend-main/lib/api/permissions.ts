import { api } from './client';
import type { UserPermissions } from '@/lib/constants/modules';

export async function getMyPermissions(): Promise<UserPermissions> {
  return api.get<UserPermissions>('/me/permissions/');
}
