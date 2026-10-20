// Общие классы и мелкие компоненты форм и таблиц.

export const inputClass =
  'w-full px-3 py-2 bg-white border border-neutral-300 text-neutral-900 text-sm focus:outline-none focus:border-neutral-900 transition-colors';
export const inputErrorClass =
  'w-full px-3 py-2 bg-white border border-red-500 text-neutral-900 text-sm focus:outline-none focus:border-red-600 transition-colors';
export const primaryButtonClass =
  'px-4 py-2 bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors';
export const secondaryButtonClass =
  'px-4 py-2 border border-neutral-300 text-neutral-700 text-sm font-medium hover:bg-neutral-50 disabled:text-neutral-400 transition-colors';
export const thClass = 'px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider';
export const tdClass = 'px-4 py-3 text-sm text-neutral-900';

export function formatNumber(value: string | number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('ru-RU', { maximumFractionDigits: digits });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function ErrorBox({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-600 text-red-800 text-sm whitespace-pre-line">
      {message}
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}
