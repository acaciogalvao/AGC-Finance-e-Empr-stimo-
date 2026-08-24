import { Expense, PLATFORM_COMMISSION, Ride } from '../context/FinanceContext';

function escapeCSV(val: string | number | undefined): string {
  if (val === undefined || val === null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function formatDateBR(iso: string): string {
  return iso.split('-').reverse().join('/');
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportRidesCSV(rides: Ride[]): void {
  const headers = [
    'Data',
    'Plataforma',
    'Valor Ofertado',
    'Valor Passageiro',
    'Taxa App',
    'Valor Bruto (Recebido)',
    'Comissão Estimada',
    'Valor Líquido Estimado',
    'Distância (km)',
    'Duração (min)',
    'Observações',
  ].join(',');

  const rows = rides.map((r) => {
    const commission = r.grossValue * (PLATFORM_COMMISSION[r.platform] || 0.2);
    const net = r.grossValue - commission;
    const appFee = r.passengerValue !== undefined ? r.passengerValue - (r.offeredValue ?? r.grossValue) : undefined;
    return [
      formatDateBR(r.date),
      r.platform,
      r.offeredValue !== undefined ? r.offeredValue.toFixed(2).replace('.', ',') : '',
      r.passengerValue !== undefined ? r.passengerValue.toFixed(2).replace('.', ',') : '',
      appFee !== undefined ? appFee.toFixed(2).replace('.', ',') : '',
      r.grossValue.toFixed(2).replace('.', ','),
      commission.toFixed(2).replace('.', ','),
      net.toFixed(2).replace('.', ','),
      r.distance.toFixed(1).replace('.', ','),
      r.duration,
      r.observations ?? '',
    ]
      .map(escapeCSV)
      .join(',');
  });

  const content = [headers, ...rows].join('\n');
  downloadBlob(content, 'corridas_agc.csv', 'text/csv;charset=utf-8;');
}

export function exportExpensesCSV(expenses: Expense[]): void {
  const headers = ['Data', 'Categoria', 'Descrição', 'Valor'].join(',');

  const rows = expenses.map((e) =>
    [
      formatDateBR(e.date),
      e.category,
      e.description,
      e.value.toFixed(2).replace('.', ','),
    ]
      .map(escapeCSV)
      .join(','),
  );

  const content = [headers, ...rows].join('\n');
  downloadBlob(content, 'despesas_agc.csv', 'text/csv;charset=utf-8;');
}

export function exportFullReportCSV(rides: Ride[], expenses: Expense[]): void {
  const rideSection =
    'CORRIDAS\n' +
    ['Data', 'Plataforma', 'Bruto', 'Líquido', 'Distância (km)', 'Duração (min)'].join(',') +
    '\n' +
    rides
      .map((r) => {
        const net = r.grossValue * (1 - (PLATFORM_COMMISSION[r.platform] || 0.2));
        return [
          formatDateBR(r.date),
          r.platform,
          r.grossValue.toFixed(2).replace('.', ','),
          net.toFixed(2).replace('.', ','),
          r.distance.toFixed(1).replace('.', ','),
          r.duration,
        ]
          .map(escapeCSV)
          .join(',');
      })
      .join('\n');

  const expSection =
    '\n\nDESPESAS\n' +
    ['Data', 'Categoria', 'Descrição', 'Valor'].join(',') +
    '\n' +
    expenses
      .map((e) =>
        [
          formatDateBR(e.date),
          e.category,
          e.description,
          e.value.toFixed(2).replace('.', ','),
        ]
          .map(escapeCSV)
          .join(','),
      )
      .join('\n');

  const content = rideSection + expSection;
  const ts = new Date().toISOString().slice(0, 10);
  downloadBlob(content, `agc_relatorio_${ts}.csv`, 'text/csv;charset=utf-8;');
}

export function exportBackupJSON(rides: Ride[], expenses: Expense[]): void {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    rides,
    expenses,
  };
  const content = JSON.stringify(data, null, 2);
  const ts = new Date().toISOString().slice(0, 10);
  downloadBlob(content, `agc_backup_${ts}.json`, 'application/json');
}
