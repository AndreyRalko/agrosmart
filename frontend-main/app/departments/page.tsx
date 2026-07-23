'use client';

import { useState, useEffect } from 'react';
import { getDepartments } from '@/lib/api/department';
import { getLanguage } from '@/lib/api/client';
import { useTranslation } from '@/lib/hooks/useTranslation';
import type { Department } from '@/lib/types/department';
import CreateDepartmentSidebar from '@/components/personnel/departments/CreateDepartmentSidebar';
import EditDepartmentSidebar from '@/components/personnel/departments/EditDepartmentSidebar';

export default function DepartmentsPage() {
  const { t } = useTranslation();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateSidebarOpen, setIsCreateSidebarOpen] = useState(false);
  const [isEditSidebarOpen, setIsEditSidebarOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [language, setLanguage] = useState('ru');

  useEffect(() => {
    setLanguage(getLanguage());
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const data = await getDepartments();
      const departmentsList = Array.isArray(data) ? data : data.results || [];
      setDepartments(departmentsList);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load departments';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    loadDepartments();
  };

  const handleEditSuccess = () => {
    loadDepartments();
  };

  const handleEditClick = (department: Department) => {
    setSelectedDepartment(department);
    setIsEditSidebarOpen(true);
  };

  const toggleSort = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const sortedDepartments = [...departments].sort((a, b) => {
    return sortOrder === 'asc' ? a.id - b.id : b.id - a.id;
  });

  const getDepartmentName = (dept: Department) => {
    return language === 'kk' ? dept.name_kk : dept.name_ru;
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-xl font-semibold text-neutral-900 mb-6">{t('departments')}</h1>
        <div className="bg-white border border-neutral-200 p-8">
          <p className="text-sm text-neutral-500">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-xl font-semibold text-neutral-900 mb-6">{t('departments')}</h1>
        <div className="bg-white border border-neutral-200 p-8">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">{t('departments')}</h1>
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
      
      <div className="md:hidden space-y-3">
        {sortedDepartments.map((department) => (
          <div key={department.id} className="bg-white border border-neutral-200 p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-xs text-neutral-500 mb-1">ID: {department.id}</div>
                <div className="text-sm font-medium text-neutral-900">
                  {getDepartmentName(department)}
                </div>
              </div>
              <button
                onClick={() => handleEditClick(department)}
                className="text-neutral-600 hover:text-neutral-900 transition-colors ml-2"
                aria-label={t('edit')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
          </div>
        ))}

        {departments.length === 0 && (
          <div className="bg-white border border-neutral-200 p-8 text-center text-sm text-neutral-500">
            {t('noData')}
          </div>
        )}
      </div>

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
                {t('departmentName')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                {t('actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-neutral-200">
            {sortedDepartments.map((department) => (
              <tr key={department.id} className="hover:bg-neutral-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-neutral-900">{department.id}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-neutral-900">
                    {getDepartmentName(department)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleEditClick(department)}
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

        {departments.length === 0 && (
          <div className="p-8 text-center text-sm text-neutral-500">
            {t('noData')}
          </div>
        )}
      </div>

      <CreateDepartmentSidebar
        isOpen={isCreateSidebarOpen}
        onClose={() => setIsCreateSidebarOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      <EditDepartmentSidebar
        isOpen={isEditSidebarOpen}
        department={selectedDepartment}
        onClose={() => setIsEditSidebarOpen(false)}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}