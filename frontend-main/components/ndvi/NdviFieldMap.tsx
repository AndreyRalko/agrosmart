'use client';

import { useEffect, useRef, useState } from 'react';
import type { LayerGroup, Map as LeafletMap } from 'leaflet';
import { getNdviMap, type NdviMapResponse } from '@/lib/api/ndvi/ndvi';
import { buildFieldPolygons } from '@/lib/utils/field-map';
import type { Field } from '@/lib/types/field/field';

function isSummerScene(sceneDate: string | null | undefined) {
  if (!sceneDate) return false;
  const month = Number(sceneDate.slice(5, 7));
  return month >= 6 && month <= 8;
}

interface NdviFieldMapProps {
  fields: Field[];
  date: string;
  showImages: boolean;
  height?: number;
}

export default function NdviFieldMap({ fields, date, showImages, height = 520 }: NdviFieldMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const fittedRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [info, setInfo] = useState<NdviMapResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current, { zoomControl: true }).setView([53.132131, 68.98703], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setMapReady(true);
      setTimeout(() => map.invalidateSize(), 0);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      fittedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!showImages) {
      setInfo(null);
      setError('');
      setStatus('ready');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    setError('');
    const timer = window.setTimeout(() => {
      getNdviMap(date)
        .then((data) => {
          if (cancelled) return;
          setInfo(data);
          setStatus('ready');
          if (data.error && data.fields.length === 0) setError(data.error);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setInfo(null);
          setStatus('error');
          setError(err instanceof Error ? err.message : 'Не удалось загрузить NDVI');
        });
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [date, showImages]);

  useEffect(() => {
    const map = mapRef.current;
    const group = layerRef.current;
    if (!mapReady || !map || !group) return;
    let cancelled = false;

    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled) return;
      group.clearLayers();
      const polygons = buildFieldPolygons(fields);
      const images = new Map((info?.fields ?? []).map((item) => [item.field_id, item]));
      const bounds: [number, number][] = [];

      polygons.forEach((polygon) => {
        const image = polygon.fieldId != null ? images.get(polygon.fieldId) : undefined;
        if (showImages && image) {
          const [south, west, north, east] = image.bounds;
          L.imageOverlay(image.image, [[south, west], [north, east]], {
            opacity: 0.95,
            className: isSummerScene(info?.scene_date) ? 'ndvi-summer' : '',
          }).addTo(group);
        }
        const layer = L.polygon(polygon.coordinates, {
          color: '#0f172a',
          weight: 2,
          fill: !(showImages && image),
          fillColor: '#94a3b8',
          fillOpacity: 0.2,
        });
        const caption = image
          ? `Поле ${image.field_no}<br/>NDVI ${image.ndvi_mean.toFixed(2)}`
          : (polygon.hint || '');
        layer.bindTooltip(caption, { permanent: true, direction: 'center', className: 'ndvi-field-label' });
        layer.addTo(group);
        polygon.coordinates.forEach((coord) => bounds.push(coord));
      });

      if (!fittedRef.current && bounds.length > 0) {
        map.fitBounds(bounds, { padding: [28, 28] });
        fittedRef.current = true;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fields, info, showImages, mapReady]);

  const fieldKey = fields.map((field) => field.id).join(',');
  const fieldKeyRef = useRef(fieldKey);
  if (fieldKeyRef.current !== fieldKey) {
    fieldKeyRef.current = fieldKey;
    fittedRef.current = false;
  }

  const sceneLabel = info?.scene_date
    ? `Снимок Sentinel-2 от ${info.scene_date}${info.cloud_cover != null ? ` · облачность ${info.cloud_cover}%` : ''}`
    : null;

  return (
    <div className="relative">
      <style>{`
        .ndvi-field-label {
          background: rgba(15, 23, 42, 0.88);
          color: #fff;
          border: none;
          border-radius: 4px;
          box-shadow: none;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 6px;
        }
        .ndvi-field-label::before { display: none; }
        .ndvi-summer {
          filter: saturate(1.35) hue-rotate(14deg);
        }
      `}</style>
      <div ref={containerRef} className="w-full rounded-lg" style={{ height, backgroundColor: '#e2e8f0' }} />
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg" style={{ backgroundColor: 'rgba(15,23,42,0.35)' }}>
          <div className="px-3 py-2 text-sm text-white" style={{ backgroundColor: 'rgba(15,23,42,0.85)' }}>
            Загрузка снимка NDVI...
          </div>
        </div>
      )}
      {error && (
        <div className="absolute left-3 right-3 top-3 px-3 py-2 text-sm" style={{ backgroundColor: '#fff7ed', color: '#9a3412', border: '1px solid #fdba74' }}>
          {error}
        </div>
      )}
      {sceneLabel && (
        <div className="absolute top-3 right-3 z-[500] text-xs px-2 py-1 rounded" style={{ backgroundColor: 'rgba(15,23,42,0.88)', color: '#e2e8f0' }}>
          {sceneLabel}
        </div>
      )}
    </div>
  );
}
