/**
 * System-wide validation helpers with error messages in Portuguese
 */

import { parseTimeMinutes } from './masks';

export interface ValidationResult {
  isValid: boolean;
  errorMessage: string | null;
}

export function validateGrossValue(val: number | string): ValidationResult {
  const num = typeof val === 'number' ? val : parseFloat(val.toString().replace(',', '.'));
  if (isNaN(num) || num <= 0) {
    return { isValid: false, errorMessage: 'O valor bruto deve ser maior que R$ 0,00.' };
  }
  if (num > 100000) {
    return { isValid: false, errorMessage: 'O valor excede o limite permitido (R$ 100.000,00).' };
  }
  return { isValid: true, errorMessage: null };
}

export function validateExpenseValue(val: number | string): ValidationResult {
  const num = typeof val === 'number' ? val : parseFloat(val.toString().replace(',', '.'));
  if (isNaN(num) || num <= 0) {
    return { isValid: false, errorMessage: 'O valor da despesa deve ser maior que R$ 0,00.' };
  }
  if (num > 100000) {
    return { isValid: false, errorMessage: 'O valor excede o limite máximo por despesa.' };
  }
  return { isValid: true, errorMessage: null };
}

export function validateDistance(val: number | string): ValidationResult {
  if (val === '' || val === undefined || val === null) {
    return { isValid: true, errorMessage: null }; // Optional field, defaults to 0
  }
  const num = typeof val === 'number' ? val : parseFloat(val.toString().replace(',', '.'));
  if (isNaN(num) || num < 0) {
    return { isValid: false, errorMessage: 'A distância deve ser um número positivo.' };
  }
  if (num > 2000) {
    return { isValid: false, errorMessage: 'Distância máxima por corrida é de 2.000 km.' };
  }
  return { isValid: true, errorMessage: null };
}

export function validateDuration(val: number | string): ValidationResult {
  if (val === '' || val === undefined || val === null) {
    return { isValid: true, errorMessage: null }; // Optional field, defaults to 0
  }
  const mins = typeof val === 'number' ? val : parseTimeMinutes(val);
  if (isNaN(mins) || mins < 0) {
    return { isValid: false, errorMessage: 'Informe um tempo válido no formato 00:00:00.' };
  }
  if (mins > 1440) {
    return { isValid: false, errorMessage: 'Duração máxima por registro é de 24 horas (24:00:00).' };
  }
  return { isValid: true, errorMessage: null };
}

export function validateDate(dateStr: string): ValidationResult {
  if (!dateStr || !dateStr.trim()) {
    return { isValid: false, errorMessage: 'A data é obrigatória.' };
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return { isValid: false, errorMessage: 'Informe uma data válida no formato correto.' };
  }
  const year = d.getFullYear();
  if (year < 2020 || year > 2035) {
    return { isValid: false, errorMessage: 'A data deve estar entre os anos 2020 e 2035.' };
  }
  return { isValid: true, errorMessage: null };
}

export function validateDescription(text: string): ValidationResult {
  if (!text || !text.trim()) {
    return { isValid: false, errorMessage: 'A descrição da despesa é obrigatória.' };
  }
  if (text.trim().length < 3) {
    return { isValid: false, errorMessage: 'A descrição deve ter pelo menos 3 caracteres.' };
  }
  if (text.trim().length > 150) {
    return { isValid: false, errorMessage: 'A descrição não pode exceder 150 caracteres.' };
  }
  return { isValid: true, errorMessage: null };
}

export function validateName(text: string): ValidationResult {
  if (!text || !text.trim()) {
    return { isValid: false, errorMessage: 'O nome é obrigatório.' };
  }
  if (text.trim().length < 2) {
    return { isValid: false, errorMessage: 'O nome deve ter pelo menos 2 caracteres.' };
  }
  if (text.trim().length > 60) {
    return { isValid: false, errorMessage: 'O nome não pode exceder 60 caracteres.' };
  }
  return { isValid: true, errorMessage: null };
}

export function validateGoalAmount(val: number | string): ValidationResult {
  const num = typeof val === 'number' ? val : parseFloat(val.toString().replace(',', '.'));
  if (isNaN(num) || num <= 0) {
    return { isValid: false, errorMessage: 'O valor da meta deve ser superior a R$ 0,00.' };
  }
  return { isValid: true, errorMessage: null };
}

export function validatePercentage(val: number | string): ValidationResult {
  const num = typeof val === 'number' ? val : parseFloat(val.toString().replace(',', '.'));
  if (isNaN(num) || num < 0 || num > 100) {
    return { isValid: false, errorMessage: 'A alíquota deve estar entre 0% e 100%.' };
  }
  return { isValid: true, errorMessage: null };
}

export function validateWorkingDays(val: number | string): ValidationResult {
  const num = typeof val === 'number' ? val : parseInt(val.toString(), 10);
  if (isNaN(num) || num < 1 || num > 31) {
    return { isValid: false, errorMessage: 'Informe um número de dias úteis entre 1 e 31.' };
  }
  return { isValid: true, errorMessage: null };
}
