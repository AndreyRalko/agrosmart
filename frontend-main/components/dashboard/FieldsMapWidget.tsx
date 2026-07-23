'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getFields } from '@/lib/api/field/field';
import { buildFieldPolygons, type FieldMapPolygon } from '@/lib/utils/field-map';
import { DEFAULT_MAP_CENTER } from '@/lib/constants/map';

const YandexMap = dynamic(() => import('@/components/maps/YandexMap'), {
  ssr: false,
  loading: () => <div className="w-full h-[420px] bg-neutral-100 animate-pulse rounded-lg" />,
});

export default function FieldsMapWidget() {
  const router = useRouter();
  const [polygons, setPolygons] = useState<FieldMapPolygon[]>([]);
  const [fieldCount, setFieldCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFields();
  }, []);

  const loadFields = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getFields();
      const fields = data.results || [];
      setFieldCount(fields.length);
      setPolygons(buildFieldPolygons(fields));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось загрузить поля';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-neutral-900">Поля</h2>
        <Link
          href="/fields"
          className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          Все поля →
        </Link>
      </div>

      <div className="bg-white border border-neutral-200 p-4">
        {loading && (
          <div className="w-full h-[420px] bg-neutral-100 animate-pulse rounded-lg" />
        )}

        {error && !loading && (
          <p className="text-sm text-red-600 py-8 text-center">{error}</p>
        )}

        {!loading && !error && fieldCount === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-neutral-500 mb-3">Поля ещё не добавлены</p>
            <Link
              href="/fields"
              className="text-sm font-medium text-neutral-900 hover:underline"
            >
              Перейти к полям
            </Link>
          </div>
        )}

        {!loading && !error && fieldCount > 0 && polygons.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-neutral-500 mb-3">
              У полей нет координат для отображения на карте
            </p>
            <Link
              href="/fields"
              className="text-sm font-medium text-neutral-900 hover:underline"
            >
              Настроить координаты
            </Link>
          </div>
        )}

        {!loading && !error && polygons.length > 0 && (
          <>
            <YandexMap
              center={DEFAULT_MAP_CENTER}
              zoom={13}
              polygons={polygons}
              height="420px"
              onPolygonClick={() => router.push('/fields')}
            />
            <p className="text-xs text-neutral-500 mt-3">
              На карте: {polygons.length} из {fieldCount} полей. Нажмите на поле, чтобы перейти к списку.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
