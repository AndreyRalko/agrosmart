'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { getFields } from '@/lib/api/field/field';
import { useTranslation } from '@/lib/hooks/useTranslation';
import type { Field } from '@/lib/types/field/field';
import CreateFieldSidebar from '@/components/field/CreateFieldSidebar';
import EditFieldSidebar from '@/components/field/EditFieldSidebar';
import { DEFAULT_MAP_CENTER } from '@/lib/constants/map';

// Динамический импорт карты
const YandexMap = dynamic(() => import('@/components/maps/YandexMap'), {
  ssr: false,
  loading: () => <div className="w-full h-[500px] bg-neutral-100 animate-pulse rounded-lg" />
});

export default function FieldsPage() {
  const { t } = useTranslation();
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateSidebarOpen, setIsCreateSidebarOpen] = useState(false);
  const [isEditSidebarOpen, setIsEditSidebarOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<Field | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchNo, setSearchNo] = useState('');
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    loadFields();
  }, []);

  const loadFields = async (no?: string) => {
    try {
      setLoading(true);
      const data = await getFields(no);
      setFields(data.results || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load fields';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    loadFields();
  };

  const handleEditSuccess = () => {
    loadFields();
  };

  const handleEditClick = (field: Field) => {
    setSelectedField(field);
    setIsEditSidebarOpen(true);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadFields(searchNo || undefined);
  };

  const handleClearSearch = () => {
    setSearchNo('');
    loadFields();
  };

  const toggleSort = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const sortedFields = [...fields].sort((a, b) => {
    return sortOrder === 'asc' ? a.id - b.id : b.id - a.id;
  });

  // Функция для создания координат из пары lat/lon полей
  const makeCoordinates = (lat: string, lon: string): [number, number] | null => {
    try {
      const latNum = parseFloat(lat);
      const lonNum = parseFloat(lon);
      if (!isNaN(latNum) && !isNaN(lonNum) && latNum !== 0 && lonNum !== 0) {
        return [latNum, lonNum];
      }
    } catch (e) {
      console.error('Failed to parse coordinates:', lat, lon);
    }
    return null;
  };

  // Создаем маркеры и полигоны для карты
  const getMapData = () => {
    const polygons: Array<{
      coordinates: [number, number][];
      hint?: string;
      balloon?: string;
      fieldId: number;
    }> = [];

    fields.forEach(field => {
      const topLeft = makeCoordinates(field.pos_top_left_lat, field.pos_top_left_lon);
      const topRight = makeCoordinates(field.pos_top_right_lat, field.pos_top_right_lon);
      const bottomLeft = makeCoordinates(field.pos_bottom_left_lat, field.pos_bottom_left_lon);
      const bottomRight = makeCoordinates(field.pos_bottom_right_lat, field.pos_bottom_right_lon);

      if (topLeft && topRight && bottomLeft && bottomRight) {
        // Добавляем полигон поля
        polygons.push({
          coordinates: [topLeft, topRight, bottomRight, bottomLeft],
          hint: `Поле №${field.no}`,
          balloon: `<strong>Поле №${field.no}</strong><br/>Площадь: ${field.square} га<br/><em>Нажмите для редактирования</em>`,
          fieldId: field.id
        });
      }
    });

    return { polygons };
  };

  const mapData = getMapData();

  // Обработчик клика на полигон
  const handlePolygonClick = (fieldId: number) => {
    const field = fields.find(f => f.id === fieldId);
    if (field) {
      handleEditClick(field);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-xl font-semibold text-neutral-900 mb-6">Поля</h1>
        <div className="bg-white border border-neutral-200 p-8">
          <p className="text-sm text-neutral-500">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-xl font-semibold text-neutral-900 mb-6">Поля</h1>
        <div className="bg-white border border-neutral-200 p-8">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-neutral-900">Поля</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowMap(!showMap)}
              className="px-4 py-2 bg-white border border-neutral-300 text-neutral-700 text-sm font-medium hover:bg-neutral-50 flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              {showMap ? 'Скрыть карту' : 'Показать карту'}
            </button>
            <button
              onClick={() => setIsCreateSidebarOpen(true)}
              className="px-4 py-2 bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('create')}
            </button>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchNo}
              onChange={(e) => setSearchNo(e.target.value)}
              placeholder="Поиск по номеру поля..."
              className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors pr-8"
            />
            {searchNo && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors"
          >
            {t('search')}
          </button>
        </form>
      </div>

      {/* Карта */}
      {showMap && (
        <div className="mb-6 bg-white border border-neutral-200 p-4">
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
            💡 <strong>Совет:</strong> Нажмите на любое поле на карте, чтобы открыть его редактирование
          </div>
          <YandexMap
            center={DEFAULT_MAP_CENTER}
            zoom={13}
            polygons={mapData.polygons}
            height="500px"
            onPolygonClick={handlePolygonClick}
          />
        </div>
      )}

      {/* Мобильная версия */}
      <div className="md:hidden space-y-3">
        {sortedFields.map((field) => (
          <div key={field.id} className="bg-white border border-neutral-200 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="text-xs text-neutral-500 mb-1">ID: {field.id}</div>
                <div className="text-sm font-medium text-neutral-900">
                  Поле №{field.no}
                </div>
              </div>
              <button
                onClick={() => handleEditClick(field)}
                className="text-neutral-600 hover:text-neutral-900 transition-colors ml-2"
                aria-label={t('edit')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
            <div className="space-y-1 text-xs">
              <div>
                <span className="text-neutral-500">Площадь:</span>{' '}
                <span className="text-neutral-900">{field.square}</span>
              </div>
              <div className="mt-2 pt-2 border-t border-neutral-200">
                <div className="text-neutral-600 font-medium mb-1">Координаты:</div>
                <div className="grid grid-cols-2 gap-1">
                  <div>
                    <span className="text-neutral-500">Верх лево:</span>{' '}
                    <span className="text-neutral-900">{field.pos_top_left_lat}, {field.pos_top_left_lon}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Верх право:</span>{' '}
                    <span className="text-neutral-900">{field.pos_top_right_lat}, {field.pos_top_right_lon}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Низ лево:</span>{' '}
                    <span className="text-neutral-900">{field.pos_bottom_left_lat}, {field.pos_bottom_left_lon}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Низ право:</span>{' '}
                    <span className="text-neutral-900">{field.pos_bottom_right_lat}, {field.pos_bottom_right_lon}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {sortedFields.length === 0 && (
          <div className="bg-white border border-neutral-200 p-8 text-center text-sm text-neutral-500">
            {t('noData')}
          </div>
        )}
      </div>
      
      {/* Десктопная версия */}
      <div className="hidden md:block bg-white border border-neutral-200">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 transition-colors select-none"
                onClick={toggleSort}
              >
                <div className="flex items-center gap-2">
                  ID
                  <svg 
                    className={`w-4 h-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                Номер
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                Площадь
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                Координаты
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                {t('actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-neutral-200">
            {sortedFields.map((field) => (
              <tr key={field.id} className="hover:bg-neutral-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-neutral-900">{field.id}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-neutral-900">{field.no}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-neutral-900">{field.square}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-xs text-neutral-600 space-y-0.5">
                    <div>↖ {field.pos_top_left_lat}, {field.pos_top_left_lon} | ↗ {field.pos_top_right_lat}, {field.pos_top_right_lon}</div>
                    <div>↙ {field.pos_bottom_left_lat}, {field.pos_bottom_left_lon} | ↘ {field.pos_bottom_right_lat}, {field.pos_bottom_right_lon}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleEditClick(field)}
                    className="text-neutral-600 hover:text-neutral-900 transition-colors"
                    aria-label={t('edit')}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sortedFields.length === 0 && (
          <div className="p-8 text-center text-sm text-neutral-500">
            {t('noData')}
          </div>
        )}
      </div>

      <CreateFieldSidebar
        isOpen={isCreateSidebarOpen}
        onClose={() => setIsCreateSidebarOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      <EditFieldSidebar
        isOpen={isEditSidebarOpen}
        field={selectedField}
        onClose={() => setIsEditSidebarOpen(false)}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}