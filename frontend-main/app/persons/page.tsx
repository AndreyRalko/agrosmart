'use client';

import { useEffect, useState } from 'react';
import { getPersonnel } from '@/lib/api/personnel';
import { useTranslation } from '@/lib/hooks/useTranslation';
import type { Personnel } from '@/lib/types/personnel';
import CreatePersonnelSidebar from '@/components/personnel/persons/CreatePersonnelSidebar';
import EditPersonnelSidebar from '@/components/personnel/persons/EditPersonnelSidebar';

export default function PersonsPage() {
  const { t } = useTranslation();
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateSidebarOpen, setIsCreateSidebarOpen] = useState(false);
  const [isEditSidebarOpen, setIsEditSidebarOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Personnel | null>(null);

  useEffect(() => {
    loadPersonnel();
  }, []);

  const loadPersonnel = async () => {
    try {
      setLoading(true);
      const data = await getPersonnel(100);
      setPersonnel(data.results);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load personnel';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    loadPersonnel();
  };

  const handleEditSuccess = () => {
    loadPersonnel();
  };

  const handleEditClick = (person: Personnel) => {
    setSelectedPerson(person);
    setIsEditSidebarOpen(true);
  };

  const getStatusLabel = (status: number) => {
    switch (status) {
      case 1: return t('active');
      case 2: return t('inactive');
      case 3: return t('fired');
      default: return t('unknown');
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 1: return 'text-green-600 bg-green-50';
      case 2: return 'text-yellow-600 bg-yellow-50';
      case 3: return 'text-red-600 bg-red-50';
      default: return 'text-neutral-600 bg-neutral-50';
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-xl font-semibold text-neutral-900 mb-6">{t('persons')}</h1>
        <div className="bg-white border border-neutral-200 p-8">
          <p className="text-sm text-neutral-500">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-xl font-semibold text-neutral-900 mb-6">{t('persons')}</h1>
        <div className="bg-white border border-neutral-200 p-8">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">{t('persons')}</h1>
        <button
          onClick={() => setIsCreateSidebarOpen(true)}
          className="px-4 py-2 bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 flex items-center gap-2 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">{t('create')}</span>
        </button>
      </div>
      
      <div className="md:hidden space-y-3">
        {personnel.map((person) => (
          <div key={person.id} className="bg-white border border-neutral-200 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="text-sm font-medium text-neutral-900">
                  {person.lastname} {person.firstname}
                </div>
                <div className="text-xs text-neutral-600 mt-1">{person.email}</div>
                <div className="mt-2">
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${getStatusColor(person.status)}`}>
                    {getStatusLabel(person.status)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleEditClick(person)}
                className="text-neutral-600 hover:text-neutral-900 transition-colors ml-2"
                aria-label={t('edit')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-neutral-500">{t('position')}:</span>{' '}
                <span className="text-neutral-900">{person.position.name}</span>
              </div>
              <div>
                <span className="text-neutral-500">{t('department')}:</span>{' '}
                <span className="text-neutral-900">{person.department.name}</span>
              </div>
              {person.firing_date ? (
                <div>
                  <span className="text-neutral-500">{t('firingDate')}:</span>{' '}
                  <span className="text-red-600">
                    {new Date(person.firing_date).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              ) : (
                <div>
                  <span className="text-neutral-500">{t('hiringDate')}:</span>{' '}
                  <span className="text-neutral-600">
                    {new Date(person.hiring_date).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}

        {personnel.length === 0 && (
          <div className="bg-white border border-neutral-200 p-8 text-center text-sm text-neutral-500">
            {t('noData')}
          </div>
        )}
      </div>

      <div className="hidden md:block bg-white border border-neutral-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                  {t('fullName')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                  {t('email')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                  {t('position')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                  {t('department')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                  {t('status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                  Дата
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {personnel.map((person) => (
                <tr key={person.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-neutral-900">
                      {person.lastname} {person.firstname} {person.patronymic || ''}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-neutral-600">{person.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-neutral-900">{person.position.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-neutral-900">{person.department.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${getStatusColor(person.status)}`}>
                      {getStatusLabel(person.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {person.firing_date ? (
                      <div className="text-sm text-red-600">
                        {new Date(person.firing_date).toLocaleDateString('ru-RU')}
                      </div>
                    ) : (
                      <div className="text-sm text-neutral-600">
                        {new Date(person.hiring_date).toLocaleDateString('ru-RU')}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleEditClick(person)}
                      className="text-neutral-600 hover:text-neutral-900 transition-colors"
                      aria-label={t('edit')}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {personnel.length === 0 && (
            <div className="p-8 text-center text-sm text-neutral-500">
              {t('noData')}
            </div>
          )}
        </div>
      </div>

      <CreatePersonnelSidebar
        isOpen={isCreateSidebarOpen}
        onClose={() => setIsCreateSidebarOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      <EditPersonnelSidebar
        isOpen={isEditSidebarOpen}
        person={selectedPerson}
        onClose={() => setIsEditSidebarOpen(false)}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}