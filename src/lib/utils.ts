import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format as dateFnsFormat, isValid } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// New helper function for safe date formatting
export function safeFormatDate(dateInput: string | Date | null | undefined, formatString: string, defaultValue: string = '-') {
  if (!dateInput) {
    return defaultValue;
  }
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (!isValid(date)) {
    return defaultValue;
  }
  return dateFnsFormat(date, formatString);
}

export const normalizeGrade = (g: any) => {
  if (g === null || g === undefined) return '';
  let s = String(g).trim().toLowerCase();
  if (s === 'general' || s === 'all' || s === 'select-grade' || s === 'none' || s === '') return '';
  s = s.replace(/^(grade|class)\s+/, '');
  s = s.replace(/(\d+)(st|nd|rd|th)$/, '$1');
  return s.trim();
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0 }).format(amount);
};

export const getGradeFormal = (pct: number) => {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C";
  if (pct >= 40) return "D";
  return "F";
};