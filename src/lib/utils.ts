import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format as dateFnsFormat, isValid } from "date-fns";

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