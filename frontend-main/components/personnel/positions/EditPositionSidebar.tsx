'use client';

import { useState, FormEvent, ChangeEvent, useEffect } from 'react';
import { updatePosition, deletePosition } from '@/lib/api/position';
import type { Position, PositionUpdate } from '@/lib/types/position';
import { createDefaultModulePermissions, normalizeModulePermissions } from '@/lib/constants/modules';
import ModulePermissionsEditor from '@/components/personnel/positions/ModulePermissionsEditor';
import { usePermissions } from '@/lib/hooks/usePermissions';

interface EditPositionSidebarProps {
  isOpen: boolean;
  position: Position | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditPositionSidebar({ isOpen, position, onClose, onSuccess }: EditPositionSidebarProps) {
  const { refreshPermissions, permissions } = usePermissions();
  const [formData, setFormData] = useState<PositionUpdate>({
    name_ru: '',
    name_kk: '',
    module_permissions: createDefaultModulePermissions(),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (position) {
      setFormData({
        name_ru: position.name_ru,
        name_kk: position.name_kk,
        module_permissions: normalizeModulePermissions(position.module_permissions),
      });
    }
  }, [position]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!position) return;

    setLoading(true);
    setError('');

    try {
      await updatePosition(position.id, formData);
      if (permissions?.position?.id === position.id) {
        await refreshPermissions();
      }
      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update position';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!position || !confirm('Вы уверены что хотите удалить эту позицию?')) return;

    setLoading(true);
    setError('');

    try {
      await deletePosition(position.id);
      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete position';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !position) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-40 z-40" />

      <div className="fixed right-0 top-0 h-screen w-full max-w-3xl bg-white border-l border-neutral-200 z-50 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900">Редактировать позицию</h2>
            <button
              onClick={onClose}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Название (RU) *
                </label>
                <input
                  type="text"
                  name="name_ru"
                  value={formData.name_ru}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Название (KK) *
                </label>
                <input
                  type="text"
                  name="name_kk"
                  value={formData.name_kk}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                />
              </div>
            </div>

            <ModulePermissionsEditor
              value={formData.module_permissions ?? createDefaultModulePermissions()}
              onChange={module_permissions => setFormData(prev => ({ ...prev, module_permissions }))}
              disabled={loading}
            />

            <div className="pt-4 border-t border-neutral-200">
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="w-full px-4 py-2.5 bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors disabled:bg-neutral-100 disabled:text-neutral-400"
              >
                Удалить позицию
              </button>
            </div>

            <div className="flex gap-3 pt-6">
              <button
                type="button"
                onClick={onClose}
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
