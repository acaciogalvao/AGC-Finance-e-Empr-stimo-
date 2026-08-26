export const formatCurrency = (value: number | undefined | null): string => {
  const safe = Number(value) || 0;
  return safe.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

export const formatDateDisplay = (dateString: string | undefined | null): string => {
  if (!dateString) return '--/--/----';
  const parts = dateString.split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
};

export const todayISO = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const addDaysToISO = (baseISO: string, days: number): string => {
  const [y, m, d] = (baseISO || todayISO()).split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const addMonthsToISO = (baseISO: string, months: number): string => {
  const [y, m, d] = (baseISO || todayISO()).split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setMonth(date.getMonth() + months);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
