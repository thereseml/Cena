import type { InventoryBatch } from '@cena/contracts';

const USE_SOON_DAYS = 3;

export interface ExpiryLabel {
  text: string;
  urgency: 'none' | 'soon' | 'passed';
}

export function getExpiryLabel(batch: InventoryBatch, now = new Date()): ExpiryLabel | null {
  if (!batch.expiryDate || !batch.expiryType) return null;
  const daysRemaining = calendarDayNumber(batch.expiryDate) - localCalendarDayNumber(now);
  const subject = batch.expiryType === 'BEST_BEFORE' ? 'Bäst före' : 'Sista förbrukningsdag';
  const estimated = batch.expirySource === 'ESTIMATED';
  let text: string;
  let urgency: ExpiryLabel['urgency'] = 'none';

  if (daysRemaining < 0) {
    if (estimated) text = 'Uppskattat datum passerat';
    else if (batch.expiryType === 'USE_BY') text = 'Sista förbrukningsdag passerad';
    else text = 'Bäst före-datum passerat';
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
  const daysRemaining = calendarDayNumber(batch.expiryDate) - localCalendarDayNumber(now);
  return daysRemaining >= 0 && daysRemaining <= USE_SOON_DAYS;
}

function calendarDayNumber(value: string): number {
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

function localCalendarDayNumber(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
}
