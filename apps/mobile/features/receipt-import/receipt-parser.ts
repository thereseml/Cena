import type { InventoryUnit, StorageLocation } from '@cena/contracts';

export interface ReceiptOcrLine {
  text: string;
  confidence?: number;
  frame?: { left: number; top: number; right: number; bottom: number };
}

export interface ReceiptOcrResult {
  text: string;
  lines: ReceiptOcrLine[];
  confidence?: number;
}

export type ReceiptClassification = 'FOOD' | 'NON_FOOD' | 'UNKNOWN';

export interface ReceiptProduct {
  id: string;
  name: string;
  originalText: string;
  quantity: number | null;
  unit: InventoryUnit | null;
  price: number | null;
  classification: ReceiptClassification;
  storageLocation: StorageLocation | null;
}

export interface ParsedReceipt {
  products: ReceiptProduct[];
  unrecognizedLines: string[];
}

const MAX_TEXT_LENGTH = 100_000;
const MAX_LINES = 2_000;
const MAX_LINE_LENGTH = 1_000;
const MAX_COORDINATE = 1_000_000;
const LETTER = /[a-zåäö]/i;
const MONEY = '(?:\\d{1,3}(?:[ \\u00a0]\\d{3})+|\\d{1,7})(?:[,.]\\d{2}|:-)';
const PRICE_END = new RegExp(`\\s+(${MONEY})(?:\\s*(?:kr|sek))?(?:\\s*[ABC*])?$`, 'i');
const QUANTITY = new RegExp(
  `^((?:.*\\s)?)(\\d{1,7}(?:[,.]\\d{1,3})?)\\s*(st|kg|g|ml|l)\\s*[x×*]\\s*(${MONEY})(?:\\s*\\/\\s*(?:st|kg|g|ml|l))?(?:\\s+(${MONEY}))?(?:\\s*(?:kr|sek))?(?:\\s*[ABC*])?$`,
  'i',
);
const NON_FOOD = new RegExp(
  `(?:^|[^a-zåäö])(?:${[
    'hand\\s*tvål',
    'tvål',
    'schampo',
    'shampoo',
    'tandkräm',
    'duschkräm',
    'duschgel',
    'diskmedel',
    'maskindiskmedel',
    'tvättmedel',
    'sköljmedel',
    'rengöringsmedel',
    'allrengöring',
    'diskborste',
    'disktrasa',
    'disktrasor',
    'doftljus',
    'värmeljus',
    'toalett\\s*papper',
    'hushålls\\s*papper',
    'batterier',
    'servetter',
    'plast\\s*påse',
    'pappers\\s*påse',
    'bär\\s*kasse',
    'kasse',
    'soppåsar',
    'avfallspåsar',
    'fryspåsar',
    'hundmat',
    'kattmat',
    'presentkort',
    'avgift',
    'serviceavgift',
    'leveransavgift',
    'expeditionsavgift',
  ].join('|')})(?=$|[^a-zåäö])`,
);
const FOOD =
  /(?:^|[^a-zåäö])(?:mjölk|mellanmjölk|standardmjölk|lättmjölk|havredryck|yoghurt|fil|filmjölk|grädde|vispgrädde|matlagningsgrädde|smör|ost|ägg|kyckling|kycklingfilé|lax|torsk|kött|nötkött|fläskkött|köttfärs|nötfärs|fläskfärs|korv|bacon|tofu|tomat|tomater|gurka|potatis|morot|morötter|lök|banan|bananer|äpple|äpplen|päron|paprika|broccoli|spenat|ärtor|jordgubbar|blåbär|hallon|pasta|spaghetti|ris|havregryn|mjöl|vetemjöl|socker|salt|peppar|basilika|timjan|oregano|koriander|bröd|knäckebröd|kaffe|te|olivolja|rapsolja|bönor|linser|krossade tomater|tomatpuré|glass|pizza|juice|läsk)(?=$|[^a-zåäö])/;
const FREEZER = /(?:^|[^a-zåäö])(?:fryst|frysta|djupfryst|djupfrysta|frys|glass)(?=$|[^a-zåäö])/;
const FRIDGE =
  /(?:^|[^a-zåäö])(?:mjölk|mellanmjölk|standardmjölk|lättmjölk|yoghurt|fil|filmjölk|grädde|vispgrädde|matlagningsgrädde|smör|ost|ägg|morot|morötter|broccoli|spenat)(?=$|[^a-zåäö])/;
const PANTRY =
  /(?:^|[^a-zåäö])(?:pasta|spaghetti|ris|havregryn|mjöl|vetemjöl|socker|salt|peppar|kaffe|te|olivolja|rapsolja|knäckebröd|krossade tomater|tomatpuré)(?=$|[^a-zåäö])/;
