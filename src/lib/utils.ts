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

/**
 * Converts a hex color string to a space-separated HSL value string.
 * Example: #4F46E5 -> 243 75% 59%
 * This format is required for Tailwind CSS variable compatibility with alpha modifiers.
 */
export function hexToHSL(hex: string): string | null {
  if (!hex || !hex.startsWith('#')) return null;

  // Remove hash if present
  const cleanHex = hex.replace('#', '');

  // Parse r, g, b
  const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'NPR',
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
