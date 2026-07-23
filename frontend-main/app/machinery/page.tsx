'use client';

import { useState, useEffect } from 'react';
import { getMachinery } from '@/lib/api/machinery/machinery';
import { getMachineryBrands } from '@/lib/api/machinery/brand';
import { getMachineryTypes } from '@/lib/api/machinery/type';
import { useTranslation } from '@/lib/hooks/useTranslation';
import type { Machinery } from '@/lib/types/machinery/machinery';
import type { MachineryBrand } from '@/lib/types/machinery/brand';
import type { MachineryType } from '@/lib/types/machinery/type';
import CreateMachinerySidebar from '@/components/machinery/CreateMachinerySidebar';
import EditMachinerySidebar from '@/components/machinery/EditMachinerySidebar';

export default function MachineryPage() {
  const { t } = useTranslation();
  const [machineryList, setMachineryList] = useState<Machinery[]>([]);
  const [brands, setBrands] = useState<MachineryBrand[]>([]);
  const [types, setTypes] = useState<MachineryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateSidebarOpen, setIsCreateSidebarOpen] = useState(false);
  const [isEditSidebarOpen, setIsEditSidebarOpen] = useState(false);
  const [selectedMachinery, setSelectedMachinery] = useState<Machinery | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Search filters
  const [searchGovNum, setSearchGovNum] = useState('');
  const [searchBrandId, setSearchBrandId] = useState('');
  const [searchTypeId, setSearchTypeId] = useState('');
  const [searchYear, setSearchYear] = useState('');

  useEffect(() => {
    loadMachinery();
    loadBrands();
    loadTypes();
  }, []);

  const loadMachinery = async (gov_num?: string) => {
    try {
      setLoading(true);
      const data = await getMachinery(gov_num);
      setMachineryList(data.results || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load machinery';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const loadBrands = async () => {
    try {
      const data = await getMachineryBrands();
      const list = Array.isArray(data) ? data : data.results || [];
      setBrands(list);
    } catch (err) {
      console.error('Failed to load brands:', err);
    }
  };

  const loadTypes = async () => {
    try {
      const data = await getMachineryTypes();
      const list = Array.isArray(data) ? data : data.results || [];
      setTypes(list);
    } catch (err) {
      console.error('Failed to load types:', err);
    }
  };

  const handleCreateSuccess = () => {
    loadMachinery();
  };

  const handleEditSuccess = () => {
    loadMachinery();
  };

  const handleEditClick = (machinery: Machinery) => {
    setSelectedMachinery(machinery);
    setIsEditSidebarOpen(true);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadMachinery(searchGovNum || undefined);
  };

  const handleClearSearch = () => {
    setSearchGovNum('');
    setSearchBrandId('');
    setSearchTypeId('');
    setSearchYear('');
    loadMachinery();
  };

  const toggleSort = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  // Client-side filtering
  const filteredMachinery = machineryList.filter(machinery => {
    if (searchBrandId && machinery.brand.id.toString() !== searchBrandId) return false;
    if (searchTypeId && machinery.type.id.toString() !== searchTypeId) return false;
    if (searchYear && machinery.year_production.toString() !== searchYear) return false;
    return true;
  });

  const sortedMachinery = [...filteredMachinery].sort((a, b) => {
    return sortOrder === 'asc' ? a.id - b.id : b.id - a.id;
  });

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-xl font-semibold text-neutral-900 mb-6">Техника</h1>
        <div className="bg-white border border-neutral-200 p-8">
          <p className="text-sm text-neutral-500">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-xl font-semibold text-neutral-900 mb-6">Техника</h1>
        <div className="bg-white border border-neutral-200 p-8">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-neutral-900">Техника</h1>
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

        <form onSubmit={handleSearch} className="bg-white border border-neutral-200 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Гос. номер
              </label>
              <input
                type="text"
                value={searchGovNum}
                onChange={(e) => setSearchGovNum(e.target.value)}
                placeholder="Поиск..."
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Бренд
              </label>
              <select
                value={searchBrandId}
                onChange={(e) => setSearchBrandId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
              >
                <option value="">Все</option>
                {brands.map(brand => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Тип
              </label>
              <select
                value={searchTypeId}
                onChange={(e) => setSearchTypeId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
              >
                <option value="">Все</option>
                {types.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Год выпуска
              </label>
              <input
                type="number"
                value={searchYear}
                onChange={(e) => setSearchYear(e.target.value)}
                placeholder="2024"
                min="1900"
                max={new Date().getFullYear() + 1}
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors"
            >
              Поиск
            </button>
            {(searchGovNum || searchBrandId || searchTypeId || searchYear) && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="px-4 py-2 border border-neutral-300 text-neutral-700 text-sm font-medium hover:bg-neutral-50 transition-colors"
              >
                Сбросить
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="md:hidden space-y-3">
        {sortedMachinery.map((machinery) => (
          <div key={machinery.id} className="bg-white border border-neutral-200 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="text-xs text-neutral-500 mb-1">ID: {machinery.id}</div>
                <div className="text-sm font-medium text-neutral-900">
                  {machinery.gov_num}
                </div>
              </div>
              <button
                onClick={() => handleEditClick(machinery)}
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
                <span className="text-neutral-500">Бренд:</span>{' '}
                <span className="text-neutral-900">{machinery.brand.name}</span>
              </div>
              <div>
                <span className="text-neutral-500">Тип:</span>{' '}
                <span className="text-neutral-900">{machinery.type.name}</span>
              </div>
              <div>
                <span className="text-neutral-500">Год:</span>{' '}
                <span className="text-neutral-900">{machinery.year_production}</span>
              </div>
            </div>
          </div>
        ))}

        {sortedMachinery.length === 0 && (
          <div className="bg-white border border-neutral-200 p-8 text-center text-sm text-neutral-500">
            {t('noData')}
          </div>
        )}
      </div>
      
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
                Гос. номер
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                Бренд
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                Тип
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                Год выпуска
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                {t('actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-neutral-200">
            {sortedMachinery.map((machinery) => (
              <tr key={machinery.id} className="hover:bg-neutral-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-neutral-900">{machinery.id}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-neutral-900">{machinery.gov_num}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-neutral-900">{machinery.brand.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-neutral-900">{machinery.type.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-neutral-900">{machinery.year_production}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleEditClick(machinery)}
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

        {sortedMachinery.length === 0 && (
          <div className="p-8 text-center text-sm text-neutral-500">
            {t('noData')}
          </div>
        )}
      </div>

      <CreateMachinerySidebar
        isOpen={isCreateSidebarOpen}
        onClose={() => setIsCreateSidebarOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      <EditMachinerySidebar
        isOpen={isEditSidebarOpen}
        machinery={selectedMachinery}
        onClose={() => setIsEditSidebarOpen(false)}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}