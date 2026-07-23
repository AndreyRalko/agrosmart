'use client';

import { useState, FormEvent, ChangeEvent, useEffect } from 'react';
import { createPersonnel } from '@/lib/api/personnel';
import { getDepartments } from '@/lib/api/department';
import { getPositions } from '@/lib/api/position';
import { getLanguage } from '@/lib/api/client';
import { useTranslation } from '@/lib/hooks/useTranslation';
import type { CreatePersonnelData } from '@/lib/types/personnel';
import type { Department } from '@/lib/types/department';
import type { Position } from '@/lib/types/position';
import SearchableSelect from '@/components/SearchableSelect';

interface CreatePersonnelSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreatePersonnelSidebar({ isOpen, onClose, onSuccess }: CreatePersonnelSidebarProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<CreatePersonnelData>({
    password: '',
    email: '',
    lastname: '',
    firstname: '',
    patronymic: '',
    position_id: 0,
    department_id: 0,
    birth_date: '',
    hiring_date: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [departmentSearchTerm, setDepartmentSearchTerm] = useState('');
  const [positionSearchTerm, setPositionSearchTerm] = useState('');
  const [language, setLanguage] = useState('ru');

  useEffect(() => {
    if (isOpen) {
      setLanguage(getLanguage());
      loadDepartments();
      loadPositions();
    }
  }, [isOpen]);

  const loadDepartments = async () => {
    try {
      const data = await getDepartments();
      const list = Array.isArray(data) ? data : data.results || [];
      setDepartments(list);
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  };

  const loadPositions = async () => {
    try {
      const data = await getPositions();
      const list = Array.isArray(data) ? data : data.results || [];
      setPositions(list);
    } catch (err) {
      console.error('Failed to load positions:', err);
    }
  };

  const getDepartmentName = (dept: Department) => {
    return language === 'kk' ? dept.name_kk : dept.name_ru;
  };

  const getPositionName = (pos: Position) => {
    return language === 'kk' ? pos.name_kk : pos.name_ru;
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('_id') ? parseInt(value) : value,
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.department_id || !formData.position_id) {
      setError(t('selectDepartment') + ' и ' + t('selectPosition'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const dataToSend = { ...formData };
      if (!dataToSend.patronymic) {
        delete dataToSend.patronymic;
      }
      
      await createPersonnel(dataToSend);
      onSuccess();
      onClose();
      
      setFormData({
        password: '',
        email: '',
        lastname: '',
        firstname: '',
        patronymic: '',
        position_id: 0,
        department_id: 0,
        birth_date: '',
        hiring_date: '',
      });
      setDepartmentSearchTerm('');
      setPositionSearchTerm('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create personnel';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-40 z-40"
      />

      {/* Sidebar */}
      <div className="fixed inset-0 md:inset-auto md:right-0 md:top-0 md:h-screen md:w-[400px] bg-white md:border-l border-neutral-200 z-50 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900">{t('createPerson')}</h2>
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

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-600 text-red-800 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                {t('lastName')} {t('requiredField')}
              </label>
              <input
                type="text"
                name="lastname"
                value={formData.lastname}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                {t('firstName')} {t('requiredField')}
              </label>
              <input
                type="text"
                name="firstname"
                value={formData.firstname}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                {t('patronymic')}
              </label>
              <input
                type="text"
                name="patronymic"
                value={formData.patronymic}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                {t('email')} {t('requiredField')}
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                {t('password')} {t('requiredField')}
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                {t('birthDate')} {t('requiredField')}
              </label>
              <input
                type="date"
                name="birth_date"
                value={formData.birth_date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                {t('hiringDate')} {t('requiredField')}
              </label>
              <input
                type="date"
                name="hiring_date"
                value={formData.hiring_date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
              />
            </div>

            <SearchableSelect
              label={t('department')}
              required
              options={departments.map(dept => ({
                id: dept.id,
                label: getDepartmentName(dept)
              }))}
              value={departmentSearchTerm}
              onChange={(id, label) => {
                setFormData(prev => ({ ...prev, department_id: id }));
                setDepartmentSearchTerm(label);
              }}
              placeholder={t('searchPlaceholder')}
            />

            <SearchableSelect
              label={t('position')}
              required
              options={positions.map(pos => ({
                id: pos.id,
                label: getPositionName(pos)
              }))}
              value={positionSearchTerm}
              onChange={(id, label) => {
                setFormData(prev => ({ ...prev, position_id: id }));
                setPositionSearchTerm(label);
              }}
              placeholder={t('searchPlaceholder')}
            />

            {/* Actions */}
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