'use client';

import type { ModulePermissionItem } from '@/lib/constants/modules';
import { MODULE_LABELS_RU, MODULE_ORDER } from '@/lib/constants/modules';

interface ModulePermissionsEditorProps {
  value: ModulePermissionItem[];
  onChange: (value: ModulePermissionItem[]) => void;
  disabled?: boolean;
}

const ACTION_COLUMNS = [
  { key: 'can_view' as const, label: 'Просмотр' },
  { key: 'can_create' as const, label: 'Создание' },
  { key: 'can_edit' as const, label: 'Изменение' },
  { key: 'can_delete' as const, label: 'Удаление' },
];

export default function ModulePermissionsEditor({
  value,
  onChange,
  disabled = false,
}: ModulePermissionsEditorProps) {
  const byModule = new Map(value.map(item => [item.module, item]));

  const updateItem = (module: ModulePermissionItem['module'], patch: Partial<ModulePermissionItem>) => {
    const next = MODULE_ORDER.map(key => {
      const current = byModule.get(key) ?? {
        module: key,
        can_view: false,
        can_create: false,
        can_edit: false,
        can_delete: false,
      };
      if (key !== module) return current;
      return { ...current, ...patch };
    });
    onChange(next);
  };

  const setAllView = (checked: boolean) => {
    onChange(
      MODULE_ORDER.map(module => {
        const current = byModule.get(module) ?? {
          module,
          can_view: false,
          can_create: false,
          can_edit: false,
          can_delete: false,
        };
        return { ...current, can_view: checked };
      }),
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-neutral-900">Права доступа к модулям</p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setAllView(true)}
            className="text-xs text-neutral-600 hover:text-neutral-900 disabled:opacity-50"
          >
            Все просмотр
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setAllView(false)}
            className="text-xs text-neutral-600 hover:text-neutral-900 disabled:opacity-50"
          >
            Снять просмотр
          </button>
        </div>
      </div>

      <div className="border border-neutral-200 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-neutral-600">Модуль</th>
                {ACTION_COLUMNS.map(col => (
                  <th key={col.key} className="px-3 py-2 text-center font-medium text-neutral-600 whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {MODULE_ORDER.map(module => {
                const item = byModule.get(module) ?? {
                  module,
                  can_view: false,
                  can_create: false,
                  can_edit: false,
                  can_delete: false,
                };

                return (
                  <tr key={module} className="hover:bg-neutral-50">
                    <td className="px-3 py-2 text-neutral-800 whitespace-nowrap">
                      {MODULE_LABELS_RU[module]}
                    </td>
                    {ACTION_COLUMNS.map(col => (
                      <td key={col.key} className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          disabled={disabled}
                          checked={item[col.key]}
                          onChange={e => updateItem(module, { [col.key]: e.target.checked })}
                          className="w-4 h-4"
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
