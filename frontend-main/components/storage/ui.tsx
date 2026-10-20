import { STATUS_LABELS } from '@/lib/api/storage/storage';
import type { StorageSensor, StorageStatus } from '@/lib/types/storage/storage';
import { formatDateTime, formatNumber } from '@/components/ui/form';

export function fillPercent(current: string | number, capacity: string | number): number {
  const c = Number(current);
  const max = Number(capacity);
  if (!max || !Number.isFinite(c)) return 0;
  return Math.round((c / max) * 100);
}

export function StatusBadge({ status }: { status: StorageStatus }) {
  const cls = status === 'warning'
    ? 'bg-red-50 text-red-700 border-red-200'
    : 'bg-green-50 text-green-700 border-green-200';
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium border ${cls}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function FillBar({ current, capacity }: { current: string | number; capacity: string | number }) {
  const pct = fillPercent(current, capacity);
  const color = pct > 100 ? 'bg-red-500' : pct >= 90 ? 'bg-amber-500' : 'bg-neutral-900';
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 bg-neutral-200">
        <div className={`h-1.5 ${color}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </div>
      <span className="text-xs text-neutral-600 w-10 text-right">{pct}%</span>
    </div>
  );
}

export function SensorSummary({ sensor }: { sensor: StorageSensor | null }) {
  if (!sensor) return <span className="text-xs text-neutral-400">Нет показаний</span>;
  return (
    <div className="text-xs leading-5">
      <div className="text-neutral-900">
        {formatNumber(sensor.temperature, 1)} °C · {formatNumber(sensor.humidity, 1)} %
      </div>
      <div className="text-neutral-500">{formatDateTime(sensor.created_at)}</div>
    </div>
  );
}
