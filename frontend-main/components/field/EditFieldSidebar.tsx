'use client';

import { useState, FormEvent, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { updateField, deleteField } from '@/lib/api/field/field';
import { useTranslation } from '@/lib/hooks/useTranslation';
import type { Field, FieldUpdate } from '@/lib/types/field/field';
import { DEFAULT_MAP_CENTER } from '@/lib/constants/map';

// Динамический импорт карты для выбора координат
const YandexMapPicker = dynamic(() => import('@/components/maps/YandexMapPicker'), {
  ssr: false,
  loading: () => <div className="w-full h-[400px] bg-neutral-100 animate-pulse rounded-lg" />
});

interface EditFieldSidebarProps {
  isOpen: boolean;
  field: Field | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface Coordinates {
  topLeft: [number, number] | null;
  topRight: [number, number] | null;
  bottomLeft: [number, number] | null;
  bottomRight: [number, number] | null;
}

export default function EditFieldSidebar({ isOpen, field, onClose, onSuccess }: EditFieldSidebarProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<FieldUpdate>({
    no: '',
    square: 0,
  });
  const [coordinates, setCoordinates] = useState<Coordinates>({
    topLeft: null,
    topRight: null,
    bottomLeft: null,
    bottomRight: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showMap, setShowMap] = useState(false);

  // Функция для расчета площади по координатам
  const calculateSquare = (coords: Coordinates): number => {
    const { topLeft, topRight, bottomLeft, bottomRight } = coords;
    
    if (!topLeft || !topRight || !bottomLeft || !bottomRight) return 0;

    const toRadians = (deg: number) => deg * Math.PI / 180;
    const earthRadius = 6371000; // метры
    
    const distance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const dLat = toRadians(lat2 - lat1);
      const dLon = toRadians(lon2 - lon1);
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return earthRadius * c;
    };

    const width = distance(topLeft[0], topLeft[1], topRight[0], topRight[1]);
    const height = distance(topLeft[0], topLeft[1], bottomLeft[0], bottomLeft[1]);
    
    const squareMeters = width * height;
    const hectares = squareMeters / 10000;
    
    return Math.round(hectares * 100) / 100;
  };

  useEffect(() => {
    if (field) {
      setFormData({
        no: field.no,
        square: field.square,
      });
      
      const topLeftLat = parseFloat(field.pos_top_left_lat);
      const topLeftLon = parseFloat(field.pos_top_left_lon);
      const topRightLat = parseFloat(field.pos_top_right_lat);
      const topRightLon = parseFloat(field.pos_top_right_lon);
      const bottomLeftLat = parseFloat(field.pos_bottom_left_lat);
      const bottomLeftLon = parseFloat(field.pos_bottom_left_lon);
      const bottomRightLat = parseFloat(field.pos_bottom_right_lat);
      const bottomRightLon = parseFloat(field.pos_bottom_right_lon);

      setCoordinates({
        topLeft: !isNaN(topLeftLat) && !isNaN(topLeftLon) && topLeftLat !== 0 && topLeftLon !== 0
          ? [topLeftLat, topLeftLon]
          : null,
        topRight: !isNaN(topRightLat) && !isNaN(topRightLon) && topRightLat !== 0 && topRightLon !== 0
          ? [topRightLat, topRightLon]
          : null,
        bottomLeft: !isNaN(bottomLeftLat) && !isNaN(bottomLeftLon) && bottomLeftLat !== 0 && bottomLeftLon !== 0
          ? [bottomLeftLat, bottomLeftLon]
          : null,
        bottomRight: !isNaN(bottomRightLat) && !isNaN(bottomRightLon) && bottomRightLat !== 0 && bottomRightLon !== 0
          ? [bottomRightLat, bottomRightLon]
          : null,
      });
    }
  }, [field]);

  const handleCoordinatesChange = (newCoords: Coordinates) => {
    setCoordinates(newCoords);
    // Автоматически пересчитываем площадь при изменении координат
    const newSquare = calculateSquare(newCoords);
    if (newSquare > 0) {
      setFormData(prev => ({ ...prev, square: newSquare }));
    }
    if (error) setError('');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!field) return;

    if (!coordinates.topLeft || !coordinates.topRight || !coordinates.bottomLeft || !coordinates.bottomRight) {
      setError('Необходимо указать все четыре угла поля');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Проверяем площадь
      const squareValue = typeof formData.square === 'number' ? formData.square : parseFloat(String(formData.square));
      
      if (!squareValue || isNaN(squareValue) || squareValue <= 0) {
        setError('Введите корректную площадь');
        return;
      }
      
      const updateData: FieldUpdate = {
        no: formData.no,
        square: Math.round(squareValue),
        pos_top_left_lat: coordinates.topLeft[0].toFixed(6),
        pos_top_left_lon: coordinates.topLeft[1].toFixed(6),
        pos_top_right_lat: coordinates.topRight[0].toFixed(6),
        pos_top_right_lon: coordinates.topRight[1].toFixed(6),
        pos_bottom_left_lat: coordinates.bottomLeft[0].toFixed(6),
        pos_bottom_left_lon: coordinates.bottomLeft[1].toFixed(6),
        pos_bottom_right_lat: coordinates.bottomRight[0].toFixed(6),
        pos_bottom_right_lon: coordinates.bottomRight[1].toFixed(6),
      };

      await updateField(field.id, updateData);
      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update field';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!field || !confirm('Вы уверены что хотите удалить это поле?')) return;

    setLoading(true);
    setError('');

    try {
      await deleteField(field.id);
      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete field';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const calculatedSquare = calculateSquare(coordinates);

  if (!isOpen || !field) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black bg-opacity-40 z-40"
      />

      <div className="fixed inset-0 md:inset-auto md:right-0 md:top-0 md:h-screen md:w-[500px] bg-white md:border-l border-neutral-200 z-50 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900">Редактировать поле</h2>
            <button
              onClick={onClose}
              className="text-neutral-500 hover:text-neutral-900 transition-colors"
              aria-label={t('close')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-600 text-red-800 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Номер поля {t('requiredField')}
              </label>
              <input
                type="text"
                name="no"
                value={formData.no || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, no: e.target.value }))}
                required
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Площадь (га) {t('requiredField')}
              </label>
              <input
                type="number"
                name="square"
                value={formData.square || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, square: parseFloat(e.target.value) || 0 }))}
                required
                min="0"
                step="0.01"
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
              />
              {calculatedSquare > 0 && calculatedSquare !== formData.square && (
                <p className="mt-1 text-xs text-blue-600">
                  Расчетная площадь по координатам: {calculatedSquare} га
                </p>
              )}
            </div>

            {/* Переключатель карты */}
            <div className="border-t border-neutral-200 pt-4">
              <button
                type="button"
                onClick={() => setShowMap(!showMap)}
                className="w-full flex items-center justify-between p-3 bg-neutral-50 hover:bg-neutral-100 transition-colors"
              >
                <span className="text-sm font-medium text-neutral-700">
                  {showMap ? 'Скрыть карту' : 'Показать карту для редактирования'}
                </span>
                <svg 
                  className={`w-5 h-5 transition-transform ${showMap ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showMap && (
                <div className="mt-4">
                  {coordinates.topLeft && coordinates.topRight && 
                   coordinates.bottomLeft && coordinates.bottomRight && (
                    <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-green-800">
                          ✅ Координаты заданы
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const newCoords = {
                              topLeft: null,
                              topRight: null,
                              bottomLeft: null,
                              bottomRight: null,
                            };
                            setCoordinates(newCoords);
                            handleCoordinatesChange(newCoords);
                          }}
                          className="text-xs text-red-600 hover:text-red-800 font-medium underline"
                        >
                          🗑️ Очистить и выбрать заново
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900">
                    <strong>Инструкция:</strong> {coordinates.topLeft && coordinates.topRight && 
                    coordinates.bottomLeft && coordinates.bottomRight 
                      ? 'Нажмите "Очистить" выше, чтобы выбрать новые координаты на карте'
                      : 'Нажмите на карту, чтобы отметить углы поля по порядку: 1) Верхний левый, 2) Верхний правый, 3) Нижний левый, 4) Нижний правый'}
                  </div>
                  
                  <YandexMapPicker
                    center={coordinates.topLeft || DEFAULT_MAP_CENTER}
                    zoom={14}
                    height="400px"
                    initialCoordinates={coordinates}
                    onCoordinatesChange={handleCoordinatesChange}
                  />
                </div>
              )}
            </div>

            {/* Отображение выбранных координат */}
            <div className="border-t border-neutral-200 pt-4">
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Координаты</h3>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2 bg-neutral-50">
                  <span className="text-neutral-600">Верхний левый:</span>
                  <span className="text-neutral-900 font-mono">
                    {coordinates.topLeft ? `${coordinates.topLeft[0].toFixed(6)}, ${coordinates.topLeft[1].toFixed(6)}` : 'Не выбрано'}
                  </span>
                </div>
                
                <div className="flex justify-between p-2 bg-neutral-50">
                  <span className="text-neutral-600">Верхний правый:</span>
                  <span className="text-neutral-900 font-mono">
                    {coordinates.topRight ? `${coordinates.topRight[0].toFixed(6)}, ${coordinates.topRight[1].toFixed(6)}` : 'Не выбрано'}
                  </span>
                </div>
                
                <div className="flex justify-between p-2 bg-neutral-50">
                  <span className="text-neutral-600">Нижний левый:</span>
                  <span className="text-neutral-900 font-mono">
                    {coordinates.bottomLeft ? `${coordinates.bottomLeft[0].toFixed(6)}, ${coordinates.bottomLeft[1].toFixed(6)}` : 'Не выбрано'}
                  </span>
                </div>
                
                <div className="flex justify-between p-2 bg-neutral-50">
                  <span className="text-neutral-600">Нижний правый:</span>
                  <span className="text-neutral-900 font-mono">
                    {coordinates.bottomRight ? `${coordinates.bottomRight[0].toFixed(6)}, ${coordinates.bottomRight[1].toFixed(6)}` : 'Не выбрано'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-200">
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="w-full px-4 py-2.5 bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors disabled:bg-neutral-100 disabled:text-neutral-400"
              >
                {t('delete')} поле
              </button>
            </div>

            <div className="flex gap-3 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-neutral-300 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors"
              >
                {loading ? t('saving') : t('save')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}