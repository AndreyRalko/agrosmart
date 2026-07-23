'use client';

import { useState, FormEvent, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { createField, getFields } from '@/lib/api/field/field';
import { useTranslation } from '@/lib/hooks/useTranslation';
import type { FieldCreate } from '@/lib/types/field/field';
import { DEFAULT_MAP_CENTER } from '@/lib/constants/map';
import { buildFieldPolygons, type FieldMapPolygon } from '@/lib/utils/field-map';

const YandexMapPicker = dynamic(() => import('@/components/maps/YandexMapPicker'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-neutral-100 animate-pulse" />
});

interface CreateFieldSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Coordinates {
  topLeft: [number, number] | null;
  topRight: [number, number] | null;
  bottomLeft: [number, number] | null;
  bottomRight: [number, number] | null;
}

export default function CreateFieldSidebar({ isOpen, onClose, onSuccess }: CreateFieldSidebarProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    no: '',
  });
  const [coordinates, setCoordinates] = useState<Coordinates>({
    topLeft: null,
    topRight: null,
    bottomLeft: null,
    bottomRight: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [existingPolygons, setExistingPolygons] = useState<FieldMapPolygon[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    getFields()
      .then((data) => setExistingPolygons(buildFieldPolygons(data.results || [])))
      .catch(() => setExistingPolygons([]));
  }, [isOpen]);

  const calculateSquare = (coords: Coordinates): number => {
    const { topLeft, topRight, bottomLeft, bottomRight } = coords;

    if (!topLeft || !topRight || !bottomLeft || !bottomRight) return 0;

    const toRadians = (deg: number) => deg * Math.PI / 180;
    const earthRadius = 6371000;

    const distance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const dLat = toRadians(lat2 - lat1);
      const dLon = toRadians(lon2 - lon1);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return earthRadius * c;
    };

    const width = distance(topLeft[0], topLeft[1], topRight[0], topRight[1]);
    const height = distance(topLeft[0], topLeft[1], bottomLeft[0], bottomLeft[1]);
    const hectares = (width * height) / 10000;

    return Math.round(hectares * 100) / 100;
  };

  const handleCoordinatesChange = (newCoords: Coordinates) => {
    setCoordinates(newCoords);
    if (error) setError('');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!coordinates.topLeft || !coordinates.topRight || !coordinates.bottomLeft || !coordinates.bottomRight) {
      setError('Необходимо указать все четыре угла поля на карте');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const square = calculateSquare(coordinates);

      if (!square || isNaN(square) || square <= 0) {
        setError('Не удалось рассчитать площадь. Проверьте координаты.');
        return;
      }

      const fieldData: FieldCreate = {
        no: formData.no,
        square: Math.round(square),
        pos_top_left_lat: coordinates.topLeft[0].toFixed(6),
        pos_top_left_lon: coordinates.topLeft[1].toFixed(6),
        pos_top_right_lat: coordinates.topRight[0].toFixed(6),
        pos_top_right_lon: coordinates.topRight[1].toFixed(6),
        pos_bottom_left_lat: coordinates.bottomLeft[0].toFixed(6),
        pos_bottom_left_lon: coordinates.bottomLeft[1].toFixed(6),
        pos_bottom_right_lat: coordinates.bottomRight[0].toFixed(6),
        pos_bottom_right_lon: coordinates.bottomRight[1].toFixed(6),
      };

      await createField(fieldData);
      onSuccess();
      onClose();

      setFormData({ no: '' });
      setCoordinates({
        topLeft: null,
        topRight: null,
        bottomLeft: null,
        bottomRight: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create field';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const calculatedSquare = calculateSquare(coordinates);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <form onSubmit={handleSubmit} className="flex h-full flex-col">
        <header className="shrink-0 border-b border-neutral-200 bg-white px-4 py-3 md:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-neutral-900">Создать поле</h2>
              <button
                type="button"
                onClick={onClose}
                className="text-neutral-500 transition-colors hover:text-neutral-900 lg:hidden"
                aria-label={t('close')}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end lg:justify-end">
              <div className="w-full sm:max-w-[220px]">
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Номер поля {t('requiredField')}
                </label>
                <input
                  type="text"
                  name="no"
                  value={formData.no}
                  onChange={(e) => setFormData({ no: e.target.value })}
                  required
                  className="w-full border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 transition-colors focus:border-neutral-900 focus:outline-none"
                />
              </div>

              {calculatedSquare > 0 && (
                <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-900 sm:min-w-[160px]">
                  Площадь: {calculatedSquare} га
                </div>
              )}

              <div className="flex gap-2 sm:ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 sm:flex-none"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:bg-neutral-400 sm:flex-none"
                >
                  {loading ? t('creating') : t('create')}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="hidden text-neutral-500 transition-colors hover:text-neutral-900 lg:block"
                  aria-label={t('close')}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-3 border-l-4 border-red-600 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}
        </header>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="flex min-h-0 flex-1 flex-col p-4 md:p-6">
            <div className="mb-3 rounded border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
              <strong>Инструкция:</strong> нажмите на карту, чтобы отметить углы нового поля по порядку:
              1) верхний левый, 2) верхний правый, 3) нижний левый, 4) нижний правый.
              Серые контуры — уже существующие поля.
            </div>

            <div className="min-h-0 flex-1">
              <YandexMapPicker
                center={DEFAULT_MAP_CENTER}
                zoom={14}
                fillHeight
                existingPolygons={existingPolygons}
                onCoordinatesChange={handleCoordinatesChange}
              />
            </div>
          </div>

          <aside className="shrink-0 border-t border-neutral-200 bg-neutral-50 p-4 md:p-6 lg:w-[320px] lg:border-l lg:border-t-0">
            <h3 className="mb-3 text-sm font-medium text-neutral-700">Выбранные координаты</h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between gap-3 rounded bg-white p-2">
                <span className="text-neutral-600">Верхний левый</span>
                <span className="font-mono text-neutral-900">
                  {coordinates.topLeft ? `${coordinates.topLeft[0].toFixed(6)}, ${coordinates.topLeft[1].toFixed(6)}` : '—'}
                </span>
              </div>

              <div className="flex justify-between gap-3 rounded bg-white p-2">
                <span className="text-neutral-600">Верхний правый</span>
                <span className="font-mono text-neutral-900">
                  {coordinates.topRight ? `${coordinates.topRight[0].toFixed(6)}, ${coordinates.topRight[1].toFixed(6)}` : '—'}
                </span>
              </div>

              <div className="flex justify-between gap-3 rounded bg-white p-2">
                <span className="text-neutral-600">Нижний левый</span>
                <span className="font-mono text-neutral-900">
                  {coordinates.bottomLeft ? `${coordinates.bottomLeft[0].toFixed(6)}, ${coordinates.bottomLeft[1].toFixed(6)}` : '—'}
                </span>
              </div>

              <div className="flex justify-between gap-3 rounded bg-white p-2">
                <span className="text-neutral-600">Нижний правый</span>
                <span className="font-mono text-neutral-900">
                  {coordinates.bottomRight ? `${coordinates.bottomRight[0].toFixed(6)}, ${coordinates.bottomRight[1].toFixed(6)}` : '—'}
                </span>
              </div>
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
}
