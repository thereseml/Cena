import { BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import { imageSize } from 'image-size';
import type { ISizeCalculationResult } from 'image-size/dist/types/interface';
import {
  INVENTORY_UNITS,
  type FoodRecognitionConfidence,
  type FoodRecognitionResult,
  type FoodSuggestion,
  type InventoryUnit,
} from '@cena/contracts';
import { randomUUID } from 'node:crypto';
import type { FoodImageInput } from './food-recognition-provider';

export const HARD_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 20_000_000;
const MAX_SUGGESTIONS = 30;
const ALLOWED_IMAGE_TYPES = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
} as const;

export function validateFoodImage(
  file: { buffer?: Buffer; size?: number; mimetype?: string } | undefined,
): FoodImageInput {
  if (!file?.buffer || !file.size) {
    throw new BadRequestException('Välj en bild innan du försöker igen.');
  }
  const configuredMax = Number(process.env.FOOD_RECOGNITION_MAX_IMAGE_BYTES);
  const maxBytes =
    Number.isSafeInteger(configuredMax) && configuredMax > 0
      ? Math.min(configuredMax, HARD_MAX_IMAGE_BYTES)
      : HARD_MAX_IMAGE_BYTES;
  if (file.size > maxBytes || file.buffer.byteLength !== file.size) {
    throw new BadRequestException('Bilden är för stor. Välj en mindre bild och försök igen.');
  }

  let dimensions: ISizeCalculationResult;
  try {
    dimensions = imageSize(file.buffer);
  } catch {
    throw new BadRequestException(
      'Bilden kunde inte läsas. Välj en giltig JPEG-, PNG- eller WebP-bild.',
    );
  }
  const mimeType = dimensions.type
    ? ALLOWED_IMAGE_TYPES[dimensions.type as keyof typeof ALLOWED_IMAGE_TYPES]
    : undefined;
  if (!mimeType || file.mimetype !== mimeType) {
    throw new BadRequestException('Bildformatet stöds inte. Välj en JPEG-, PNG- eller WebP-bild.');
  }
  if (
    !dimensions.width ||
    !dimensions.height ||
    dimensions.width * dimensions.height > MAX_IMAGE_PIXELS
  ) {
    throw new BadRequestException('Bildens upplösning är för hög. Välj en mindre bild.');
  }

  return { bytes: file.buffer, mimeType };
}

export function normalizeFoodRecognition(value: unknown): FoodRecognitionResult {
  const rawItems = isRecord(value) && Array.isArray(value.items) ? value.items : null;
  if (!rawItems) {
    throw new UnprocessableEntityException('Matförslagen kunde inte läsas. Försök igen.');
  }
  if (rawItems.length > MAX_SUGGESTIONS) {
    throw new UnprocessableEntityException(
      'Bilden gav för många förslag. Försök med en tydligare bild.',
    );
  }

  const items: FoodSuggestion[] = [];
  const seen = new Set<string>();
  for (const candidate of rawItems) {
    if (!isRecord(candidate) || typeof candidate.name !== 'string') continue;
    const name = candidate.name.trim();
    if (!name || name.length > 100) continue;

    const quantity = validQuantity(candidate.quantity) ? candidate.quantity : null;
    const unit = isInventoryUnit(candidate.unit) ? candidate.unit : null;
    const confidence = isConfidence(candidate.confidence) ? candidate.confidence : 'LOW';
    const description =
      typeof candidate.description === 'string' && candidate.description.trim().length > 0
        ? candidate.description.trim().slice(0, 120)
        : null;
    const duplicateKey = `${name.toLocaleLowerCase('sv-SE')}|${quantity ?? ''}|${unit ?? ''}`;
    if (seen.has(duplicateKey)) continue;
    seen.add(duplicateKey);
    items.push({
      id: randomUUID(),
      name,
      quantity,
      unit,
      description,
      confidence,
      needsReview: true,
    });
  }

  return { items };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isInventoryUnit(value: unknown): value is InventoryUnit {
  return typeof value === 'string' && INVENTORY_UNITS.includes(value as InventoryUnit);
}

function isConfidence(value: unknown): value is FoodRecognitionConfidence {
  return value === 'HIGH' || value === 'MEDIUM' || value === 'LOW';
}

function validQuantity(value: unknown): value is number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value <= 0 ||
    value > 999_999_999.999
  ) {
    return false;
  }
  const [coefficient, exponentText] = value.toString().toLowerCase().split('e');
  const fractionLength = coefficient.split('.')[1]?.length ?? 0;
  return fractionLength - Number(exponentText ?? 0) <= 3;
}
