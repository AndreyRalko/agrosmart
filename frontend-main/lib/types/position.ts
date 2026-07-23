import type { ModulePermissionItem } from '@/lib/constants/modules';

export interface Position {
  id: number;
  name_ru: string;
  name_kk: string;
  module_permissions?: ModulePermissionItem[];
}

export interface PositionCreate {
  name_ru: string;
  name_kk: string;
  module_permissions?: ModulePermissionItem[];
}

export interface PositionUpdate {
  name_ru?: string;
  name_kk?: string;
  module_permissions?: ModulePermissionItem[];
}

export interface PositionListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Position[];
}
