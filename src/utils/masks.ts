/**
 * Input masking helper functions for currency, numbers, distance, duration, percentage, and text.
 */

// Formats raw typed digits/string into BRL currency format (e.g. "1250" -> "12,50" or "R$ 1.250,00")
export function maskCurrency(val: string): string {
  if (!val) return '';
  
  // Remove all non-digit characters
  const cleanDigits = val.replace(/\D/g, '');
  if (!cleanDigits) return '';

  // Convert to float (cents)
  const numberValue = parseFloat(cleanDigits) / 100;
  
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numberValue);
}

// Parses a masked currency string (e.g., "1.250,50", "30,00", or "30.00") into float number (1250.50 or 30)
export function parseCurrency(val: string | number): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  
  const str = String(val).trim();
  if (!str) return 0;

  // If string contains comma (e.g. "1.250,50" or "30,00")
  if (str.includes(',')) {
    const clean = str.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }

  // If string contains a single dot and max 2 decimal places (e.g. "30.00" or "1250.5")
  const parts = str.split('.');
  if (parts.length === 2 && parts[1].length <= 2) {
    const clean = str.replace(/[^\d.]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }

  // If standard integer or string with thousand separators only
  const clean = str.replace(/\./g, '').replace(/[^\d]/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

// Distance KM mask (allows typing digits and dot or comma e.g. "1000.45", "1000,45", "12.5")
export function maskDistance(val: string): string {
  if (!val) return '';
  const raw = String(val).trim();
  if (!raw) return '';

  let clean = raw.replace(/[^\d.,]/g, '');
  if (!clean) return '';

  if (clean.includes(',') && clean.includes('.')) {
    const lastComma = clean.lastIndexOf(',');
    const lastDot = clean.lastIndexOf('.');
    if (lastComma > lastDot) {
      clean = clean.replace(/\./g, '');
    } else {
      clean = clean.replace(/,/g, '');
    }
  }

  const separator = clean.includes(',') ? ',' : (clean.includes('.') ? '.' : null);
  if (separator) {
    const parts = clean.split(separator);
    const intPart = parts[0].replace(/\D/g, '');
    const decPart = parts.slice(1).join('').replace(/\D/g, '').slice(0, 2);
    return `${intPart}${separator}${decPart}`;
  }

  return clean.replace(/\D/g, '');
}

export function parseDistance(val: string | number): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const str = String(val).trim();
  if (!str) return 0;
  const clean = str.replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

// Time / Duration mask strictly formatted as 00:00:00 (Horas:Minutos:Segundos)
export function maskTime(val: string): string {
  if (!val) return '';
  const str = String(val).trim();
  if (!str) return '';

  // Extract only digits up to 6 characters (HHMMSS)
  const digits = str.replace(/\D/g, '').slice(0, 6);
  if (!digits) return '';

  if (digits.length <= 2) {
    if (digits.length === 2) {
      return `${digits}:`;
    }
    return digits;
  }

  if (digits.length <= 4) {
    const hh = digits.slice(0, 2);
    const mm = digits.slice(2);
    if (digits.length === 4) {
      return `${hh}:${mm}:`;
    }
    return `${hh}:${mm}`;
  }

  const hh = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  const ss = digits.slice(4, 6);
  return `${hh}:${mm}:${ss}`;
}

export function parseTimeMinutes(val: string | number): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const str = String(val).trim();
  if (!str) return 0;

  if (str.includes(':')) {
    const parts = str.split(':').filter(p => p !== '');
    if (parts.length >= 3) {
      const h = parseInt(parts[0], 10) || 0;
      const m = parseInt(parts[1], 10) || 0;
      const s = parseInt(parts[2], 10) || 0;
      return h * 60 + m + (s / 60);
    }
    if (parts.length === 2) {
      const p1 = parseInt(parts[0], 10) || 0;
      const p2 = parseInt(parts[1], 10) || 0;
      return p1 * 60 + p2;
    }
    if (parts.length === 1) {
      const p1 = parseInt(parts[0], 10) || 0;
      return p1 * 60;
    }
  }

  const digits = str.replace(/\D/g, '');
  if (!digits) return 0;

  if (digits.length === 6) {
    const h = parseInt(digits.slice(0, 2), 10) || 0;
    const m = parseInt(digits.slice(2, 4), 10) || 0;
    const s = parseInt(digits.slice(4, 6), 10) || 0;
    return h * 60 + m + (s / 60);
  }

  if (digits.length === 5) {
    const h = parseInt(digits.slice(0, 1), 10) || 0;
    const m = parseInt(digits.slice(1, 3), 10) || 0;
    const s = parseInt(digits.slice(3, 5), 10) || 0;
    return h * 60 + m + (s / 60);
  }

  if (digits.length === 4) {
    const h = parseInt(digits.slice(0, 2), 10) || 0;
    const m = parseInt(digits.slice(2, 4), 10) || 0;
    return h * 60 + m;
  }

  const num = parseInt(digits, 10);
  return isNaN(num) ? 0 : num;
}

export function minutesToTimeString(minutes: number | string): string {
  if (minutes === '' || minutes === undefined || minutes === null) return '';
  const totalMins = typeof minutes === 'number' ? minutes : parseFloat(String(minutes).replace(',', '.'));
  if (isNaN(totalMins) || totalMins < 0) return '';

  const totalSeconds = Math.round(totalMins * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const remMins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(remMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Integer mask (formats integer with thousand dots, e.g. "8888" -> "8.888")
export function maskInteger(val: string): string {
  if (!val) return '';
  const digits = val.replace(/\D/g, '');
  if (!digits) return '';
  return new Intl.NumberFormat('pt-BR').format(parseInt(digits, 10));
}

export function parseInteger(val: string | number): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const clean = String(val).replace(/\D/g, '');
  const num = parseInt(clean, 10);
  return isNaN(num) ? 0 : num;
}

// Percentage mask (e.g., "5,0" or "10,00%")
export function maskPercentage(val: string): string {
  if (!val) return '';
  let clean = val.replace(/[^\d,.]/g, '').replace('.', ',');
  const parts = clean.split(',');
  if (parts.length > 2) {
    clean = parts[0] + ',' + parts.slice(1).join('');
  }
  if (parts.length === 2) {
    clean = parts[0] + ',' + parts[1].slice(0, 2);
  }
  return clean;
}

export function parsePercentage(val: string): number {
  if (!val) return 0;
  const num = parseFloat(val.replace(',', '.'));
  return isNaN(num) ? 0 : num;
}

// Name / Description text mask (capitalizes first letter of each word if name, trims excess spaces)
export function maskName(val: string): string {
  if (!val) return '';
  // Limit to reasonable character count
  return val.slice(0, 60);
}

export function maskDescription(val: string): string {
  if (!val) return '';
  return val.slice(0, 150);
}

// License plate mask (e.g. ABC-1D23 or ABC-1234)
export function maskPlate(val: string): string {
  if (!val) return '';
  const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
  if (clean.length <= 3) return clean;
  return `${clean.slice(0, 3)}-${clean.slice(3)}`;
}

// Phone mask (e.g. (99) 99999-9999)
export function maskPhone(val: string): string {
  if (!val) return '';
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

// CPF mask (e.g. 999.999.999-99)
export function maskCPF(val: string): string {
  if (!val) return '';
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

// CNPJ mask (e.g. 99.999.999/0001-99)
export function maskCNPJ(val: string): string {
  if (!val) return '';
  const digits = val.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

// Formats Pix Key based on Pix Key Type ('celular' | 'cpf' | 'cnpj' | 'email' | 'aleatoria')
export function maskPixKey(val: string, keyType: 'celular' | 'cpf' | 'cnpj' | 'email' | 'aleatoria'): string {
  if (!val) return '';
  if (keyType === 'celular') return maskPhone(val);
  if (keyType === 'cpf') return maskCPF(val);
  if (keyType === 'cnpj') return maskCNPJ(val);
  if (keyType === 'email') return val.trim().toLowerCase();
  return val.trim();
}

// Formats a date string (YYYY-MM-DD) into DD/MM/YYYY text if needed
export function maskDateBR(isoDateStr: string): string {
  if (!isoDateStr) return '';
  const parts = isoDateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDateStr;
}
