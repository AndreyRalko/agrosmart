import { getAccessToken } from '../auth';
import { buildApiUrl } from '../api-url';

export interface NdviStats {
  min: number;
  max: number;
  mean: number;
  std: number;
}

export interface NdviUploadResult {
  imageUrl: string;
  stats: NdviStats;
}

export async function uploadNdvi(file: File): Promise<NdviUploadResult> {
  const token = getAccessToken();
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(buildApiUrl('api/ndvi/upload'), {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Ошибка ${response.status}`);
  }

  const stats: NdviStats = {
    min: Number(response.headers.get('X-NDVI-Min')),
    max: Number(response.headers.get('X-NDVI-Max')),
    mean: Number(response.headers.get('X-NDVI-Mean')),
    std: Number(response.headers.get('X-NDVI-Std')),
  };

  const blob = await response.blob();
  const imageUrl = URL.createObjectURL(blob);

  return { imageUrl, stats };
}