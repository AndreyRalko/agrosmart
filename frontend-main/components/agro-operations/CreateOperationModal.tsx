'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef, FormEvent } from 'react';
import { createAgroOperation, createTransportationOperation } from '@/lib/api/agro-operations/operation';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { saveTransportationCoords } from './ViewOperationModal';

interface CreateOperationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (operationId: number) => void;
}

type OperationType = 'standard' | 'transportation';
type PickingPoint = 'A' | 'B' | null;

interface LatLng { lat: number; lng: number; }

export default function CreateOperationModal({ isOpen, onClose, onSuccess }: CreateOperationModalProps) {
  const { t } = useTranslation();
  const [nameRu, setNameRu] = useState('');
  const [nameKk, setNameKk] = useState('');
  const [opType, setOpType] = useState<OperationType>('standard');
  const [pointA, setPointA] = useState<LatLng | null>(null);
  const [pointB, setPointB] = useState<LatLng | null>(null);
  const [picking, setPicking] = useState<PickingPoint>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markerARef = useRef<any>(null);
  const markerBRef = useRef<any>(null);
  const pickingRef = useRef<PickingPoint>(null);
  const LRef = useRef<any>(null);

  useEffect(() => {
    pickingRef.current = picking;
  }, [picking]);

  useEffect(() => {
    if (opType === 'transportation' && isOpen) {
      initMap();
    }
  }, [opType, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch {}
        mapRef.current = null;
        markerARef.current = null;
        markerBRef.current = null;
      }
      setNameRu('');
      setNameKk('');
      setOpType('standard');
      setPointA(null);
      setPointB(null);
      setPicking(null);
      setError('');
    }
  }, [isOpen]);

  const initMap = async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    if (!mapContainerRef.current || mapRef.current) return;

    const L = (await import('leaflet')).default;
    LRef.current = L;

    const map = L.map(mapContainerRef.current).setView([51.1801, 71.4460], 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    map.on('click', (e: any) => {
      const current = pickingRef.current;
      if (!current) return;

      const latlng: LatLng = { lat: e.latlng.lat, lng: e.latlng.lng };

      const icon = L.divIcon({
        html: `<div style="width:14px;height:14px;background:${current === 'A' ? '#1d4ed8' : '#dc2626'};border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        className: '',
      });

      if (current === 'A') {
        if (markerARef.current) markerARef.current.remove();
        markerARef.current = L.marker([latlng.lat, latlng.lng], { icon })
          .addTo(map)
          .bindPopup('Точка А');
        setPointA(latlng);
      } else {
        if (markerBRef.current) markerBRef.current.remove();
        markerBRef.current = L.marker([latlng.lat, latlng.lng], { icon })
          .addTo(map)
          .bindPopup('Точка Б');
        setPointB(latlng);
      }
      setPicking(null);
    });

    mapRef.current = map;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (opType === 'transportation' && (!pointA || !pointB)) {
      setError('Укажите точку А и точку Б на карте');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload: any = { name_ru: nameRu, name_kk: nameKk, type: opType };
      if (opType === 'transportation' && pointA && pointB) {
        payload.transportation = {
          point_a_lat: pointA.lat,
          point_a_lng: pointA.lng,
          point_b_lat: pointB.lat,
          point_b_lng: pointB.lng,
        };
      }
      const result = await createAgroOperation({ name_ru: nameRu, name_kk: nameKk });

      if (opType === 'transportation' && pointA && pointB) {
        // Создаём запись транспортировки на бэкенде
        await createTransportationOperation(result.id);
        
        // Сохраняем координаты в localStorage
        saveTransportationCoords(result.id, {
          point_a_lat: pointA.lat,
          point_a_lng: pointA.lng,
          point_b_lat: pointB.lat,
          point_b_lng: pointB.lng,
        });
      }

      onSuccess(result.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания операции');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <h2 className="text-lg font-semibold text-neutral-900">Создать операцию</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-900 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border-l-4 border-red-600 text-red-800 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Название (RU) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nameRu}
              onChange={e => setNameRu(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900"
              placeholder="Например: Посев"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Название (KK) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nameKk}
              onChange={e => setNameKk(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900"
              placeholder="Например: Себу"
            />
          </div>

          {/* Тип операции */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Тип операции</label>
            <div className="flex gap-3">
              {(['standard', 'transportation'] as OperationType[]).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setOpType(type);
                    if (type === 'standard' && mapRef.current) {
                      try { mapRef.current.remove(); } catch {}
                      mapRef.current = null;
                    }
                  }}
                  className="flex-1 py-2.5 text-sm font-medium border rounded transition-colors"
                  style={opType === type
                    ? { backgroundColor: '#171717', color: '#fff', borderColor: '#171717' }
                    : { backgroundColor: '#fff', color: '#525252', borderColor: '#e5e7eb' }
                  }
                >
                  {type === 'standard' ? 'Обычная' : 'Транспортировка'}
                </button>
              ))}
            </div>
          </div>

          {/* Карта Leaflet */}
          {opType === 'transportation' && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Маршрут <span className="text-red-500">*</span>
              </label>

              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setPicking(prev => prev === 'A' ? null : 'A')}
                  className="flex-1 py-2 text-xs font-medium border rounded transition-colors"
                  style={picking === 'A'
                    ? { backgroundColor: '#1d4ed8', color: '#fff', borderColor: '#1d4ed8' }
                    : pointA
                      ? { backgroundColor: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }
                      : { backgroundColor: '#fff', color: '#525252', borderColor: '#e5e7eb' }
                  }
                >
                  {picking === 'A'
                    ? '📍 Кликните на карту...'
                    : pointA
                      ? `✓ А: ${pointA.lat.toFixed(4)}, ${pointA.lng.toFixed(4)}`
                      : '+ Точка А (откуда)'}
                </button>
                <button
                  type="button"
                  onClick={() => setPicking(prev => prev === 'B' ? null : 'B')}
                  className="flex-1 py-2 text-xs font-medium border rounded transition-colors"
                  style={picking === 'B'
                    ? { backgroundColor: '#dc2626', color: '#fff', borderColor: '#dc2626' }
                    : pointB
                      ? { backgroundColor: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' }
                      : { backgroundColor: '#fff', color: '#525252', borderColor: '#e5e7eb' }
                  }
                >
                  {picking === 'B'
                    ? '📍 Кликните на карту...'
                    : pointB
                      ? `✓ Б: ${pointB.lat.toFixed(4)}, ${pointB.lng.toFixed(4)}`
                      : '+ Точка Б (куда)'}
                </button>
              </div>

              {picking && (
                <p className="text-xs text-center mb-2" style={{ color: '#6b7280' }}>
                  Активен режим выбора точки <strong>{picking}</strong> — кликните на карту
                </p>
              )}

              <div
                ref={mapContainerRef}
                className="w-full rounded border border-neutral-200"
                style={{ height: '280px', cursor: picking ? 'crosshair' : 'grab' }}
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
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
              {loading ? t('creating') : t('create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}