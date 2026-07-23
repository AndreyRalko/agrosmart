'use client';

import { useState, FormEvent, useEffect } from 'react';
import { getCulture, updateCulture, deleteCulture } from '@/lib/api/culture-operations/culture';
import { getLanguage } from '@/lib/api/client';
import { useTranslation } from '@/lib/hooks/useTranslation';
import type { Culture, CultureUpdate } from '@/lib/types/culture-operations/culture';

interface EditCultureModalProps {
  isOpen: boolean;
  culture: Culture | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditCultureModal({ isOpen, culture, onClose, onSuccess }: EditCultureModalProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<CultureUpdate>({
    name_ru: '',
    name_kk: '',
  });
  const [loading, setLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (culture && isOpen) {
      loadCultureDetails();
    }
  }, [culture?.id, isOpen]);

  const loadCultureDetails = async () => {
    if (!culture) return;
    
    setLoadingDetails(true);
    setError('');
    
    try {
      const details = await getCulture(culture.id);
      setFormData({
        name_ru: details.name_ru,
        name_kk: details.name_kk,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load culture details';
      setError(message);
      
      if (culture) {
        setFormData({
          name_ru: culture.name_ru,
          name_kk: culture.name_kk,
        });
      }
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!culture) return;

    setLoading(true);
    setError('');

    try {
      const currentLang = getLanguage();
      
      // Отправляем только то поле которое редактировали
      const updateData: Partial<CultureUpdate> = {};
      
      // Добавляем только нужное поле локализации
      if (currentLang === 'kk') {
        updateData.name_kk = formData.name_kk;
      } else {
        updateData.name_ru = formData.name_ru;
      }

      await updateCulture(culture.id, updateData as CultureUpdate);
      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update culture';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!culture || !confirm('Вы уверены что хотите удалить эту культуру?')) return;

    setLoading(true);
    setError('');

    try {
      await deleteCulture(culture.id);
      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete culture';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !culture) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
    >
      <div 
        className="bg-white w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-900">Редактировать культуру</h2>
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

        {loadingDetails ? (
          <div className="py-8 text-center">
            <div className="inline-block animate-spin h-8 w-8 border-b-2 border-neutral-900"></div>
            <p className="mt-2 text-sm text-neutral-500">Загрузка...</p>
          </div>
        ) : (
          <>
            <div className="mb-4 p-3 bg-neutral-50 border border-neutral-200 text-sm">
              <div className="font-medium text-neutral-900 mb-1">Текущее название:</div>
              <div className="text-neutral-700">{culture.name}</div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Название
                </label>
                <input
                  type="text"
                  name={getLanguage() === 'kk' ? 'name_kk' : 'name_ru'}
                  value={getLanguage() === 'kk' ? (formData.name_kk || '') : (formData.name_ru || '')}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                  placeholder="Введите название"
                />
              </div>

              <div className="pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="w-full px-4 py-2.5 bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors disabled:bg-neutral-100 disabled:text-neutral-400"
                >
                  {t('delete')} культуру
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
          </>
        )}
      </div>
    </div>
  );
}