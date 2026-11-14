import { BadRequestException } from '@nestjs/common';
import {
  EXPIRY_SOURCES,
  EXPIRY_TYPES,
  INVENTORY_UNITS,
  STORAGE_LOCATIONS,
  type ExpirySource,
  type ExpiryType,
  type InventoryUnit,
  type SaveInventoryItemInput,
  type StorageLocation,
} from '@cena/contracts';

const UNIT_TO_DATABASE = {
  st: 'PIECE',
  g: 'GRAM',
  kg: 'KILOGRAM',
  ml: 'MILLILITER',
  l: 'LITER',
} as const;
const UNIT_FROM_DATABASE = {
  PIECE: 'st',
  GRAM: 'g',
  KILOGRAM: 'kg',
  MILLILITER: 'ml',
  LITER: 'l',
} as const;

export function parseInventoryInput(
  value: unknown,
  options: { allowEstimated?: boolean } = {},
): SaveInventoryItemInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Kontrollera uppgifterna och försök igen.');
  }

  const input = value as Record<string, unknown>;
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name || name.length > 100) {
    throw new BadRequestException('Ange ett namn på högst 100 tecken.');
  }

  if (
    typeof input.quantity !== 'number' ||
    !Number.isFinite(input.quantity) ||
    input.quantity <= 0 ||
    input.quantity > 999_999_999.999 ||
    decimalPlaces(input.quantity) > 3
  ) {
    throw new BadRequestException('Mängden måste vara större än noll och ha högst tre decimaler.');
  }

  if (!INVENTORY_UNITS.includes(input.unit as InventoryUnit)) {
    throw new BadRequestException('Välj en giltig enhet.');
  }
  if (!STORAGE_LOCATIONS.includes(input.storageLocation as StorageLocation)) {
    throw new BadRequestException('Välj en giltig förvaringsplats.');
  }

  const expiryDate = input.expiryDate;
  const expiryType = input.expiryType;
  const expirySource = input.expirySource;
  const hasExpiryMetadata = [expiryDate, expiryType, expirySource].some(
    (metadata) => metadata !== undefined && metadata !== null,
  );
  if (!hasExpiryMetadata) {
    return {
      name,
      quantity: input.quantity,
      unit: input.unit as InventoryUnit,
      storageLocation: input.storageLocation as StorageLocation,
      expiryDate: null,
      expiryType: null,
      expirySource: null,
    };
  }

  if (
    typeof expiryDate !== 'string' ||
    !isCalendarDate(expiryDate) ||
    !EXPIRY_TYPES.includes(expiryType as ExpiryType) ||
    !EXPIRY_SOURCES.includes(expirySource as ExpirySource) ||
    (expirySource !== 'USER_ENTERED' && !(options.allowEstimated && expirySource === 'ESTIMATED'))
  ) {
    throw new BadRequestException('Kontrollera datumet och datumtypen.');
  }

  return {
    name,
    quantity: input.quantity,
    unit: input.unit as InventoryUnit,
    storageLocation: input.storageLocation as StorageLocation,
    expiryDate,
    expiryType: expiryType as ExpiryType,
    expirySource: expirySource as ExpirySource,
  };
}

export function parseInventoryInputs(value: unknown): SaveInventoryItemInput[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Kontrollera varorna och försök igen.');
  }
  const items = (value as Record<string, unknown>).items;
  if (!Array.isArray(items) || items.length === 0 || items.length > 30) {
    throw new BadRequestException('Välj mellan 1 och 30 varor att lägga till.');
  }
  return items.map((item) => parseInventoryInput(item));
}

export function parseExpectedVersion(value: unknown): number {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Läs in varan igen innan du sparar ändringar.');
  }
  const version = (value as Record<string, unknown>).expectedVersion;
  if (typeof version !== 'number' || !Number.isSafeInteger(version) || version < 0) {
    throw new BadRequestException('Läs in varan igen innan du sparar ändringar.');
  }
  return version;
}

export function parseIdempotencyKey(value: unknown): string {
  if (
    typeof value !== 'string' ||
    value.length < 8 ||
    value.length > 128 ||
    !/^[A-Za-z0-9._:-]+$/.test(value)
  ) {
    throw new BadRequestException('Begäran saknar en giltig nyckel. Försök igen.');
  }
  return value;
}

export function unitToDatabase(unit: InventoryUnit) {
  return UNIT_TO_DATABASE[unit];
}

export function unitFromDatabase(unit: keyof typeof UNIT_FROM_DATABASE): InventoryUnit {
  return UNIT_FROM_DATABASE[unit];
}

export function dateToDatabase(date: string | null): Date | null {
  return date === null ? null : new Date(`${date}T00:00:00.000Z`);
}

export function dateFromDatabase(date: Date | null): string | null {
  return date === null ? null : date.toISOString().slice(0, 10);
}

function decimalPlaces(value: number): number {
  const [coefficient, exponentText] = value.toString().toLowerCase().split('e');
  const fractionLength = coefficient.split('.')[1]?.length ?? 0;
  return fractionLength - Number(exponentText ?? 0);
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}
