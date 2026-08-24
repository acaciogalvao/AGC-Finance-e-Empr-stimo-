export const formatCurrency = (value: number): string => {
  const safeVal = typeof value === 'number' && !isNaN(value) ? value : 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(safeVal);
};

export const formatNumber = (value: number, decimals = 1): string => {
  const safeVal = typeof value === 'number' && !isNaN(value) ? value : 0;
  if (safeVal >= 1000) return `${(safeVal / 1000).toFixed(1)}k`;
  return safeVal.toFixed(decimals);
};

export const formatMinutes = (minutes: number): string => {
  const safeMins = typeof minutes === 'number' && !isNaN(minutes) ? Math.max(0, minutes) : 0;
  if (safeMins === 0) return '0min';

  const totalSeconds = Math.round(safeMins * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}min`);
  if (secs > 0) parts.push(`${secs}s`);

  return parts.length > 0 ? parts.join(' ') : '0min';
};

export const formatDateDisplay = (isoDate: string): string => {
  if (!isoDate || !isoDate.includes('-')) return isoDate;
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
};

export const todayISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const tomorrowISO = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const dateInputToISO = (dateInput: string): string => {
  if (!dateInput) return todayISO();
  const trimmed = dateInput.trim();
  if (trimmed.includes('-')) {
    const parts = trimmed.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) return trimmed; // YYYY-MM-DD
      if (parts[2].length === 4) { // DD-MM-YYYY
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
  }
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const fullYear = year.length === 2 ? `20${year}` : year;
      return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  return trimmed;
};

export const isoToDateInput = (isoDate: string): string => {
  if (!isoDate || !isoDate.includes('-')) return '';
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
};
