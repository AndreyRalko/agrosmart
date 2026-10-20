'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from '@/lib/hooks/useTranslation';

interface SidePanelProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Ширина на десктопе, px. */
  width?: number;
}

/** Каркас боковой панели: затемнение, панель справа (на телефоне — во весь экран), заголовок с крестиком. */
export default function SidePanel({ isOpen, title, onClose, children, width = 420 }: SidePanelProps) {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-40 z-40" onClick={onClose} />
      <div
        className="fixed inset-0 md:inset-auto md:right-0 md:top-0 md:h-screen bg-white md:border-l border-neutral-200 z-50 overflow-y-auto md:w-[var(--side-panel-width)]"
        style={{ '--side-panel-width': `${width}px` } as CSSProperties}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
            <button onClick={onClose} className="text-neutral-500 hover:text-neutral-900 transition-colors" aria-label={t('close')}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {children}
        </div>
      </div>
    </>
  );
}
