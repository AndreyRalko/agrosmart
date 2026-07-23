import { api } from './client';
import type { DashboardData } from '@/lib/types/dashboard';

export async function getDashboard(): Promise<DashboardData> {
  return api.get<DashboardData>('/dashboard/');
}