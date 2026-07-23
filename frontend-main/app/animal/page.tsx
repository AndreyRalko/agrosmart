'use client';

import { useState, useEffect } from 'react';
import { getAnimals } from '@/lib/api/animal/animal';
import { getAnimalBreeds } from '@/lib/api/animal/breed';
import { useTranslation } from '@/lib/hooks/useTranslation';
import type { Animal } from '@/lib/types/animal/animal';
import type { AnimalBreed } from '@/lib/types/animal/breed';
import CreateAnimalSidebar from '@/components/animal/CreateAnimalSidebar';
import EditAnimalSidebar from '@/components/animal/EditAnimalSidebar';

export default function AnimalsPage() {
  const { t } = useTranslation();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [breeds, setBreeds] = useState<AnimalBreed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateSidebarOpen, setIsCreateSidebarOpen] = useState(false);
  const [isEditSidebarOpen, setIsEditSidebarOpen] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Search filters
  const [searchTag, setSearchTag] = useState('');
  const [searchBreedId, setSearchBreedId] = useState('');

  useEffect(() => {
    loadAnimals();
    loadBreeds();
  }, []);

  const loadAnimals = async (tag?: string) => {
    try {
      setLoading(true);
      const data = await getAnimals(tag);
      setAnimals(data.results || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load animals';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const loadBreeds = async () => {
    try {
      const data = await getAnimalBreeds();
      const list = Array.isArray(data) ? data : data.results || [];
      setBreeds(list);
    } catch (err) {
      console.error('Failed to load breeds:', err);
    }
  };

  const handleCreateSuccess = () => {
    loadAnimals();
  };

  const handleEditSuccess = () => {
    loadAnimals();
  };

  const handleEditClick = (animal: Animal) => {
    setSelectedAnimal(animal);
    setIsEditSidebarOpen(true);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadAnimals(searchTag || undefined);
  };

  const handleClearSearch = () => {
    setSearchTag('');
    setSearchBreedId('');
    loadAnimals();
  };

  const toggleSort = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  // Client-side filtering
  const filteredAnimals = animals.filter(animal => {
    if (searchBreedId && animal.breed.id.toString() !== searchBreedId) return false;
    return true;
  });

  const sortedAnimals = [...filteredAnimals].sort((a, b) => {
    return sortOrder === 'asc' ? a.id - b.id : b.id - a.id;
  });

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-xl font-semibold text-neutral-900 mb-6">Животные</h1>
        <div className="bg-white border border-neutral-200 p-8">
          <p className="text-sm text-neutral-500">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-xl font-semibold text-neutral-900 mb-6">Животные</h1>
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
          <h1 className="text-xl font-semibold text-neutral-900">Животные</h1>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Метка (тег)
              </label>
              <input
                type="text"
                value={searchTag}
                onChange={(e) => setSearchTag(e.target.value)}
                placeholder="Поиск по тегу..."
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Порода
              </label>
              <select
                value={searchBreedId}
                onChange={(e) => setSearchBreedId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
              >
                <option value="">Все</option>
                {breeds.map(breed => (
                  <option key={breed.id} value={breed.id}>{breed.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors"
            >
              Поиск
            </button>
            {(searchTag || searchBreedId) && (
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
        {sortedAnimals.map((animal) => (
          <div key={animal.id} className="bg-white border border-neutral-200 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="text-xs text-neutral-500 mb-1">ID: {animal.id}</div>
                <div className="text-sm font-medium text-neutral-900">
                  Метка: {animal.tag}
                </div>
              </div>
              <button
                onClick={() => handleEditClick(animal)}
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
                <span className="text-neutral-500">Порода:</span>{' '}
                <span className="text-neutral-900">{animal.breed.name}</span>
              </div>
              <div>
                <span className="text-neutral-500">Дата рождения:</span>{' '}
                <span className="text-neutral-900">{animal.birthday}</span>
              </div>
              <div>
                <span className="text-neutral-500">Суточный удой:</span>{' '}
                <span className="text-neutral-900">{animal.daily_yield_litre} л</span>
              </div>
            </div>
          </div>
        ))}

        {sortedAnimals.length === 0 && (
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
                Метка
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                Порода
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                Дата рождения
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                Суточный удой (л)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                {t('actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-neutral-200">
            {sortedAnimals.map((animal) => (
              <tr key={animal.id} className="hover:bg-neutral-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-neutral-900">{animal.id}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-neutral-900">{animal.tag}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-neutral-900">{animal.breed.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-neutral-900">{animal.birthday}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-neutral-900">{animal.daily_yield_litre}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleEditClick(animal)}
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

        {sortedAnimals.length === 0 && (
          <div className="p-8 text-center text-sm text-neutral-500">
            {t('noData')}
          </div>
        )}
      </div>

      <CreateAnimalSidebar
        isOpen={isCreateSidebarOpen}
        onClose={() => setIsCreateSidebarOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      <EditAnimalSidebar
        isOpen={isEditSidebarOpen}
        animal={selectedAnimal}
        onClose={() => setIsEditSidebarOpen(false)}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}