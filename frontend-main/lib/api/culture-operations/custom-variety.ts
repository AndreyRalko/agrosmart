import { apiClient } from '../client';
import { VarietyCustomListResponse } from '@/lib/types/culture-operations/custom-variety';

export async function getVarietiesByCulture(cultureId: number): Promise<VarietyCustomListResponse> {
  return await apiClient<VarietyCustomListResponse>(
    `/culture-custom/by-culture/?id=${cultureId}`
  );
}