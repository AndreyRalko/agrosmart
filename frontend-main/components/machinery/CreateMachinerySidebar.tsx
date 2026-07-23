'use client';

import { useState, FormEvent, ChangeEvent, useEffect } from 'react';
import { createMachinery } from '@/lib/api/machinery/machinery';
import { getMachineryBrands } from '@/lib/api/machinery/brand';
import { getMachineryTypes } from '@/lib/api/machinery/type';
import { getLanguage } from '@/lib/api/client';
import { useTranslation } from '@/lib/hooks/useTranslation';
import type { MachineryCreate } from '@/lib/types/machinery/machinery';
import type { MachineryBrand } from '@/lib/types/machinery/brand';
import type { MachineryType } from '@/lib/types/machinery/type';
import SearchableSelect from '@/components/SearchableSelect';

interface CreateMachinerySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateMachinerySidebar({ isOpen, onClose, onSuccess }: CreateMachinerySidebarProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<MachineryCreate>({
    brand_id: 0,
    type_id: 0,
    year_production: new Date().getFullYear(),
    gov_num: '',
  });
  const [brands, setBrands] = useState<MachineryBrand[]>([]);
  const [types, setTypes] = useState<MachineryType[]>([]);
  const [brandSearchTerm, setBrandSearchTerm] = useState('');
  const [typeSearchTerm, setTypeSearchTerm] = useState('');
  const [language, setLanguage] = useState('ru');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLanguage(getLanguage());
      loadBrands();
      loadTypes();
    }
  }, [isOpen]);

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

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'year_production' ? parseInt(value) || 0 : value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (formData.brand_id === 0) {
      setError('Выберите бренд');
      return;
    }
    
    if (formData.type_id === 0) {
      setError('Выберите тип техники');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createMachinery(formData);
      onSuccess();
      onClose();
      setFormData({
        brand_id: 0,
        type_id: 0,
        year_production: new Date().getFullYear(),
        gov_num: '',
      });
      setBrandSearchTerm('');
      setTypeSearchTerm('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create machinery';
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
            <h2 className="text-lg font-semibold text-neutral-900">Создать технику</h2>
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
              label="Бренд"
              options={brands.map(brand => ({
                id: brand.id,
                label: brand.name
              }))}
              value={brandSearchTerm}
              onChange={(id, label) => {
                setFormData(prev => ({ ...prev, brand_id: id }));
                setBrandSearchTerm(label);
              }}
              placeholder={t('search')}
              required
            />

            <SearchableSelect
              label="Тип техники"
              options={types.map(type => ({
                id: type.id,
                label: type.name
              }))}
              value={typeSearchTerm}
              onChange={(id, label) => {
                setFormData(prev => ({ ...prev, type_id: id }));
                setTypeSearchTerm(label);
              }}
              placeholder={t('search')}
              required
            />

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Год выпуска {t('requiredField')}
              </label>
              <input
                type="number"
                name="year_production"
                value={formData.year_production}
                onChange={handleChange}
                required
                min="1900"
                max={new Date().getFullYear() + 1}
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Гос. номер {t('requiredField')}
              </label>
              <input
                type="text"
                name="gov_num"
                value={formData.gov_num}
                onChange={handleChange}
                required
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