import type { SaveInventoryItemInput } from '@cena/contracts';
import type { ReceiptProduct } from './receipt-parser';

export interface ReceiptReviewItem extends Omit<ReceiptProduct, 'quantity'> {
  quantity: string;
  selected: boolean;
  suggestedQuantity: boolean;
  suggestedUnit: boolean;
}

export function toReviewItem(product: ReceiptProduct): ReceiptReviewItem {
  return {
    ...product,
    quantity: String(product.quantity ?? 1).replace('.', ','),
    unit: product.unit ?? 'st',
    selected: product.classification === 'FOOD',
    suggestedQuantity: product.quantity === null,
    suggestedUnit: product.unit === null,
  };
}

export function reviewItemError(item: ReceiptReviewItem): string | null {
  if (!item.name.trim() || item.name.trim().length > 100) return 'Ange ett namn med 1–100 tecken.';
  const quantity = item.quantity.trim().replace(',', '.');
  if (
    !/^\d+(?:\.\d{1,3})?$/.test(quantity) ||
    Number(quantity) <= 0 ||
    Number(quantity) > 999_999_999.999
  ) {
    return 'Ange en mängd större än noll, högst 999 999 999,999 och med högst tre decimaler.';
  }
  if (!item.unit) return 'Välj en enhet.';
  if (!item.storageLocation) return 'Välj förvaring innan du lägger till varan.';
  return null;
}

export function toInventoryInput(item: ReceiptReviewItem): SaveInventoryItemInput {
  if (reviewItemError(item) || !item.unit || !item.storageLocation) {
    throw new Error('INVALID_RECEIPT_REVIEW');
  }
  return {
    name: item.name.trim(),
    quantity: Number(item.quantity.trim().replace(',', '.')),
    unit: item.unit,
    storageLocation: item.storageLocation,
    expiryDate: null,
    expiryType: null,
    expirySource: null,
  };
}

export function receiptErrorMessage(error: unknown): string {
  const code =
    error instanceof Error
      ? 'code' in error && typeof error.code === 'string'
        ? error.code
        : error.message
      : '';
  switch (code) {
    case 'UNSUPPORTED_IMAGE':
      return 'Bildformatet stöds inte. Välj en JPEG-, PNG-, WebP- eller HEIC-bild.';
    case 'IMAGE_TOO_LARGE':
      return 'Bilden är för stor. Välj en mindre bild eller ta ett nytt foto.';
    case 'INVALID_IMAGE':
      return 'Bilden kunde inte öppnas. Välj en annan bild eller ta ett nytt foto.';
    case 'NO_TEXT':
      return 'Ingen text kunde läsas. Ta en tydligare bild av hela kvittot.';
    case 'OCR_UNAVAILABLE':
      return 'Kvittoläsningen kunde inte starta. Kontrollera anslutningen så att appens OCR-filer kan hämtas och försök igen. Använd Cena i Expo Go eller som app på iOS eller Android. Du kan också lägga till manuellt.';
    default:
      return 'Kvittot kunde inte läsas. Försök igen med en tydligare bild eller lägg till manuellt.';
  }
}
