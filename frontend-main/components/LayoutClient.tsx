'use client';

import { ReactNode } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { useSidebar } from '@/lib/hooks/useSidebar';
import { PermissionsProvider } from '@/lib/hooks/usePermissions';

export default function LayoutClient({ children }: { children: ReactNode }) {
  const { isOpen, toggle, close } = useSidebar();

  return (
    <PermissionsProvider>
      <div className="flex h-screen">
        <Sidebar isOpen={isOpen} onClose={close} />
        <div className="flex-1 flex flex-col">
          <Navbar onMenuClick={toggle} />
          <main className="flex-1 overflow-auto bg-gray-50">
            {children}
          </main>
        </div>
      </div>
    </PermissionsProvider>
  );
}