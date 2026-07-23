'use client';

import { useState, FormEvent, ChangeEvent, useEffect } from 'react';
import { updateMachineryBrand, deleteMachineryBrand } from '@/lib/api/machinery/brand';
import { useTranslation } from '@/lib/hooks/useTranslation';
import type { MachineryBrand, MachineryBrandUpdate } from '@/lib/types/machinery/brand';

interface EditMachineryBrandSidebarProps {
  isOpen: boolean;
  brand: MachineryBrand | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditMachineryBrandSidebar({ isOpen, brand, onClose, onSuccess }: EditMachineryBrandSidebarProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<MachineryBrandUpdate>({
    name: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (brand) {
      setFormData({
        name: brand.name,
      });
    }
  }, [brand]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!brand) return;

    setLoading(true);
    setError('');

    try {
      await updateMachineryBrand(brand.id, formData);
      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update machinery brand';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!brand || !confirm('Вы уверены что хотите удалить этот бренд?')) return;

    setLoading(true);
    setError('');

    try {
      await deleteMachineryBrand(brand.id);
      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete machinery brand';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !brand) return null;

  return (
    <>
      
      <div 
        className="fixed inset-0 bg-black bg-opacity-40 z-40"
      />

      
      <div className="fixed inset-0 md:inset-auto md:right-0 md:top-0 md:h-screen md:w-[400px] bg-white md:border-l border-neutral-200 z-50 overflow-y-auto">
        <div className="p-6">
          
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900">Редактировать бренд</h2>
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
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Название {t('requiredField')}
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
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
                {t('delete')} бренд
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