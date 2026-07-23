'use client';

import { useState, FormEvent } from 'react';
import { createIntegration } from '@/lib/api/integration/integration';
import { useTranslation } from '@/lib/hooks/useTranslation';
import {
  INTEGRATION_PROVIDERS,
  buildProviderConfig,
  type IntegrationProvider,
} from '@/lib/constants/integration-providers';
import type { IntegrationCreate } from '@/lib/types/integration/integration';

interface CreateIntegrationSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DEFAULT_EVERY_MINUTE = 15;

export default function CreateIntegrationSidebar({ isOpen, onClose, onSuccess }: CreateIntegrationSidebarProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name_ru: '',
    name_kk: '',
    icon: '',
    provider: '' as IntegrationProvider | '',
    apiKey: '',
    every_minute: DEFAULT_EVERY_MINUTE,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'every_minute' ? parseInt(value, 10) || DEFAULT_EVERY_MINUTE : value,
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.provider) {
      setError('Выберите провайдера');
      return;
    }
    if (!formData.apiKey.trim()) {
      setError('Укажите API-ключ');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const providerConfig = buildProviderConfig(formData.provider, formData.apiKey.trim());

      const submitData: IntegrationCreate = {
        name_ru: formData.name_ru,
        name_kk: formData.name_kk,
        type: 0,
        every_minute: formData.every_minute,
        ...providerConfig,
      };

      if (formData.icon && formData.icon.trim()) {
        submitData.icon = formData.icon.trim();
      }

      await createIntegration(submitData);
      onSuccess();
      onClose();

      setFormData({
        name_ru: '',
        name_kk: '',
        icon: '',
        provider: '',
        apiKey: '',
        every_minute: DEFAULT_EVERY_MINUTE,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create integration';
      if (message.toLowerCase().includes('uniq_integration_api') || message.includes('api')) {
        setError('Интеграция с этим провайдером уже существует. Можно создать только одну интеграцию на провайдера.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedProvider = INTEGRATION_PROVIDERS.find(p => p.value === formData.provider);

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-40 z-40" />

      <div className="fixed inset-0 md:inset-auto md:right-0 md:top-0 md:h-screen md:w-[400px] bg-white md:border-l border-neutral-200 z-50 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900">Создать интеграцию</h2>
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
                Провайдер {t('requiredField')}
              </label>
              <select
                name="provider"
                value={formData.provider}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
              >
                <option value="">Выберите провайдера</option>
                {INTEGRATION_PROVIDERS.map(provider => (
                  <option key={provider.value} value={provider.value}>
                    {provider.label}
                  </option>
                ))}
              </select>
              {selectedProvider && (
                <p className="mt-1 text-xs text-neutral-500">{selectedProvider.description}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                API-ключ {t('requiredField')}
              </label>
              <input
                type="password"
                name="apiKey"
                value={formData.apiKey}
                onChange={handleChange}
                required
                autoComplete="off"
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                placeholder={formData.provider === 'stormglass.io' ? 'Ключ из dashboard.stormglass.io' : 'Ключ из app.tomorrow.io'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Интервал обновления (мин)
              </label>
              <input
                type="number"
                name="every_minute"
                value={formData.every_minute}
                onChange={handleChange}
                min={15}
                step={1}
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
              />
              <p className="mt-1 text-xs text-neutral-500">Минимум 15 минут</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Название (RU) {t('requiredField')}
              </label>
              <input
                type="text"
                name="name_ru"
                value={formData.name_ru}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                placeholder="Например: Погода Tomorrow.io"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Название (KK) {t('requiredField')}
              </label>
              <input
                type="text"
                name="name_kk"
                value={formData.name_kk}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                placeholder="Например: Tomorrow.io ауа райы"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Иконка (необязательно)
              </label>
              <input
                type="text"
                name="icon"
                value={formData.icon}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                placeholder="Например: 🌤️"
              />
            </div>

            {formData.icon && (
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded">
                <div className="text-sm text-neutral-600 mb-1">Предпросмотр:</div>
                <div className="text-2xl">{formData.icon}</div>
              </div>
            )}

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
