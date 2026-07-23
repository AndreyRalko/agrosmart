'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useRef } from 'react';
import { getAgroOperation } from '@/lib/api/agro-operations/operation';
import type { AgroOperationDetail, TransportationCoords } from '@/lib/types/agro-operations/operation';

interface ViewOperationModalProps {
  isOpen: boolean;
  operationId: number | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete?: () => void;
}

// ---- localStorage helpers ----

const LS_KEY = 'agro_transportation_coords';

export function saveTransportationCoords(operationId: number, coords: TransportationCoords) {
  try {
    const existing = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    existing[operationId] = coords;
    localStorage.setItem(LS_KEY, JSON.stringify(existing));
  } catch {}
}

function loadTransportationCoords(operationId: number): TransportationCoords | null {
  try {
    const existing = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    return existing[operationId] ?? null;
  } catch {
    return null;
  }
}

// ---- Component ----

export default function ViewOperationModal({ isOpen, operationId, onClose, onEdit, onDelete }: ViewOperationModalProps) {
  const [operation, setOperation] = useState<AgroOperationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !operationId) return;
    fetchOperation(operationId);
  }, [isOpen, operationId]);

  useEffect(() => {
    if (!operation) return;

    const transportation = operation.transportation
      ?? (operationId ? loadTransportationCoords(operationId) : null);

    if (!transportation) return;

    initMap(transportation);
  }, [operation]);

  useEffect(() => {
    if (!isOpen) {
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch {}
        mapRef.current = null;
      }
      setOperation(null);
      setError('');
    }
  }, [isOpen]);

  const initMap = async (transportation: TransportationCoords) => {
    // Ждём пока контейнер отрендерится
    await new Promise(resolve => setTimeout(resolve, 100));
    if (!mapContainerRef.current || mapRef.current) return;

    // Динамический импорт Leaflet (SSR safe)
    const L = (await import('leaflet')).default;

    // Фикс иконок Leaflet
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const centerLat = (transportation.point_a_lat + transportation.point_b_lat) / 2;
    const centerLng = (transportation.point_a_lng + transportation.point_b_lng) / 2;

    const map = L.map(mapContainerRef.current).setView([centerLat, centerLng], 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Маркер А — синий
    const iconA = L.divIcon({
      html: '<div style="width:14px;height:14px;background:#1d4ed8;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
      className: '',
    });
    L.marker([transportation.point_a_lat, transportation.point_a_lng], { icon: iconA })
      .addTo(map)
      .bindPopup('Точка А (откуда)');

    // Маркер Б — красный
    const iconB = L.divIcon({
      html: '<div style="width:14px;height:14px;background:#dc2626;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
      className: '',
    });
    L.marker([transportation.point_b_lat, transportation.point_b_lng], { icon: iconB })
      .addTo(map)
      .bindPopup('Точка Б (куда)');

    mapRef.current = map;

    // Маршрут через OSRM
    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${transportation.point_a_lng},${transportation.point_a_lat};${transportation.point_b_lng},${transportation.point_b_lat}?overview=full&geometries=geojson`
      );
      const data = await res.json();

      if (data.routes?.[0]?.geometry) {
        const routeLine = L.geoJSON(data.routes[0].geometry, {
          style: { color: '#1d4ed8', weight: 4, opacity: 0.8 },
        }).addTo(map);

        map.fitBounds(routeLine.getBounds(), { padding: [30, 30] });
      }
    } catch {
      // Если OSRM недоступен — просто линия между точками
      const line = L.polyline(
        [
          [transportation.point_a_lat, transportation.point_a_lng],
          [transportation.point_b_lat, transportation.point_b_lng],
        ],
        { color: '#1d4ed8', weight: 3, dashArray: '6, 6' }
      ).addTo(map);

      map.fitBounds(line.getBounds(), { padding: [30, 30] });
    }
  };

  const fetchOperation = async (id: number) => {
    setLoading(true);
    setError('');
    try {
      const data = await getAgroOperation(id);
      setOperation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const transportation = operation?.transportation
    ?? (operationId ? loadTransportationCoords(operationId) : null);

  const isTransportation = operation?.type === 'transportation'
    || (operationId ? !!loadTransportationCoords(operationId) : false);

  const startFields = (operation?.fields || []).filter(f => f.type === 0);
  const indicatorFields = (operation?.fields || []).filter(f => f.type === 1);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <h2 className="text-lg font-semibold text-neutral-900">Детали операции</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="px-3 py-1.5 text-xs font-medium border border-neutral-300 text-neutral-700 hover:bg-neutral-50 rounded transition-colors"
            >
              Редактировать
            </button>
            {onDelete && (
              <button
                onClick={onDelete}
                className="px-3 py-1.5 text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 rounded transition-colors"
              >
                Удалить
              </button>
            )}
            <button onClick={onClose} className="text-neutral-500 hover:text-neutral-900 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-neutral-900" />
            </div>
          )}

          {error && !loading && (
            <div className="p-3 bg-red-50 border-l-4 border-red-600 text-red-800 text-sm">{error}</div>
          )}

          {operation && !loading && (
            <div className="space-y-5">
              <div>
                <h3 className="text-xl font-semibold text-neutral-900">{operation.name}</h3>
                {isTransportation && (
                  <span
                    className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded"
                    style={{ backgroundColor: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}
                  >
                    Транспортировка
                  </span>
                )}
              </div>

              {transportation && (
                <div>
                  <p className="text-sm font-medium text-neutral-700 mb-2">Маршрут</p>
                  <div className="flex gap-2 mb-3">
                    <div className="flex-1 p-2 rounded text-xs" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                      <span className="font-medium">Точка А:</span>{' '}
                      {transportation.point_a_lat.toFixed(5)}, {transportation.point_a_lng.toFixed(5)}
                    </div>
                    <div className="flex-1 p-2 rounded text-xs" style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                      <span className="font-medium">Точка Б:</span>{' '}
                      {transportation.point_b_lat.toFixed(5)}, {transportation.point_b_lng.toFixed(5)}
                    </div>
                  </div>
                  <div
                    ref={mapContainerRef}
                    className="w-full rounded border border-neutral-200"
                    style={{ height: '280px' }}
                  />
                </div>
              )}

              {startFields.length > 0 && (
                <div>
                  <div
                    className="text-xs font-semibold uppercase tracking-wide mb-2 px-2 py-1 inline-block rounded"
                    style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}
                  >
                    Условия старта · {startFields.length}
                  </div>
                  <div className="space-y-1.5">
                    {startFields.map(field => (
                      <div key={field.id} className="flex items-center gap-2 text-sm">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: '#3b82f6' }} />
                        <span className="text-neutral-700">{field.name_ru || field.name}</span>
                        {field.required && <span className="text-xs" style={{ color: '#ef4444' }}>*</span>}
                        {field.integration && (
                          <span className="px-1.5 py-0.5 text-xs rounded" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>
                            {field.integration.name}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {indicatorFields.length > 0 && (
                <div>
                  <div
                    className="text-xs font-semibold uppercase tracking-wide mb-2 px-2 py-1 inline-block rounded"
                    style={{ backgroundColor: '#f0fdf4', color: '#15803d' }}
                  >
                    Индикаторы выполнения · {indicatorFields.length}
                  </div>
                  <div className="space-y-1.5">
                    {indicatorFields.map(field => (
                      <div key={field.id} className="flex items-center gap-2 text-sm">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: '#22c55e' }} />
                        <span className="text-neutral-700">{field.name_ru || field.name}</span>
                        {field.required && <span className="text-xs" style={{ color: '#ef4444' }}>*</span>}
                        {field.integration && (
                          <span className="px-1.5 py-0.5 text-xs rounded" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>
                            {field.integration.name}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {startFields.length === 0 && indicatorFields.length === 0 && !transportation && (
                <p className="text-sm text-neutral-400 italic">Нет параметров</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}