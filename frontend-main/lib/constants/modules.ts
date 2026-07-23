export type ModuleKey =
  | 'dashboard'
  | 'persons'
  | 'departments'
  | 'positions'
  | 'fields'
  | 'integration'
  | 'culture'
  | 'fertilizer'
  | 'tasks'
  | 'ndvi'
  | 'agro_operations'
  | 'notification'
  | 'machinery'
  | 'animal';

export type ModuleAction = 'view' | 'create' | 'edit' | 'delete';

export interface ModulePermissionFlags {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export interface ModulePermissionItem {
  module: ModuleKey;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface ModuleRegistryItem {
  key: ModuleKey;
  label: string;
}

export interface UserPermissions {
  is_superuser: boolean;
  position: {
    id: number;
    name_ru: string;
    name_kk: string;
  } | null;
  modules: Record<ModuleKey, ModulePermissionFlags>;
  module_registry: ModuleRegistryItem[];
}

export const MODULE_LABELS_RU: Record<ModuleKey, string> = {
  dashboard: 'Дашборд',
  persons: 'Персоны',
  departments: 'Департаменты',
  positions: 'Позиции',
  fields: 'Поля',
  integration: 'Интеграции',
  culture: 'Культуры и сорта',
  fertilizer: 'Удобрения',
  tasks: 'Задания',
  ndvi: 'NDVI-мониторинг',
  agro_operations: 'Агро-операции',
  notification: 'Уведомления',
  machinery: 'Мех. оборудование',
  animal: 'Животные',
};

export const MODULE_ORDER: ModuleKey[] = [
  'dashboard',
  'persons',
  'departments',
  'positions',
  'fields',
  'integration',
  'culture',
  'fertilizer',
  'tasks',
  'ndvi',
  'agro_operations',
  'notification',
  'machinery',
  'animal',
];

export function createDefaultModulePermissions(): ModulePermissionItem[] {
  return MODULE_ORDER.map(module => ({
    module,
    can_view: true,
    can_create: false,
    can_edit: false,
    can_delete: false,
  }));
}

export function normalizeModulePermissions(
  items?: ModulePermissionItem[] | null,
): ModulePermissionItem[] {
  const byModule = new Map((items ?? []).map(item => [item.module, item]));
  return MODULE_ORDER.map(module => {
    const existing = byModule.get(module);
    return {
      module,
      can_view: existing?.can_view ?? false,
      can_create: existing?.can_create ?? false,
      can_edit: existing?.can_edit ?? false,
      can_delete: existing?.can_delete ?? false,
    };
  });
}

export function pathnameToModule(pathname: string): ModuleKey | null {
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  if (pathname.startsWith('/persons')) return 'persons';
  if (pathname.startsWith('/departments')) return 'departments';
  if (pathname.startsWith('/positions')) return 'positions';
  if (pathname.startsWith('/fields')) return 'fields';
  if (pathname.startsWith('/integration')) return 'integration';
  if (pathname.startsWith('/culture')) return 'culture';
  if (pathname.startsWith('/fertilizer')) return 'fertilizer';
  if (pathname.startsWith('/tasks')) return 'tasks';
  if (pathname.startsWith('/ndvi')) return 'ndvi';
  if (pathname.startsWith('/agro-operations')) return 'agro_operations';
  if (pathname.startsWith('/notification')) return 'notification';
  if (pathname.startsWith('/machinery')) return 'machinery';
  if (pathname.startsWith('/animal')) return 'animal';
  return null;
}