const FRESH = /(?:^|[^a-zåäö])(?:färsk|färskt|färska|kyld|kylt|kylda)(?=$|[^a-zåäö])/;
const DRIED = /(?:^|[^a-zåäö])(?:torkad|torkat|torkade|torr|torrt|torra)(?=$|[^a-zåäö])/;
const DRIED_PANTRY = /(?:^|[^a-zåäö])(?:pasta|spaghetti|ris|bönor|linser)(?=$|[^a-zåäö])/;
const FORM_DEPENDENT =
  /(?:^|[^a-zåäö])(?:kyckling|kycklingfilé|lax|torsk|kött|nötkött|fläskkött|köttfärs|nötfärs|fläskfärs|korv|bacon|tofu)(?=$|[^a-zåäö])/;
const FRESH_PASTA = /(?:^|[^a-zåäö])(?:pasta|spaghetti)(?=$|[^a-zåäö])/;
const OTHER_FORM =
  /(?:^|[^a-zåäö])(?:konserv|konserverad|konserverat|konserverade|rökt|rökta|gravad|gravat|gravade|inlagd|inlagt|inlagda|uht)(?=$|[^a-zåäö])/;
const RETAILER_HEADER = /^(?:ica|coop|willys|hemköp|lidl)(?:\s|$)/i;
const METADATA =
  /^(?:(?:summa|totalt|total|att betala|varav moms|moms|moms%|netto|brutto|rabatt|medlemsrabatt|medlemspris|kupong|bonus|pant|returpant|avrundning|öresavrundning|kontant|kort|bankkort|visa|mastercard|swish|betalt|erhållet|tillbaka|växel|kvitto|kvittonr|kassa|kassör|org\.?nr|organisationsnummer|tel|telefon|medlem|kundnummer|kortnummer|terminal|aid|tvr|auth|tack|välkommen|www\.|https?:\/\/)(?:\b|\s|:)|\d{4}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}[-/]\d{4}|\d{2}:\d{2}|\d{1,2}[,.]?\d*\s*%|[-=* _]{3,}$)/i;
const NEGATIVE_AMOUNT = new RegExp(
  `(?:^|\\s)-\\s*${MONEY}(?:\\s*(?:kr|sek))?(?:\\s*[ABC*])?$`,
  'i',
);

function normalizedName(name: string): string {
  return name
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\bKYCK\s+FIL[ÉE](?=$|\s)/gi, 'Kycklingfilé')
    .replace(/\bTOMAT\s+KROSS(?=$|\s)/gi, 'Krossade tomater');
}

export function classifyProduct(name: string): ReceiptClassification {
  const normalized = normalizedName(name).toLowerCase();
  if (NON_FOOD.test(normalized)) return 'NON_FOOD';
  return FOOD.test(normalized) ? 'FOOD' : 'UNKNOWN';
}

