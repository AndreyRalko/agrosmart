'use client';

import { useState, FormEvent, ChangeEvent, useEffect } from 'react';
import { createAnimal } from '@/lib/api/animal/animal';
import { getAnimalBreeds } from '@/lib/api/animal/breed';
import { useTranslation } from '@/lib/hooks/useTranslation';
import type { AnimalCreate } from '@/lib/types/animal/animal';
import type { AnimalBreed } from '@/lib/types/animal/breed';
import SearchableSelect from '@/components/SearchableSelect';

interface CreateAnimalSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateAnimalSidebar({ isOpen, onClose, onSuccess }: CreateAnimalSidebarProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<AnimalCreate>({
    breed_id: 0,
    birthday: '',
    tag: '',
    daily_yield_litre: 0,
  });
  const [breeds, setBreeds] = useState<AnimalBreed[]>([]);
  const [breedSearchTerm, setBreedSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadBreeds();
    }
  }, [isOpen]);

  const loadBreeds = async () => {
    try {
      const data = await getAnimalBreeds();
      const list = Array.isArray(data) ? data : data.results || [];
      setBreeds(list);
    } catch (err) {
      console.error('Failed to load breeds:', err);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'daily_yield_litre' ? parseFloat(value) || 0 : value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (formData.breed_id === 0) {
      setError('Выберите породу');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createAnimal(formData);
      onSuccess();
      onClose();
      setFormData({
        breed_id: 0,
        birthday: '',
        tag: '',
        daily_yield_litre: 0,
      });
      setBreedSearchTerm('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create animal';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      
      <div 
        className="fixed inset-0 bg-black bg-opacity-40 z-40"
      />

      
      <div className="fixed inset-0 md:inset-auto md:right-0 md:top-0 md:h-screen md:w-[400px] bg-white md:border-l border-neutral-200 z-50 overflow-y-auto">
        <div className="p-6">
          
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900">Создать животное</h2>
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
            <SearchableSelect
              label="Порода"
              options={breeds.map(breed => ({
                id: breed.id,
                label: breed.name
              }))}
              value={breedSearchTerm}
              onChange={(id, label) => {
                setFormData(prev => ({ ...prev, breed_id: id }));
                setBreedSearchTerm(label);
              }}
              placeholder={t('search')}
              required
            />

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Дата рождения {t('requiredField')}
              </label>
              <input
                type="date"
                name="birthday"
                value={formData.birthday}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Метка (тег) {t('requiredField')}
              </label>
              <input
                type="text"
                name="tag"
                value={formData.tag}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Суточный удой (литры) {t('requiredField')}
              </label>
              <input
                type="number"
                name="daily_yield_litre"
                value={formData.daily_yield_litre}
                onChange={handleChange}
                required
                min="0"
                step="0.1"
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
              />
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
                {loading ? t('creating') : t('create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}