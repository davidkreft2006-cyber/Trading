import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Klassen zusammenführen; bei Tailwind-Konflikten gewinnt die zuletzt genannte Klasse. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