export function suggestStorage(name: string): StorageLocation | null {
  const normalized = normalizedName(name).toLowerCase();
  if (classifyProduct(normalized) !== 'FOOD') return null;
  if (FREEZER.test(normalized)) return 'FREEZER';
  // Form qualifiers override category defaults; contradictory non-frozen forms need review.
  if (OTHER_FORM.test(normalized)) return null;
  if (DRIED.test(normalized)) {
    if (FRESH.test(normalized) || FORM_DEPENDENT.test(normalized)) return null;
    return DRIED_PANTRY.test(normalized) ? 'PANTRY' : null;
  }
  if (FRESH.test(normalized)) {
    return FORM_DEPENDENT.test(normalized) ||
      FRESH_PASTA.test(normalized) ||
      FRIDGE.test(normalized)
      ? 'FRIDGE'
      : null;
  }
  if (FORM_DEPENDENT.test(normalized)) return null;
  if (PANTRY.test(normalized)) return 'PANTRY';
  if (FRIDGE.test(normalized)) return 'FRIDGE';
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateInput(input: unknown): asserts input is ReceiptOcrResult {
  if (
    !isRecord(input) ||
    typeof input.text !== 'string' ||
    input.text.length > MAX_TEXT_LENGTH ||
    !Array.isArray(input.lines) ||
    input.lines.length > MAX_LINES
  ) {
    throw new Error('Invalid or oversized receipt OCR input');
  }
  let length = 0;
  for (const line of input.lines) {
    if (
      !isRecord(line) ||
      typeof line.text !== 'string' ||
      line.text.length > MAX_LINE_LENGTH ||
      /[\r\n\u0000]/.test(line.text)
    ) {
      throw new Error('Invalid or oversized receipt OCR line');
    }
    length += line.text.length;
    if (length > MAX_TEXT_LENGTH) throw new Error('Oversized receipt OCR lines');
    if (line.frame !== undefined) {
      const frame = line.frame;
      if (
        !isRecord(frame) ||
        !['left', 'top', 'right', 'bottom'].every(
          (key) =>
            typeof frame[key] === 'number' &&
            Number.isFinite(frame[key]) &&
            frame[key] >= 0 &&
            frame[key] <= MAX_COORDINATE,
        ) ||
        !(Number(frame.right) > Number(frame.left)) ||
        !(Number(frame.bottom) > Number(frame.top))
      ) {
        throw new Error('Invalid receipt OCR frame');
      }
    }
  }
  if (input.text.includes('\u0000')) throw new Error('Invalid receipt OCR text');
}

interface LogicalLine {
  text: string;
  originalText: string;
}

function orderedLines(input: ReceiptOcrResult): LogicalLine[] {
  // Structured lines are authoritative; full text is only a fallback, never a second receipt.
  const lines: ReceiptOcrLine[] = input.lines.length
    ? input.lines
    : input.text.split(/\r\n|\n|\r/).map((text) => ({ text }));
  if (lines.length > MAX_LINES || lines.some((line) => line.text.length > MAX_LINE_LENGTH)) {
    throw new Error('Oversized receipt OCR lines');
  }
  const result: LogicalLine[] = [];
  for (let index = 0; index < lines.length;) {
    if (!lines[index].frame) {
      result.push({ text: lines[index].text, originalText: lines[index].text });
      index++;
      continue;
    }
    // Missing frames act as anchors. Only reorder contiguous positioned runs.
    const positioned: ReceiptOcrLine[] = [];
    while (index < lines.length && lines[index].frame) positioned.push(lines[index++]);
    positioned.sort((a, b) => a.frame!.top - b.frame!.top || a.frame!.left - b.frame!.left);
    while (positioned.length) {
      const first = positioned.shift()!;
      const frame = first.frame!;
      const center = (frame.top + frame.bottom) / 2;
      const row = [first];
      for (let i = 0; i < positioned.length;) {
        const other = positioned[i].frame!;
        const tolerance = Math.min(frame.bottom - frame.top, other.bottom - other.top) * 0.35;
        if (Math.abs((other.top + other.bottom) / 2 - center) <= tolerance) {
          row.push(positioned.splice(i, 1)[0]);
        } else i++;
      }
      row.sort((a, b) => a.frame!.left - b.frame!.left);
      result.push({
        text: row.map((line) => line.text.trim()).join(' '),
        originalText: row.map((line) => line.text).join('\n'),
      });
    }
  }
  return result;
}

function decimal(value: string): number {
  return Number(
    value
      .replace(/[ \u00a0]/g, '')
      .replace(',', '.')
      .replace(':-', '.00'),
  );
}

export function parseReceipt(input: ReceiptOcrResult): ParsedReceipt {
  validateInput(input);
  const products: ReceiptProduct[] = [];
  const unrecognizedLines: string[] = [];
  let previous: ReceiptProduct | undefined;
  for (const line of orderedLines(input)) {
    const text = line.text.normalize('NFC').trim().replace(/\s+/g, ' ');
    if (!text) {
      previous = undefined;
      continue;
    }
    if (METADATA.test(text)) {
      previous = undefined;
      continue;
    }
    if (
      RETAILER_HEADER.test(text) &&
      !PRICE_END.test(text) &&
      classifyProduct(text) === 'UNKNOWN'
    ) {
      previous = undefined;
      continue;
    }
    if (NEGATIVE_AMOUNT.test(text)) {
      unrecognizedLines.push(line.originalText);
      previous = undefined;
      continue;
    }
    const quantityMatch = text.match(QUANTITY);
    const quantity = quantityMatch ? decimal(quantityMatch[2]) : null;
    if (quantityMatch && (!quantity || quantity > 1_000_000)) {
      unrecognizedLines.push(line.originalText);
      previous = undefined;
      continue;
    }
    if (quantityMatch && !quantityMatch[1].trim()) {
      if (previous && previous.quantity === null) {
        previous.quantity = quantity;
        previous.unit = quantityMatch[3].toLowerCase() as InventoryUnit;
        if (quantityMatch[5]) previous.price = decimal(quantityMatch[5]);
        previous.originalText += `\n${line.originalText}`;
      } else unrecognizedLines.push(line.originalText);
      previous = undefined;
      continue;
    }
    const priceMatch = quantityMatch ? null : text.match(PRICE_END);
    const name = normalizedName(
      quantityMatch ? quantityMatch[1] : priceMatch ? text.slice(0, priceMatch.index) : text,
    );
    const classification = classifyProduct(name);
    // An uppercase receipt label can still be a product when OCR loses its price.
    // Neither that label nor a price is evidence that the product is food.
    const unknownLabel = /^[A-ZÅÄÖ][A-ZÅÄÖ -]+$/.test(name);
    if (
      !LETTER.test(name) ||
      (classification === 'UNKNOWN' && !priceMatch && !quantityMatch && !unknownLabel) ||
      /^-/.test(name)
    ) {
      unrecognizedLines.push(line.originalText);
      previous = undefined;
      continue;
    }
    const product: ReceiptProduct = {
      id: `receipt-product-${products.length + 1}`,
      name,
      originalText: line.originalText,
      quantity,
      unit: quantityMatch ? (quantityMatch[3].toLowerCase() as InventoryUnit) : null,
      price: quantityMatch
        ? quantityMatch[5]
          ? decimal(quantityMatch[5])
          : null
        : priceMatch
          ? decimal(priceMatch[1])
          : null,
      classification,
      storageLocation: suggestStorage(name),
    };
    products.push(product);
    previous = product;
  }
  return { products, unrecognizedLines };
}
