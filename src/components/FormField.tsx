import React from 'react';
import { AlertCircle } from 'lucide-react';
import {
  maskCurrency,
  maskDistance,
  maskInteger,
  maskPercentage,
  maskTime,
  maskName,
  maskDescription,
  maskPhone,
  maskPlate,
} from '../utils/masks';

export type MaskType = 'currency' | 'distance' | 'integer' | 'percentage' | 'time' | 'name' | 'description' | 'phone' | 'plate' | 'none';

interface FormFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'children'> {
  label: string;
  value?: string;
  onChange?: (value: string) => void;
  mask?: MaskType;
  error?: string | null;
  icon?: React.ReactNode;
  prefix?: string;
  suffix?: string;
  required?: boolean;
  helperText?: string;
  containerClassName?: string;
  dark?: boolean;
  children?: React.ReactNode;
}

export function FormField({
  label,
  value = '',
  onChange,
  mask = 'none',
  error,
  icon,
  prefix,
  suffix,
  required = false,
  helperText,
  containerClassName = '',
  className = '',
  placeholder,
  type = 'text',
  dark = false,
  children,
  ...rest
}: FormFieldProps) {
  const getFormattedValue = (val: string): string => {
    if (!val) return '';
    if (mask === 'currency') return maskCurrency(val);
    if (mask === 'distance') return maskDistance(val);
    if (mask === 'integer') return maskInteger(val);
    if (mask === 'percentage') return maskPercentage(val);
    if (mask === 'time') return maskTime(val);
    if (mask === 'name') return maskName(val);
    if (mask === 'description') return maskDescription(val);
    if (mask === 'phone') return maskPhone(val);
    if (mask === 'plate') return maskPlate(val);
    return val;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;

    // Handle backspacing on time mask trailing colons smoothly
    if (mask === 'time' && displayValue.endsWith(':') && raw.length === displayValue.length - 1 && !raw.endsWith(':')) {
      raw = raw.slice(0, -1);
    }

    let formatted = raw;

    if (mask === 'currency') {
      formatted = maskCurrency(raw);
    } else if (mask === 'distance') {
      formatted = maskDistance(raw);
    } else if (mask === 'integer') {
      formatted = maskInteger(raw);
    } else if (mask === 'percentage') {
      formatted = maskPercentage(raw);
    } else if (mask === 'time') {
      formatted = maskTime(raw);
    } else if (mask === 'name') {
      formatted = maskName(raw);
    } else if (mask === 'description') {
      formatted = maskDescription(raw);
    } else if (mask === 'phone') {
      formatted = maskPhone(raw);
    } else if (mask === 'plate') {
      formatted = maskPlate(raw);
    }

    if (onChange) {
      onChange(formatted);
    }
  };

  const getInputMode = (): React.HTMLAttributes<HTMLInputElement>['inputMode'] => {
    if (rest.inputMode) return rest.inputMode;
    if (mask === 'currency' || mask === 'integer' || mask === 'time') return 'numeric';
    if (mask === 'distance' || mask === 'percentage') return 'decimal';
    return undefined;
  };

  const hasError = Boolean(error);
  const displayValue = getFormattedValue(value);

  return (
    <div className={`space-y-1 ${containerClassName}`}>
      <label className={`block text-xs font-bold uppercase tracking-wider ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
        {label} {required && <span className="text-rose-500">*</span>}
      </label>

      {children ? (
        children
      ) : (
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 flex items-center pointer-events-none">
              {icon}
            </div>
          )}

          {prefix && (
            <span className={`absolute ${icon ? 'left-9' : 'left-3.5'} top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm pointer-events-none`}>
              {prefix}
            </span>
          )}

          <input
            {...rest}
            type={type}
            inputMode={getInputMode()}
            value={displayValue}
            onChange={handleChange}
            placeholder={placeholder}
            className={`w-full py-2.5 rounded-xl border-0 font-bold transition text-sm focus:outline-none focus:ring-2 ${
              icon && prefix
                ? 'pl-16 pr-4'
                : icon
                ? 'pl-10 pr-4'
                : prefix
                ? 'pl-10 pr-4'
                : 'px-3.5'
            } ${suffix ? 'pr-12' : ''} ${
              dark
                ? hasError
                  ? 'ring-2 ring-rose-500/40 bg-rose-950/30 text-white placeholder:text-slate-500'
                  : 'bg-slate-800 text-white focus:ring-emerald-500/40 placeholder:text-slate-500'
                : hasError
                  ? 'ring-2 ring-rose-500/40 bg-rose-50 text-slate-900'
                  : 'bg-slate-100/80 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 shadow-2xs'
            } ${className}`}
          />

          {suffix && (
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs pointer-events-none">
              {suffix}
            </span>
          )}
        </div>
      )}

      {hasError ? (
        <div className="flex items-center space-x-1.5 text-rose-400 text-xs font-semibold pt-0.5 animate-in fade-in">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : helperText ? (
        <p className="text-[11px] text-slate-400 font-medium">{helperText}</p>
      ) : null}
    </div>
  );
}
