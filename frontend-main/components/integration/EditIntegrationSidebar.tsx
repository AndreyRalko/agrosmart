'use client';

import { useState, FormEvent, useEffect } from 'react';
import { getIntegration, updateIntegration, deleteIntegration } from '@/lib/api/integration/integration';
import { useTranslation } from '@/lib/hooks/useTranslation';
import {
  INTEGRATION_PROVIDERS,
  buildProviderConfig,
  extractApiKey,
  type IntegrationProvider,
} from '@/lib/constants/integration-providers';
import type { Integration, IntegrationUpdate } from '@/lib/types/integration/integration';

interface EditIntegrationSidebarProps {
  isOpen: boolean;
  integration: Integration | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditIntegrationSidebar({ isOpen, integration, onClose, onSuccess }: EditIntegrationSidebarProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name_ru: '',
    name_kk: '',
    icon: '',
    provider: '' as IntegrationProvider | '',
    apiKey: '',
    every_minute: 15,
  });
  const [hasStoredApiKey, setHasStoredApiKey] = useState(false);
  const [storedApiKey, setStoredApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (integration && isOpen) {
      loadIntegrationDetails();
    }
  }, [integration?.id, isOpen]);

  const loadIntegrationDetails = async () => {
    if (!integration) return;

    setLoadingDetails(true);
    setError('');

    try {
      const details = await getIntegration(integration.id);
      const storedKey = extractApiKey(details.api, details.headers_hard);

      setFormData({
        name_ru: details.name_ru || '',
        name_kk: details.name_kk || '',
        icon: details.icon || '',
        provider: (details.api as IntegrationProvider) || '',
        apiKey: '',
        every_minute: details.every_minute || 15,
      });
      setStoredApiKey(storedKey);
      setHasStoredApiKey(!!storedKey);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load integration details';
      setError(message);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'every_minute' ? parseInt(value, 10) || 15 : value,
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!integration) return;

    if (!formData.provider) {
      setError('Выберите провайдера');
      return;
    }
    if (!hasStoredApiKey && !formData.apiKey.trim()) {
      setError('Укажите API-ключ');
      return;
    }

    const apiKeyToUse = formData.apiKey.trim() || storedApiKey;
    if (!apiKeyToUse) {
      setError('Укажите API-ключ');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const submitData: IntegrationUpdate = {
        name_ru: formData.name_ru,
        name_kk: formData.name_kk,
        icon: formData.icon.trim() || undefined,
        every_minute: formData.every_minute,
        ...buildProviderConfig(formData.provider, apiKeyToUse),
      };

      await updateIntegration(integration.id, submitData);
      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update integration';
      if (message.toLowerCase().includes('uniq_integration_api') || message.includes('api')) {
        setError('Интеграция с этим провайдером уже существует.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!integration || !confirm('Вы уверены что хотите удалить эту интеграцию?')) return;

    setLoading(true);
    setError('');

    try {
      await deleteIntegration(integration.id);
      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete integration';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !integration) return null;

  const selectedProvider = INTEGRATION_PROVIDERS.find(p => p.value === formData.provider);

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-40 z-40" />

      <div className="fixed inset-0 md:inset-auto md:right-0 md:top-0 md:h-screen md:w-[400px] bg-white md:border-l border-neutral-200 z-50 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900">Редактировать интеграцию</h2>
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
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
              <p className="mt-2 text-sm text-neutral-500">Загрузка...</p>
            </div>
          ) : (
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
                  API-ключ {!hasStoredApiKey && t('requiredField')}
                </label>
                <input
                  type="password"
                  name="apiKey"
                  value={formData.apiKey}
                  onChange={handleChange}
                  autoComplete="off"
                  className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                  placeholder={hasStoredApiKey ? 'Ключ сохранён — оставьте пустым, чтобы не менять' : 'Введите API-ключ'}
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
                  Название (RU)
                </label>
                <input
                  type="text"
                  name="name_ru"
                  value={formData.name_ru}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                  placeholder="Например: Погода Tomorrow.io"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Название (KK)
                </label>
                <input
                  type="text"
                  name="name_kk"
                  value={formData.name_kk}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                  placeholder="Например: Tomorrow.io ауа райы"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Иконка
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

              <div className="pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="w-full px-4 py-2.5 bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors disabled:bg-neutral-100 disabled:text-neutral-400"
                >
                  {t('delete')} интеграцию
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
