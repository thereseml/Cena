import type { InventoryBatch } from '@cena/contracts';

export const USE_SOON_DAYS = 3;

export type ExpiryStatus = 'NO_DATE' | 'FUTURE' | 'EXPIRING_SOON' | 'DATE_REACHED' | 'DATE_PASSED';

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export function stockholmCalendarDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Stockholm',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function getExpiryStatus(
  date: string | null,
  now = new Date(),
  thresholdDays = USE_SOON_DAYS,
): ExpiryStatus {
  if (!date) return 'NO_DATE';
  const daysRemaining = calendarDayNumber(date) - calendarDayNumber(stockholmCalendarDate(now));
  if (daysRemaining < 0) return 'DATE_PASSED';
  if (daysRemaining === 0) return 'DATE_REACHED';
  if (daysRemaining <= thresholdDays) return 'EXPIRING_SOON';
  return 'FUTURE';
}

export interface ExpiryLabel {
  text: string;
  urgency: 'none' | 'soon' | 'passed';
}

export function getExpiryLabel(batch: InventoryBatch, now = new Date()): ExpiryLabel | null {
  if (!batch.expiryDate || !batch.expiryType) return null;
  const daysRemaining = calendarDayNumber(batch.expiryDate) - calendarDayNumber(stockholmCalendarDate(now));
  const subject = batch.expiryType === 'BEST_BEFORE' ? 'Bäst före' : 'Sista förbrukningsdag';
  const estimated = batch.expirySource === 'ESTIMATED';
  let text: string;
  let urgency: ExpiryLabel['urgency'] = 'none';

  if (daysRemaining < 0) {
    if (estimated) text = 'Uppskattat datum passerat';
    else if (batch.expiryType === 'USE_BY') text = 'Sista förbrukningsdag har passerat';
    else text = 'Bäst före-datum har passerat';
    urgency = 'passed';
  } else if (daysRemaining === 0) {
    text = `${subject} idag`;
    urgency = 'soon';
  } else if (daysRemaining === 1) {
    text = `${subject} imorgon`;
    urgency = 'soon';
  } else if (daysRemaining <= USE_SOON_DAYS) {
    text = estimated ? 'Uppskattat datum närmar sig' : 'Använd snart';
    urgency = 'soon';
  } else {
    text = `${subject} ${new Intl.DateTimeFormat('sv-SE', {
      day: 'numeric',
      month: 'short',
    }).format(new Date(`${batch.expiryDate}T12:00:00`))}`;
  }

  if (estimated && daysRemaining >= 0 && !text.startsWith('Uppskattat')) {
    text = `Uppskattat · ${text}`;
  }
  return { text, urgency };
}

export function isUseSoon(batch: InventoryBatch, now = new Date()): boolean {
  if (!batch.expiryDate) return false;
  const daysRemaining = calendarDayNumber(batch.expiryDate) - calendarDayNumber(stockholmCalendarDate(now));
  return daysRemaining >= 0 && daysRemaining <= USE_SOON_DAYS;
}

function calendarDayNumber(value: string): number {
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}
