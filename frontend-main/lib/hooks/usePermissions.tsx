'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getMyPermissions } from '@/lib/api/permissions';
import { isAuthenticated } from '@/lib/api/auth';
import type { ModuleAction, ModuleKey, ModulePermissionFlags, UserPermissions } from '@/lib/constants/modules';
import { MODULE_ORDER } from '@/lib/constants/modules';

interface PermissionsContextValue {
  loading: boolean;
  permissions: UserPermissions | null;
  canAccessModule: (module: ModuleKey, action?: ModuleAction) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

function fullAccessModules(): Record<ModuleKey, ModulePermissionFlags> {
  return MODULE_ORDER.reduce((acc, module) => {
    acc[module] = { view: true, create: true, edit: true, delete: true };
    return acc;
  }, {} as Record<ModuleKey, ModulePermissionFlags>);
}

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);

  const refreshPermissions = useCallback(async () => {
    if (!isAuthenticated()) {
      setPermissions(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getMyPermissions();
      setPermissions(data);
    } catch {
      setPermissions({
        is_superuser: false,
        position: null,
        modules: MODULE_ORDER.reduce((acc, module) => {
          acc[module] = { view: true, create: true, edit: true, delete: true };
          return acc;
        }, {} as Record<ModuleKey, ModulePermissionFlags>),
        module_registry: [],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPermissions();
  }, [refreshPermissions]);

  const canAccessModule = useCallback(
    (module: ModuleKey, action: ModuleAction = 'view') => {
      if (!permissions) return true;
      if (permissions.is_superuser) return true;
      const flags = permissions.modules[module] ?? { view: false, create: false, edit: false, delete: false };
      return Boolean(flags[action]);
    },
    [permissions],
  );

  const value = useMemo(
    () => ({
      loading,
      permissions,
      canAccessModule,
      refreshPermissions,
    }),
    [loading, permissions, canAccessModule, refreshPermissions],
  );

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (!context) {
    return {
      loading: false,
      permissions: null,
      canAccessModule: (_module: ModuleKey, _action: ModuleAction = 'view') => true,
      refreshPermissions: async () => {},
    };
  }
  return context;
}

export { fullAccessModules };
