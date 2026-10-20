'use client';

import { useState } from 'react';
import Link from 'next/link';
import { copyRation, deleteRation, updateRation } from '@/lib/api/ration/ration';
import { rationErrorMessage, rationLineName } from '@/lib/utils/ration';
import type { Ration } from '@/lib/types/ration/ration';

export interface RationNotice {
  kind: 'success' | 'warning' | 'error';
  text: string;
  link?: { href: string; label: string };
}

/**
 * Действия над рационом, общие для списка и карточки: копирование, архив, удаление.
 * onChanged вызывается после успешного изменения, чтобы перезагрузить данные.
 */
export function useRationActions(onChanged: (changed?: Ration) => void | Promise<void>) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState<RationNotice | null>(null);

  const copy = async (ration: Ration): Promise<Ration | null> => {
    setBusyId(ration.id);
    setNotice(null);
    try {
      const result = await copyRation(ration);
      const href = `/ration/${result.copy.id}`;
      if (result.failedFeed) {
        const reason = rationErrorMessage(result.error, 'неизвестная ошибка').message;
        setNotice({
          kind: 'warning',
          text: `Копия «${result.copy.name}» создана частично: перенесено кормов ${result.copiedFeeds} из ${ration.ration_feeds.length}. `
            + `Не удалось добавить «${rationLineName(result.failedFeed)}»: ${reason}`,
          link: { href, label: 'Открыть копию' },
        });
      } else {
        setNotice({ kind: 'success', text: `Создана копия «${result.copy.name}».`, link: { href, label: 'Открыть копию' } });
      }
      await onChanged();
      return result.copy;
    } catch (err) {
      setNotice({ kind: 'error', text: rationErrorMessage(err, 'Не удалось создать копию').message });
      return null;
    } finally {
      setBusyId(null);
    }
  };

  const toggleArchive = async (ration: Ration): Promise<Ration | null> => {
    const question = ration.is_active
      ? `Отправить рацион «${ration.name}» в архив?`
      : `Вернуть рацион «${ration.name}» из архива?`;
    if (!confirm(question)) return null;
    setBusyId(ration.id);
    setNotice(null);
    try {
      const updated = await updateRation(ration.id, { is_active: !ration.is_active });
      await onChanged(updated);
      return updated;
    } catch (err) {
      setNotice({ kind: 'error', text: rationErrorMessage(err, 'Не удалось изменить статус рациона').message });
      return null;
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (ration: Ration): Promise<boolean> => {
    if (!confirm(`Удалить рацион «${ration.name}» вместе с составом? Это действие нельзя отменить.`)) return false;
    setBusyId(ration.id);
    setNotice(null);
    try {
      await deleteRation(ration.id);
      await onChanged();
      return true;
    } catch (err) {
      setNotice({ kind: 'error', text: rationErrorMessage(err, 'Не удалось удалить рацион').message });
      return false;
    } finally {
      setBusyId(null);
    }
  };

  return { busyId, notice, setNotice, copy, toggleArchive, remove };
}

const NOTICE_CLASS: Record<RationNotice['kind'], string> = {
  success: 'bg-green-50 border-green-600 text-green-900',
  warning: 'bg-amber-50 border-amber-500 text-amber-900',
  error: 'bg-red-50 border-red-600 text-red-800',
};

export function NoticeBox({ notice, onClose }: { notice: RationNotice | null; onClose: () => void }) {
  if (!notice) return null;
  return (
    <div className={`mb-4 p-3 border-l-4 text-sm flex items-start gap-3 ${NOTICE_CLASS[notice.kind]}`}>
      <p className="flex-1 whitespace-pre-line">
        {notice.text}
        {notice.link && (
          <> <Link href={notice.link.href} className="underline font-medium">{notice.link.label}</Link></>
        )}
      </p>
      <button onClick={onClose} className="text-xs opacity-70 hover:opacity-100" aria-label="Закрыть">✕</button>
    </div>
  );
}
