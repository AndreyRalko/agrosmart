'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { createVariety } from '@/lib/api/culture-operations/variety';
import { getCultures } from '@/lib/api/culture-operations/culture';
import { useTranslation } from '@/lib/hooks/useTranslation';
import type { VarietyCreate } from '@/lib/types/culture-operations/variety';
import type { Culture } from '@/lib/types/culture-operations/culture';
import CreateCultureModal from './CreateCultureModal';

interface CreateVarietyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type NpkKey = 'N' | 'P2O5' | 'K2O';

export default function CreateVarietyModal({ isOpen, onClose, onSuccess }: CreateVarietyModalProps) {
  const { t } = useTranslation();
  const [cultures, setCultures] = useState<Culture[]>([]);
  const [formData, setFormData] = useState({ culture: 0, name_ru: '', name_kk: '' });
  const [npk, setNpk] = useState<Record<NpkKey, string>>({ N: '', P2O5: '', K2O: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCreateCultureOpen, setIsCreateCultureOpen] = useState(false);
  const [cultureSearch, setCultureSearch] = useState('');
  const [isCultureDropdownOpen, setIsCultureDropdownOpen] = useState(false);
  const cultureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cultureRef.current && !cultureRef.current.contains(event.target as Node)) {
        setIsCultureDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    try {
      const culturesData = await getCultures();
      setCultures(culturesData.results || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleNpkChange = (key: NpkKey, value: string) => {
    setNpk(prev => ({ ...prev, [key]: value }));
    if (error) setError('');
  };

  const handleCultureCreated = async () => { await loadData(); };

  const handleCultureSelect = (culture: Culture) => {
    setFormData(prev => ({ ...prev, culture: culture.id }));
    setCultureSearch(culture.name);
    setIsCultureDropdownOpen(false);
  };

  const resetForm = () => {
    setFormData({ culture: 0, name_ru: '', name_kk: '' });
    setNpk({ N: '', P2O5: '', K2O: '' });
    setCultureSearch('');
    setError('');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const payload: VarietyCreate = {
      culture: formData.culture,
      name_ru: formData.name_ru,
      name_kk: formData.name_kk,
      options: {
        'npk-removal': {
          N: parseFloat(npk.N),
          P2O5: parseFloat(npk.P2O5),
          K2O: parseFloat(npk.K2O),
        },
      },
    };

    try {
      await createVariety(payload);
      onSuccess();
      onClose();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create variety');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredCultures = cultures.filter(c =>
    c.name.toLowerCase().includes(cultureSearch.toLowerCase())
  );
  const selectedCulture = cultures.find(c => c.id === formData.culture);
  const npkValid = (['N', 'P2O5', 'K2O'] as NpkKey[]).every(k => npk[k] !== '' && !isNaN(parseFloat(npk[k])));
  

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-neutral-900">Создать сорт</h2>
            <button onClick={onClose} className="text-neutral-500 hover:text-neutral-900 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-600 text-red-800 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Культура */}
            <div ref={cultureRef}>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Культура {t('requiredField')}
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={cultureSearch}
                    onChange={e => { setCultureSearch(e.target.value); setIsCultureDropdownOpen(true); }}
                    onFocus={() => setIsCultureDropdownOpen(true)}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                  />
                  {isCultureDropdownOpen && filteredCultures.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-300 max-h-60 overflow-y-auto z-10">
                      {filteredCultures.map(culture => (
                        <div key={culture.id} onClick={() => handleCultureSelect(culture)}
                          className={`px-3 py-2 text-sm cursor-pointer text-neutral-900 hover:bg-neutral-100 ${formData.culture === culture.id ? 'bg-neutral-100 font-medium' : ''}`}>
                          {culture.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => setIsCreateCultureOpen(true)}
                  className="px-4 py-2 bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Создать
                </button>
              </div>
              {selectedCulture && <div className="mt-1 text-xs text-neutral-500">Выбрано: {selectedCulture.name}</div>}
            </div>

            {/* Название RU */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Название (RU) {t('requiredField')}</label>
              <input type="text" name="name_ru" value={formData.name_ru} onChange={handleChange} required
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                placeholder="Например: Простая" />
            </div>

            {/* Название KK */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Название (KK) {t('requiredField')}</label>
              <input type="text" name="name_kk" value={formData.name_kk} onChange={handleChange} required
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                placeholder="Например: Жаймай" />
            </div>

            {/* NPK вынос */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Вынос NPK (кг/т урожая) <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-neutral-400 mb-2">Количество питательных веществ, выносимых с урожаем</p>
              <div className="grid grid-cols-3 gap-3">
                {(['N', 'P2O5', 'K2O'] as NpkKey[]).map(key => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-neutral-500 mb-1">{key}</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={npk[key]}
                      onChange={e => handleNpkChange(key, e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                      placeholder="0.00"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-neutral-300 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors">
                {t('cancel')}
              </button>
              <button type="submit" disabled={loading || !formData.culture || !npkValid}
                className="flex-1 px-4 py-2.5 bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors">
                {loading ? t('creating') : t('create')}
              </button>
            </div>
          </form>
        </div>
      </div>

      <CreateCultureModal
        isOpen={isCreateCultureOpen}
        onClose={() => setIsCreateCultureOpen(false)}
        onSuccess={handleCultureCreated}
      />
    </>
  );
}