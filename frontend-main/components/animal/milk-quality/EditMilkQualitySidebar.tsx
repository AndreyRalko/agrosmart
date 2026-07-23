'use client';

import { useState, FormEvent, ChangeEvent, useEffect } from 'react';
import { updateMilkQuality, deleteMilkQuality } from '@/lib/api/animal/milk-quality';
import { getAnimals } from '@/lib/api/animal/animal';
import { useTranslation } from '@/lib/hooks/useTranslation';
import type { MilkQuality, MilkQualityUpdate } from '@/lib/types/animal/milk-quality';
import type { Animal } from '@/lib/types/animal/animal';
import SearchableSelect from '@/components/SearchableSelect';

interface EditMilkQualitySidebarProps {
  isOpen: boolean;
  milkQuality: MilkQuality | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditMilkQualitySidebar({ isOpen, milkQuality, onClose, onSuccess }: EditMilkQualitySidebarProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<MilkQualityUpdate>({
    animal_id: 0,
    fat_percent: 0,
    protein_percent: 0,
    report_date: '',
  });
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [animalSearchTerm, setAnimalSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadAnimals();
    }
  }, [isOpen]);

  useEffect(() => {
    if (milkQuality) {
      setFormData({
        animal_id: milkQuality.animal.id,
        fat_percent: milkQuality.fat_percent,
        protein_percent: milkQuality.protein_percent,
        report_date: milkQuality.report_date,
      });
      setAnimalSearchTerm(`${milkQuality.animal.tag} (${milkQuality.animal.breed.name})`);
    }
  }, [milkQuality]);

  const loadAnimals = async () => {
    try {
      const data = await getAnimals();
      setAnimals(data.results || []);
    } catch (err) {
      console.error('Failed to load animals:', err);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'fat_percent' || name === 'protein_percent' 
        ? parseFloat(value) || 0 
        : value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!milkQuality) return;

    setLoading(true);
    setError('');

    try {
      await updateMilkQuality(milkQuality.id, formData);
      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update milk quality report';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!milkQuality || !confirm('Вы уверены что хотите удалить этот отчет?')) return;

    setLoading(true);
    setError('');

    try {
      await deleteMilkQuality(milkQuality.id);
      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete milk quality report';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !milkQuality) return null;

  const getPersonName = (person: MilkQuality['person_created']) => {
    return `${person.lastname} ${person.firstname}${person.patronymic ? ' ' + person.patronymic : ''}`;
  };

  return (
    <>
      
      <div 
        className="fixed inset-0 bg-black bg-opacity-40 z-40"
      />

      
      <div className="fixed inset-0 md:inset-auto md:right-0 md:top-0 md:h-screen md:w-[400px] bg-white md:border-l border-neutral-200 z-50 overflow-y-auto">
        <div className="p-6">
          
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900">Редактировать отчет</h2>
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

          
          <div className="mb-4 p-3 bg-neutral-50 border-l-4 border-neutral-300 text-sm space-y-1">
            <div>
              <span className="text-neutral-500">Создал:</span>{' '}
              <span className="text-neutral-900">{getPersonName(milkQuality.person_created)}</span>
            </div>
            {milkQuality.person_updated && (
              <div>
                <span className="text-neutral-500">Обновил:</span>{' '}
                <span className="text-neutral-900">{getPersonName(milkQuality.person_updated)}</span>
              </div>
            )}
          </div>

          
          <form onSubmit={handleSubmit} className="space-y-4">
            <SearchableSelect
              label="Животное"
              options={animals.map(animal => ({
                id: animal.id,
                label: `${animal.tag} (${animal.breed.name})`
              }))}
              value={animalSearchTerm}
              onChange={(id, label) => {
                setFormData(prev => ({ ...prev, animal_id: id }));
                setAnimalSearchTerm(label);
              }}
              placeholder={t('search')}
              required
            />

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Дата отчета {t('requiredField')}
              </label>
              <input
                type="date"
                name="report_date"
                value={formData.report_date || ''}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Жирность (%) {t('requiredField')}
              </label>
              <input
                type="number"
                name="fat_percent"
                value={formData.fat_percent || ''}
                onChange={handleChange}
                required
                min="0"
                max="100"
                step="0.1"
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Белок (%) {t('requiredField')}
              </label>
              <input
                type="number"
                name="protein_percent"
                value={formData.protein_percent || ''}
                onChange={handleChange}
                required
                min="0"
                max="100"
                step="0.1"
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
              />
            </div>

            <div className="pt-4 border-t border-neutral-200">
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="w-full px-4 py-2.5 bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors disabled:bg-neutral-100 disabled:text-neutral-400"
              >
                {t('delete')} отчет
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