'use client';

import { useState, FormEvent, ChangeEvent, useEffect } from 'react';
import { updatePersonnel } from '@/lib/api/personnel';
import { getDepartments } from '@/lib/api/department';
import { getPositions } from '@/lib/api/position';
import { getLanguage } from '@/lib/api/client';
import type { Personnel, UpdatePersonnelData } from '@/lib/types/personnel';
import type { Department } from '@/lib/types/department';
import type { Position } from '@/lib/types/position';
import SearchableSelect from '@/components/SearchableSelect';

interface EditPersonnelSidebarProps {
  isOpen: boolean;
  person: Personnel | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditPersonnelSidebar({ isOpen, person, onClose, onSuccess }: EditPersonnelSidebarProps) {
  const [formData, setFormData] = useState<UpdatePersonnelData>({});
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set());
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

  useEffect(() => {
    if (person) {
      setFormData({
        email: person.email,
        lastname: person.lastname,
        firstname: person.firstname,
        patronymic: person.patronymic || '',
        position_id: person.position.id,
        department_id: person.department.id,
        birth_date: person.birth_date,
        hiring_date: person.hiring_date,
        firing_date: person.firing_date || '',
        status: person.status,
      });
      // person.department.name и person.position.name - динамические поля от бэка
      setDepartmentSearchTerm(person.department.name || '');
      setPositionSearchTerm(person.position.name || '');
      setChangedFields(new Set());
    }
  }, [person]);

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
    
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: name.includes('_id') || name === 'status' ? parseInt(value) : value,
      };

      // Если установлена дата увольнения, автоматически ставим статус "Уволен"
      if (name === 'firing_date' && value) {
        updated.status = 3;
        setChangedFields(prev => new Set(prev).add('status'));
      }

      return updated;
    });
    
    setChangedFields(prev => new Set(prev).add(name));
    
    if (error) setError('');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!person) return;

    setLoading(true);
    setError('');

    try {
      const dataToSend: UpdatePersonnelData = {};
      
      changedFields.forEach(fieldName => {
        const k = fieldName as keyof UpdatePersonnelData;
        const value = formData[k];
        
        // Определяем оригинальное значение
        let originalValue: any;
        
        if (k === 'department_id') {
          originalValue = person.department.id;
        } else if (k === 'position_id') {
          originalValue = person.position.id;
        } else if (k === 'firing_date') {
          originalValue = person.firing_date || '';
        } else if (k === 'patronymic') {
          originalValue = person.patronymic || '';
        } else if (k in person) {
          originalValue = person[k as keyof Personnel];
        }
        
        // Добавляем только если значение действительно изменилось
        if (value !== originalValue) {
          if (k === 'firing_date') {
            // Для firing_date: если пустая строка, отправляем null
            dataToSend.firing_date = value ? (value as string) : null;
          } else if (value !== undefined && value !== '' && value !== null) {
            dataToSend[k] = value as any;
          }
        }
      });

      // Если есть firing_date, обязательно добавляем status=3
      if (dataToSend.firing_date) {
        dataToSend.status = 3;
      }

      // Если нет изменений, просто закрываем
      if (Object.keys(dataToSend).length === 0) {
        handleClose();
        return;
      }
      
      await updatePersonnel(person.id, dataToSend);
      onSuccess();
      handleClose();
    } catch (err) {
      console.error('Update error:', err);
      const message = err instanceof Error ? err.message : 'Failed to update personnel';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setChangedFields(new Set());
    setError('');
    onClose();
  };

  if (!isOpen || !person) return null;

  return (
    <>
      
      <div 
        className="fixed inset-0 bg-black bg-opacity-40 z-40"
        onClick={handleClose}
      />

      
      <div className="fixed inset-0 md:inset-auto md:right-0 md:top-0 md:h-screen md:w-[400px] bg-white md:border-l border-neutral-200 z-50 overflow-y-auto">
        <div className="p-6">
          
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900">Редактировать персону</h2>
            <button
              onClick={handleClose}
              className="text-neutral-500 hover:text-neutral-900 transition-colors"
              aria-label="Close"
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
                Фамилия
              </label>
              <input
                type="text"
                name="lastname"
                value={formData.lastname || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Имя
              </label>
              <input
                type="text"
                name="firstname"
                value={formData.firstname || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Отчество
              </label>
              <input
                type="text"
                name="patronymic"
                value={formData.patronymic || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Новый пароль
              </label>
              <input
                type="password"
                name="password"
                value={formData.password || ''}
                onChange={handleChange}
                placeholder="Оставьте пустым, чтобы не менять"
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 transition-colors"
              />
            </div>

            <SearchableSelect
                label="Департамент"
                options={departments.map(dept => ({
                  id: dept.id,
                  label: getDepartmentName(dept)
                }))}
                value={departmentSearchTerm}
                onChange={(id, label) => {
                  setFormData(prev => ({ ...prev, department_id: id }));
                  setDepartmentSearchTerm(label);
                  setChangedFields(prev => new Set(prev).add('department_id'));
                }}
                placeholder="Начните вводить название..."
                disabled={person.status === 3}  // Добавь эту строку
              />

              <SearchableSelect
                label="Позиция"
                options={positions.map(pos => ({
                  id: pos.id,
                  label: getPositionName(pos)
                }))}
                value={positionSearchTerm}
                onChange={(id, label) => {
                  setFormData(prev => ({ ...prev, position_id: id }));
                  setPositionSearchTerm(label);
                  setChangedFields(prev => new Set(prev).add('position_id'));
                }}
                placeholder="Начните вводить название..."
                disabled={person.status === 3}  // Добавь эту строку
              />

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Статус
              </label>
              <select
                name="status"
                value={formData.status || person.status}
                onChange={handleChange}
                disabled={!!formData.firing_date}
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors disabled:bg-neutral-100 disabled:text-neutral-500"
              >
                <option value={1}>Активен</option>
                <option value={2}>Неактивен</option>
                <option value={3}>Уволен</option>
              </select>
              {formData.firing_date && (
                <p className="mt-1 text-xs text-neutral-500">
                  Статус автоматически устанавливается в "Уволен" при указании даты увольнения
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Дата увольнения
              </label>
              <input
                type="date"
                name="firing_date"
                value={formData.firing_date || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
              />
            </div>

            
            <div className="flex gap-3 pt-6">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 border border-neutral-300 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors"
              >
                {loading ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}