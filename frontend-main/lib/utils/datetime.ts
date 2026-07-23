/** Локальное время для запроса погоды на текущий момент (YYYY-MM-DD HH:mm). */
export function getCurrentDt(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

/** Подпись текущего часа для отображения в UI. */
export function getCurrentHourLabel(): string {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  return now.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
