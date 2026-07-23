'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getIntegrations } from '@/lib/api/integration/integration';
import { useTranslation } from '@/lib/hooks/useTranslation';
import type { Integration } from '@/lib/types/integration/integration';
import { getProviderLabel } from '@/lib/constants/integration-providers';
import CreateIntegrationSidebar from '@/components/integration/CreateIntegrationSidebar';
import EditIntegrationSidebar from '@/components/integration/EditIntegrationSidebar';

export default function IntegrationsPage() {
  const { t } = useTranslation();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateSidebarOpen, setIsCreateSidebarOpen] = useState(false);
  const [isEditSidebarOpen, setIsEditSidebarOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const data = await getIntegrations();
      setIntegrations(data.results || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load integrations';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    loadIntegrations();
  };

  const handleEditSuccess = () => {
    loadIntegrations();
  };

  const handleEditClick = (integration: Integration) => {
    setSelectedIntegration(integration);
    setIsEditSidebarOpen(true);
  };

  const toggleSort = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const sortedIntegrations = [...integrations].sort((a, b) => {
    return sortOrder === 'asc' ? a.id - b.id : b.id - a.id;
  });

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-xl font-semibold text-neutral-900 mb-6">Интеграции</h1>
        <div className="bg-white border border-neutral-200 p-8">
          <p className="text-sm text-neutral-500">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-xl font-semibold text-neutral-900 mb-6">Интеграции</h1>
        <div className="bg-white border border-neutral-200 p-8">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Интеграции</h1>
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

      {/* Мобильная версия */}
      <div className="md:hidden space-y-3">
        {sortedIntegrations.map((integration) => (
          <div key={integration.id} className="bg-white border border-neutral-200 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="text-xs text-neutral-500 mb-1">ID: {integration.id}</div>
                <div className="flex items-center gap-2">
                  {integration.icon && (
                    <span className="text-lg">{integration.icon}</span>
                  )}
                  <div>
                    <div className="text-sm font-medium text-neutral-900">
                      <Link href={`/integration/${integration.id}`} className="hover:underline">
                        {integration.name}
                      </Link>
                    </div>
                    <div className="text-xs text-neutral-500 mt-0.5">
                      {getProviderLabel(integration.api)}
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleEditClick(integration)}
                className="text-neutral-600 hover:text-neutral-900 transition-colors ml-2"
                aria-label={t('edit')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
            <Link
              href={`/integration/${integration.id}`}
              className="block w-full text-center px-3 py-2 mt-3 border border-neutral-300 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Смотреть данные
            </Link>
          </div>
        ))}

        {sortedIntegrations.length === 0 && (
          <div className="bg-white border border-neutral-200 p-8 text-center text-sm text-neutral-500">
            {t('noData')}
          </div>
        )}
      </div>
      
      {/* Десктопная версия */}
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
                Иконка
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                Название
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                Провайдер
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                {t('actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-neutral-200">
            {sortedIntegrations.map((integration) => (
              <tr key={integration.id} className="hover:bg-neutral-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-neutral-900">{integration.id}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {integration.icon ? (
                    <span className="text-2xl">{integration.icon}</span>
                  ) : (
                    <span className="text-sm text-neutral-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link
                    href={`/integration/${integration.id}`}
                    className="text-sm font-medium text-neutral-900 hover:underline"
                  >
                    {integration.name}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-neutral-700">{getProviderLabel(integration.api)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/integration/${integration.id}`}
                      className="text-sm text-neutral-700 hover:text-neutral-900 hover:underline"
                    >
                      Данные
                    </Link>
                    <button
                      onClick={() => handleEditClick(integration)}
                      className="text-neutral-600 hover:text-neutral-900 transition-colors"
                      aria-label={t('edit')}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sortedIntegrations.length === 0 && (
          <div className="p-8 text-center text-sm text-neutral-500">
            {t('noData')}
          </div>
        )}
      </div>

      <CreateIntegrationSidebar
        isOpen={isCreateSidebarOpen}
        onClose={() => setIsCreateSidebarOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      <EditIntegrationSidebar
        isOpen={isEditSidebarOpen}
        integration={selectedIntegration}
        onClose={() => setIsEditSidebarOpen(false)}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}