import { BadRequestException } from '@nestjs/common';
import { INVENTORY_UNITS, type InventoryUnit } from '@cena/contracts';

export interface ParsedShoppingItem {
  name: string;
  quantity: number | null;
  unit: InventoryUnit | null;
}

export function parseShoppingItem(value: unknown): ParsedShoppingItem {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Kontrollera varan och försök igen.');
  }
  const input = value as Record<string, unknown>;
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name || name.length > 100)
    throw new BadRequestException('Ange ett namn på högst 100 tecken.');
  const quantity = input.quantity === undefined ? null : input.quantity;
  const unit = input.unit === undefined ? null : input.unit;
  if (
    quantity !== null &&
    (typeof quantity !== 'number' ||
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      quantity > 999_999_999.999 ||
      decimalPlaces(quantity) > 3)
  ) {
    throw new BadRequestException('Mängden måste vara större än noll och ha högst tre decimaler.');
  }
  if (unit !== null && !INVENTORY_UNITS.includes(unit as InventoryUnit)) {
    throw new BadRequestException('Välj en giltig enhet.');
  }
  if ((quantity === null) !== (unit === null)) {
    throw new BadRequestException('Ange både mängd och enhet, eller lämna båda tomma.');
  }
  return { name, quantity: quantity as number | null, unit: unit as InventoryUnit | null };
}

export function parseExpectedVersion(value: unknown): number {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Läs in listan igen innan du sparar ändringar.');
  }
  const version = (value as Record<string, unknown>).expectedVersion;
  if (typeof version !== 'number' || !Number.isSafeInteger(version) || version < 0) {
    throw new BadRequestException('Läs in listan igen innan du sparar ändringar.');
  }
  return version;
}

function decimalPlaces(value: number): number {
  const [coefficient, exponentText] = value.toString().toLowerCase().split('e');
  return (coefficient.split('.')[1]?.length ?? 0) - Number(exponentText ?? 0);
}
