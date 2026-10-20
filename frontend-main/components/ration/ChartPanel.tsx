import type { ReactNode } from 'react';
import type { RationFeedStructureItem } from '@/lib/types/ration/ration';
import { secondaryButtonClass } from '@/components/ui/form';

export const EMPTY_CHART_TEXT = 'Нет данных для диаграммы';

const TOP_FEEDS = 5;

/** Круговая диаграмма читаема лишь с немногими секторами: хвост кормов сворачивается в «Прочее». */
export function feedStructureToPieItems(data: RationFeedStructureItem[]) {
  const sorted = data.filter(i => i.cost > 0).sort((a, b) => b.cost - a.cost);
  const top = sorted.slice(0, TOP_FEEDS).map(i => ({ label: i.feed, value: i.cost }));
  const rest = sorted.slice(TOP_FEEDS).reduce((s, i) => s + i.cost, 0);
  return rest > 0 ? [...top, { label: 'Прочее', value: rest }] : top;
}

interface ChartPanelProps {
  title: string;
  loading: boolean;
  error: string;
  onRetry: () => void;
  children: ReactNode;
}

/** Состояния загрузки и ошибки вокруг диаграммы; пустые данные рисует сама диаграмма. */
export default function ChartPanel({ title, loading, error, onRetry, children }: ChartPanelProps) {
  if (!loading && !error) return <>{children}</>;
  return (
    <div className="bg-white border border-neutral-200 p-4">
      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">{title}</p>
      {error ? (
        <>
          <p className="text-sm text-red-600 whitespace-pre-line mb-3">{error}</p>
          <button onClick={onRetry} className={secondaryButtonClass}>Повторить</button>
        </>
      ) : (
        <p className="text-sm text-neutral-500">Загрузка диаграммы…</p>
      )}
    </div>
  );
}
