'use client';

import { useState, useEffect } from 'react';
import { getMilkQualities } from '@/lib/api/animal/milk-quality';
import { getAnimals } from '@/lib/api/animal/animal';
import { useTranslation } from '@/lib/hooks/useTranslation';
import type { MilkQuality } from '@/lib/types/animal/milk-quality';
import type { Animal } from '@/lib/types/animal/animal';
import CreateMilkQualitySidebar from '@/components/animal/milk-quality/CreateMilkQualitySidebar';
import EditMilkQualitySidebar from '@/components/animal/milk-quality/EditMilkQualitySidebar';

export default function MilkQualityPage() {
  const { t } = useTranslation();
  const [milkQualities, setMilkQualities] = useState<MilkQuality[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateSidebarOpen, setIsCreateSidebarOpen] = useState(false);
  const [isEditSidebarOpen, setIsEditSidebarOpen] = useState(false);
  const [selectedMilkQuality, setSelectedMilkQuality] = useState<MilkQuality | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Search filters
  const [searchAnimalId, setSearchAnimalId] = useState('');
  const [searchDateFrom, setSearchDateFrom] = useState('');
  const [searchDateTo, setSearchDateTo] = useState('');

  useEffect(() => {
    loadMilkQualities();
    loadAnimals();
  }, []);

  const loadMilkQualities = async () => {
    try {
      setLoading(true);
      const data = await getMilkQualities();
      setMilkQualities(data.results || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load milk quality reports';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const loadAnimals = async () => {
    try {
      const data = await getAnimals();
      setAnimals(data.results || []);
    } catch (err) {
      console.error('Failed to load animals:', err);
    }
  };

  const handleCreateSuccess = () => {
    loadMilkQualities();
  };

  const handleEditSuccess = () => {
    loadMilkQualities();
  };

  const handleEditClick = (milkQuality: MilkQuality) => {
    setSelectedMilkQuality(milkQuality);
    setIsEditSidebarOpen(true);
  };

  const handleClearSearch = () => {
    setSearchAnimalId('');
    setSearchDateFrom('');
    setSearchDateTo('');
  };

  const toggleSort = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const getPersonName = (person: MilkQuality['person_created']) => {
    return `${person.lastname} ${person.firstname}${person.patronymic ? ' ' + person.patronymic : ''}`;
  };

  // Client-side filtering
  const filteredQualities = milkQualities.filter(quality => {
    if (searchAnimalId && quality.animal.id.toString() !== searchAnimalId) return false;
    if (searchDateFrom && quality.report_date < searchDateFrom) return false;
    if (searchDateTo && quality.report_date > searchDateTo) return false;
    return true;
  });

  const sortedQualities = [...filteredQualities].sort((a, b) => {
    return sortOrder === 'asc' ? a.id - b.id : b.id - a.id;
  });

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-xl font-semibold text-neutral-900 mb-6">Качество молока</h1>
        <div className="bg-white border border-neutral-200 p-8">
          <p className="text-sm text-neutral-500">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-xl font-semibold text-neutral-900 mb-6">Качество молока</h1>
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
          <h1 className="text-xl font-semibold text-neutral-900">Качество молока</h1>
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

        <div className="bg-white border border-neutral-200 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Животное
              </label>
              <select
                value={searchAnimalId}
                onChange={(e) => setSearchAnimalId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
              >
                <option value="">Все</option>
                {animals.map(animal => (
                  <option key={animal.id} value={animal.id}>
                    {animal.tag} ({animal.breed.name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Дата от
              </label>
              <input
                type="date"
                value={searchDateFrom}
                onChange={(e) => setSearchDateFrom(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Дата до
              </label>
              <input
                type="date"
                value={searchDateTo}
                onChange={(e) => setSearchDateTo(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
              />
            </div>
          </div>

          {(searchAnimalId || searchDateFrom || searchDateTo) && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClearSearch}
                className="px-4 py-2 border border-neutral-300 text-neutral-700 text-sm font-medium hover:bg-neutral-50 transition-colors"
              >
                Сбросить фильтры
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="md:hidden space-y-3">
        {sortedQualities.map((quality) => (
          <div key={quality.id} className="bg-white border border-neutral-200 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="text-xs text-neutral-500 mb-1">ID: {quality.id}</div>
                <div className="text-sm font-medium text-neutral-900">
                  {quality.animal.tag} ({quality.animal.breed.name})
                </div>
              </div>
              <button
                onClick={() => handleEditClick(quality)}
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
                <span className="text-neutral-500">Дата:</span>{' '}
                <span className="text-neutral-900">{quality.report_date}</span>
              </div>
              <div>
                <span className="text-neutral-500">Жирность:</span>{' '}
                <span className="text-neutral-900">{quality.fat_percent}%</span>
              </div>
              <div>
                <span className="text-neutral-500">Белок:</span>{' '}
                <span className="text-neutral-900">{quality.protein_percent}%</span>
              </div>
              <div>
                <span className="text-neutral-500">Создал:</span>{' '}
                <span className="text-neutral-900">{getPersonName(quality.person_created)}</span>
              </div>
            </div>
          </div>
        ))}

        {sortedQualities.length === 0 && (
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
                Животное
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                Дата отчета
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                Жирность (%)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                Белок (%)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                Создал
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                {t('actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-neutral-200">
            {sortedQualities.map((quality) => (
              <tr key={quality.id} className="hover:bg-neutral-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-neutral-900">{quality.id}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-neutral-900">
                    {quality.animal.tag}
                  </div>
                  <div className="text-xs text-neutral-500">{quality.animal.breed.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-neutral-900">{quality.report_date}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-neutral-900">{quality.fat_percent}%</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-neutral-900">{quality.protein_percent}%</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-neutral-900">{getPersonName(quality.person_created)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleEditClick(quality)}
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

        {sortedQualities.length === 0 && (
          <div className="p-8 text-center text-sm text-neutral-500">
            {t('noData')}
          </div>
        )}
      </div>

      <CreateMilkQualitySidebar
        isOpen={isCreateSidebarOpen}
        onClose={() => setIsCreateSidebarOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      <EditMilkQualitySidebar
        isOpen={isEditSidebarOpen}
        milkQuality={selectedMilkQuality}
        onClose={() => setIsEditSidebarOpen(false)}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}