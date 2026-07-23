import { api } from '../client';
import type { FertilizerDoseRequest, FertilizerDoseResponse } from '@/lib/types/fertilizer/fertilizer';

export async function calculateFertilizerDose(
  data: FertilizerDoseRequest
): Promise<FertilizerDoseResponse> {
  return api.post<FertilizerDoseResponse>('/fertilizer/dose/', data);
}