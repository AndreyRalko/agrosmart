'use client';

import { useState, FormEvent, ChangeEvent, useEffect } from 'react';
import { deleteAnimalBreed } from '@/lib/api/animal/breed';
import { buildApiUrl } from '@/lib/api/api-url';
import { useTranslation } from '@/lib/hooks/useTranslation';
import type { AnimalBreed, AnimalBreedUpdate } from '@/lib/types/animal/breed';

interface EditAnimalBreedSidebarProps {
  isOpen: boolean;
  breed: AnimalBreed | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditAnimalBreedSidebar({ isOpen, breed, onClose, onSuccess }: EditAnimalBreedSidebarProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<AnimalBreedUpdate>({
    name_ru: '',
    name_kk: '',
  });
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (breed && isOpen) {
      loadBreedDetail(breed.id);
    }
  }, [breed, isOpen]);

  const loadBreedDetail = async (id: number) => {
    setLoadingDetail(true);
    try {
      const token = localStorage.getItem('access_token');
      
      const [ruResponse, kkResponse] = await Promise.all([
        fetch(buildApiUrl(`animal/breed/${id}`), {
          headers: { 
            'Accept-Language': 'ru',
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch(buildApiUrl(`animal/breed/${id}`), {
          headers: { 
            'Accept-Language': 'kk',
            'Authorization': `Bearer ${token}`
          }
        })
      ]);

      const ruData = await ruResponse.json();
      const kkData = await kkResponse.json();

      setFormData({
        name_ru: ruData.name || '',
        name_kk: kkData.name || '',
      });
    } catch (err) {
      console.error('Failed to load breed detail:', err);
      setError('Не удалось загрузить данные породы');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!breed) return;

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');

      // Отправляем два отдельных PATCH запроса с разными языками
      await Promise.all([
        // Обновляем русское название
        fetch(buildApiUrl(`animal/breed/${breed.id}`), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Accept-Language': 'ru',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ name_ru: formData.name_ru })
        }),
        // Обновляем казахское название
        fetch(buildApiUrl(`animal/breed/${breed.id}`), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Accept-Language': 'kk',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ name_kk: formData.name_kk })
        })
      ]);

      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update animal breed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!breed || !confirm('Вы уверены что хотите удалить эту породу?')) return;

    setLoading(true);
    setError('');

    try {
      await deleteAnimalBreed(breed.id);
      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete animal breed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !breed) return null;

  return (
    <>
      
      <div 
        className="fixed inset-0 bg-black bg-opacity-40 z-40"
      />

      
      <div className="fixed inset-0 md:inset-auto md:right-0 md:top-0 md:h-screen md:w-[400px] bg-white md:border-l border-neutral-200 z-50 overflow-y-auto">
        <div className="p-6">
          
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900">Редактировать породу</h2>
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

          
          {loadingDetail ? (
            <div className="py-8 text-center">
              <p className="text-sm text-neutral-500">{t('loading')}</p>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Название (RU) {t('requiredField')}
                </label>
                <input
                  type="text"
                  name="name_ru"
                  value={formData.name_ru || ''}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Название (KK) {t('requiredField')}
                </label>
                <input
                  type="text"
                  name="name_kk"
                  value={formData.name_kk || ''}
                  onChange={handleChange}
                  required
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
                  {t('delete')} породу
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
          )}
        </div>
      </div>
    </>
  );
}