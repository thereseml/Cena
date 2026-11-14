import {
  classifyProduct,
  parseReceipt,
  suggestStorage,
  type ReceiptOcrLine,
  type ReceiptOcrResult,
} from '../features/receipt-import/receipt-parser';

function ocr(text: string): ReceiptOcrResult {
  return { text, lines: text.split('\n').map((line) => ({ text: line })) };
}

// SANITIZED SYNTHETIC, retailer-inspired examples, NOT verified real retailer formats.
const fixtures = [
  {
    retailer: 'ICA',
    text: 'ICA TESTBUTIK\nMJÖLK 1L 12,90 A\n2 st x 12,90\nÄGG 12P 34,90 A\nMedlemsrabatt -3,00\nPANT 2,00\nSUMMA 59,70\nMOMS 12% 6,40\nKortnummer ****0000',
    names: ['MJÖLK 1L', 'ÄGG 12P'],
    quantities: [2, null],
    prices: [12.9, 34.9],
  },
  {
    retailer: 'Coop',
    text: 'Coop TESTBUTIK\nBANANER 18,72\n0,752 kg x 24,90\nHANDTVÅL 19,90 B\nRabatt handtvål -2,00\nAtt betala 36,62\nVarav moms 3,92\nTack för ditt köp',
    names: ['BANANER', 'HANDTVÅL'],
    quantities: [0.752, null],
    prices: [18.72, 19.9],
  },
  {
    retailer: 'Willys',
    text: 'Willys TESTBUTIK\nPASTA 500G 14.90\nTOMAT KROSS 400G 2 st x 9,90 19,80 A\nPLASTPÅSE 3,00\nKupong -5,00\nTotalt 32,70\n12% 3,50 29,20\nSwish 32,70',
    names: ['PASTA 500G', 'Krossade tomater 400G', 'PLASTPÅSE'],
    quantities: [null, 2, null],
    prices: [14.9, 19.8, 3],
  },
  {
    retailer: 'Hemköp',
    text: 'Hemköp TESTBUTIK\nKYCK FILÉ 49,90 *\nFRYST LAX 89,90 A\nMYSTERIEVARA 17,00\nReturpant -2,00\nÖresavrundning 0,20\nTOTALT 155,00\n2026-01-01 12:00\nKassa 1',
    names: ['Kycklingfilé', 'FRYST LAX', 'MYSTERIEVARA'],
    quantities: [null, null, null],
    prices: [49.9, 89.9, 17],
  },
  {
    retailer: 'Lidl',
    text: 'Lidl TESTBUTIK\nYOGHURT 1KG 24,90 B\nBASILIKA 12:-\nBÄRKASSE 5,00\nRabatt -1,00\nNETTO MOMS BRUTTO\n25% 1,00 4,00\nATT BETALA 40,90\nVISA 40,90\nwww.example.invalid',
    names: ['YOGHURT 1KG', 'BASILIKA', 'BÄRKASSE'],
    quantities: [null, null, null],
    prices: [24.9, 12, 5],
  },
];

describe('deterministic receipt parsing', () => {
  it.each(fixtures)(
    'parses the synthetic $retailer example',
    ({ text, names, quantities, prices }) => {
      const result = parseReceipt(ocr(text));
      expect(result.products.map((p) => p.name)).toEqual(names);
      expect(result.products.map((p) => p.quantity)).toEqual(quantities);
      expect(result.products.map((p) => p.price)).toEqual(prices);
      expect(result.unrecognizedLines).toEqual([]);
    },
  );

  it('exports complete candidates with stable unique IDs and preserves exact OCR text', () => {
    const input = ocr('  MJÖLK 1L   12,90 A  \n  2 st x 12,90  \nMJÖLK 1L 12,90 A');
    expect(parseReceipt(input).products).toEqual([
      {
        id: 'receipt-product-1',
        name: 'MJÖLK 1L',
        originalText: '  MJÖLK 1L   12,90 A  \n  2 st x 12,90  ',
        quantity: 2,
        unit: 'st',
        price: 12.9,
        classification: 'FOOD',
        storageLocation: 'FRIDGE',
      },
      {
        id: 'receipt-product-2',
        name: 'MJÖLK 1L',
        originalText: 'MJÖLK 1L 12,90 A',
        quantity: null,
        unit: null,
        price: 12.9,
        classification: 'FOOD',
        storageLocation: 'FRIDGE',
      },
    ]);
    expect(parseReceipt(input)).toEqual(parseReceipt(input));
  });

  it.each(['MJÖLK 1L', 'ÄGG 12P', 'PASTA 500G', 'YOGHURT 1 KG', 'MJÖLK 1,5%'])(
    'does not turn package size or fat percentage into quantity: %s',
    (name) => {
      expect(parseReceipt(ocr(`${name} 24,90`)).products[0]).toMatchObject({
        name,
        quantity: null,
        unit: null,
        price: 24.9,
      });
    },
  );

  it.each([
    ['2 st x 12,90', 2, 'st'],
    ['0,752 kg x 24,90', 0.752, 'kg'],
    ['250 g × 0,10/g', 250, 'g'],
    ['500 ml * 0.02/ml', 500, 'ml'],
    ['1.5 l X 10,00/l', 1.5, 'l'],
  ])('reads explicit quantity %s without inventing a total', (line, quantity, unit) => {
    expect(parseReceipt(ocr(`MJÖLK\n${line}`)).products[0]).toMatchObject({
      quantity,
      unit,
      price: null,
    });
  });

  it('accepts an explicit continuation total and preserves the printed amount rather than recalculating', () => {
    expect(parseReceipt(ocr('BANANER\n0,752 kg x 24,90/kg 18,72 A')).products[0]).toMatchObject({
      quantity: 0.752,
      unit: 'kg',
      price: 18.72,
    });
  });

  it('keeps orphan, repeated and interrupted quantities separate', () => {
    const result = parseReceipt(
      ocr(
        '2 st x 12,90\nMJÖLK 12,90\nRabatt -1,00\n3 st x 12,90\nÄGG 34,90\n2 st x 34,90\n4 st x 34,90',
      ),
    );
    expect(result.products.map((p) => p.quantity)).toEqual([null, 2]);
    expect(result.unrecognizedLines).toEqual(['2 st x 12,90', '3 st x 12,90', '4 st x 34,90']);
  });

  it('never uses prices as quantity and preserves uncertain numeric text', () => {
    const result = parseReceipt(
      ocr('MJÖLK 12,90\n12,90\nMJÖLK 25\nÄGG 2 x 34,90\n???\n-5,00\nOtydlig rad'),
    );
    expect(result.products.map((p) => [p.quantity, p.unit])).toEqual([
      [null, null],
      [null, null],
      [null, null],
    ]);
    expect(result.products[1]).toMatchObject({ name: 'MJÖLK 25', price: null });
    expect(result.unrecognizedLines).toEqual(['12,90', '???', '-5,00', 'Otydlig rad']);
  });

  it('retains unknown priced products, while keeping unreadable text separately', () => {
    expect(parseReceipt(ocr('XQZ SPECIAL 19,90\n???')).products[0]).toMatchObject({
      name: 'XQZ SPECIAL',
      classification: 'UNKNOWN',
      storageLocation: null,
    });
    expect(parseReceipt(ocr('XQZ SPECIAL 19,90\n???')).unrecognizedLines).toEqual(['???']);
  });

  it('retains unknown receipt labels even when OCR misses the price', () => {
    const result = parseReceipt(ocr('MYSTERIEVARA\nOKÄND PRODUKT\n???'));
    expect(result.products).toEqual([
      expect.objectContaining({
        name: 'MYSTERIEVARA',
        classification: 'UNKNOWN',
        quantity: null,
        unit: null,
        price: null,
        storageLocation: null,
      }),
      expect.objectContaining({
        name: 'OKÄND PRODUKT',
        classification: 'UNKNOWN',
        quantity: null,
        unit: null,
        price: null,
        storageLocation: null,
      }),
    ]);
    expect(result.unrecognizedLines).toEqual(['???']);
  });

  it('does not confuse retailer-branded products with receipt headers', () => {
    const result = parseReceipt(
      ocr('ICA TESTBUTIK\nICA MJÖLK 1L 12,90\nCoop SPECIAL 19,90\nICA PASTA'),
    );
    expect(result.products.map((p) => p.name)).toEqual([
      'ICA MJÖLK 1L',
      'Coop SPECIAL',
      'ICA PASTA',
    ]);
  });

  it('keeps unnamed negative adjustments out of products without losing them', () => {
    const result = parseReceipt(ocr('MJÖLK -5,00\nPASTA - 3,00 A\nBASILIKA 12,90'));
    expect(result.products.map((p) => p.name)).toEqual(['BASILIKA']);
    expect(result.unrecognizedLines).toEqual(['MJÖLK -5,00', 'PASTA - 3,00 A']);
  });

  it.each(['0,1234 kg x 24,90', '12345678 st x 12,90', '-2 st x 12,90'])(
    'does not parse a suffix of a malformed quantity: %s',
    (line) => {
      const result = parseReceipt(ocr(`MJÖLK ${line}`));
      expect(result.products.every((p) => p.quantity === null && p.unit === null)).toBe(true);
    },
  );

  it('strips only terminal reliable prices and VAT markers', () => {
    const result = parseReceipt(
      ocr('SPECIAL A 1,5% 1L 1 234,50 kr B\nSPECIAL 12,9\nBASILIKA\nMJÖLK 12,90 Z'),
    );
    expect(result.products.map((p) => [p.name, p.price])).toEqual([
      ['SPECIAL A 1,5% 1L', 1234.5],
      ['BASILIKA', null],
      ['MJÖLK 12,90 Z', null],
    ]);
    expect(result.unrecognizedLines).toEqual(['SPECIAL 12,9']);
  });

  it('matches metadata words exactly without stripping product prefixes or package sizes', () => {
    const result = parseReceipt(
      ocr(
        'TOTALKORN PASTA 500G 14,90 A\nPANTER SPECIAL 1L 12,90 B\nMOMSFAVORIT 12P 19,90\nSUMMA 47,70\nMOMS 12% 5,11\nPANT 2,00\nRABATT -2,00',
      ),
    );
    expect(
      result.products.map((product) => [
        product.name,
        product.price,
        product.quantity,
        product.unit,
      ]),
    ).toEqual([
      ['TOTALKORN PASTA 500G', 14.9, null, null],
      ['PANTER SPECIAL 1L', 12.9, null, null],
      ['MOMSFAVORIT 12P', 19.9, null, null],
    ]);
    expect(result.unrecognizedLines).toEqual([]);
  });

  it('reconstructs shuffled positioned rows and separate price columns', () => {
    const framed = (text: string, left: number, top: number): ReceiptOcrLine => ({
      text,
      frame: { left, top, right: left + 60, bottom: top + 12 },
    });
    const input = {
      text: 'ignored fallback',
      lines: [
        framed('34,90 A', 200, 41),
        framed('ÄGG 12P', 0, 40),
        framed('2 st x 12,90', 0, 20),
        framed('12,90 A', 200, 1),
        framed('MJÖLK 1L', 0, 0),
      ],
    };
    expect(parseReceipt(input).products).toEqual([
      expect.objectContaining({
        name: 'MJÖLK 1L',
        quantity: 2,
        price: 12.9,
        originalText: 'MJÖLK 1L\n12,90 A\n2 st x 12,90',
      }),
      expect.objectContaining({ name: 'ÄGG 12P', quantity: null, price: 34.9 }),
    ]);
  });

  it('keeps unpositioned anchors and does not mutate input', () => {
    const input = ocr('MJÖLK 12,90\nÄGG 34,90');
    input.lines[0].frame = { left: 0, top: 50, right: 100, bottom: 60 };
    const before = JSON.stringify(input);
    expect(parseReceipt(input).products.map((p) => p.name)).toEqual(['MJÖLK', 'ÄGG']);
    expect(JSON.stringify(input)).toBe(before);
  });

  it('uses text only when structured lines are absent, including CRLF', () => {
    expect(parseReceipt({ text: 'MJÖLK 12,90\r\nÄGG 34,90', lines: [] }).products).toHaveLength(2);
    expect(
      parseReceipt({ text: 'MJÖLK 12,90', lines: [{ text: 'ÄGG 34,90' }] }).products.map(
        (p) => p.name,
      ),
    ).toEqual(['ÄGG']);
    expect(parseReceipt({ text: '', lines: [] })).toEqual({ products: [], unrecognizedLines: [] });
  });
});

describe('conservative classification and storage suggestions', () => {
  it.each([
    'HANDTVÅL BASILIKA',
    'HAND TVÅL BASILIKA',
    'TVÅL TIMJAN',
    'DISKMEDEL CITRON',
    'TVÄTTMEDEL',
    'TANDKRÄM',
    'PLASTPÅSE',
    'KATTMAT LAX',
  ])('recognizes specific nonfood: %s', (name) => {
    expect(classifyProduct(name)).toBe('NON_FOOD');
    expect(suggestStorage(name)).toBeNull();
  });

  it.each(['BASILIKA', 'TIMJAN', 'OREGANO', 'KYCK FILÉ', 'TOMAT KROSS', 'MJÖLK 1L'])(
    'recognizes food without broad substring matching: %s',
    (name) => {
      expect(classifyProduct(name)).toBe('FOOD');
    },
  );

  it.each(['OKÄND', 'RISLAMPA', 'GLASSKÅL', 'OSTHYVEL', 'FRYST SPECIAL', ''])(
    'leaves unknown items unclassified and without storage: %s',
    (name) => {
      expect(classifyProduct(name)).toBe('UNKNOWN');
      expect(suggestStorage(name)).toBeNull();
    },
  );

  it.each([
    ['MJÖLK', 'FRIDGE'],
    ['KYCK FILÉ', null],
    ['ÄGG 12P', 'FRIDGE'],
    ['PASTA 500G', 'PANTRY'],
    ['TOMAT KROSS', 'PANTRY'],
    ['KAFFE', 'PANTRY'],
    ['FRYST LAX', 'FREEZER'],
    ['FRYST MJÖLK', 'FREEZER'],
    ['FRYST PASTA', 'FREEZER'],
    ['GLASS', 'FREEZER'],
    ['BASILIKA', null],
    ['BANANER', null],
  ])('suggests storage for %s', (name, storage) => {
    expect(suggestStorage(name)).toBe(storage);
  });

  it.each([
    ['FÄRSK PASTA', 'FRIDGE'],
    ['FÄRSK SPAGHETTI', 'FRIDGE'],
    ['TORKAD KORV', null],
    ['TORKAD KORV MED PASTA', null],
    ['LAX MED PASTA', null],
    ['KYCKLING RIS', null],
    ['TORKAD LAX', null],
    ['RÖKT LAX', null],
    ['LAX', null],
    ['KYCKLING', null],
    ['KYCKLINGFILÉ', null],
    ['KYCK FILÉ', null],
    ['KÖTT', null],
    ['NÖTKÖTT', null],
    ['KÖTTFÄRS', null],
    ['KORV', null],
    ['BACON', null],
    ['FÄRSK LAX', 'FRIDGE'],
    ['FÄRSK KYCKLING', 'FRIDGE'],
    ['FÄRSKT KÖTT', 'FRIDGE'],
    ['TORKAD PASTA', 'PANTRY'],
    ['TORRA LINSER', 'PANTRY'],
    ['TORKADE BÖNOR', 'PANTRY'],
    ['KONSERVERAD LAX', null],
    ['TORKAD MJÖLK', null],
    ['UHT MJÖLK', null],
    ['FÄRSK TORKAD PASTA', null],
    ['TORKAD FÄRSK KORV', null],
    ['FÄRSK KONSERVERAD LAX', null],
    ['FÄRSK FRYST PASTA', 'FREEZER'],
    ['FRYST FÄRSK PASTA', 'FREEZER'],
    ['FÄRSK FRYST LAX', 'FREEZER'],
    ['FRYST FÄRSK LAX', 'FREEZER'],
    ['FRYST TORKAD KORV', 'FREEZER'],
  ])('uses explicit forms instead of assuming storage: %s', (name, storage) => {
    expect(classifyProduct(name)).toBe('FOOD');
    expect(suggestStorage(name)).toBe(storage);
    expect(parseReceipt(ocr(`${name} 24,90 A`)).products[0]).toMatchObject({
      originalText: `${name} 24,90 A`,
      classification: 'FOOD',
      storageLocation: storage,
      quantity: null,
      unit: null,
      price: 24.9,
    });
  });

  it.each([
    'DOFTLJUS BASILIKA',
    'DISKTRASA ÄPPLE',
    'DISKTRASOR ÄPPLE',
    'PRESENTKORT PASTA',
    'RENGÖRINGSMEDEL ÄPPLE',
    'ALLRENGÖRING BASILIKA',
    'SCHAMPO ÄPPLE',
    'SHAMPOO ÄPPLE',
    'DUSCHKRÄM MJÖLK',
    'TOALETT PAPPER',
    'HUSHÅLLSPAPPER',
    'PLAST PÅSE',
    'PAPPERSPÅSE',
    'BÄRKASSE',
    'AVFALLSPÅSAR ÄPPLE',
    'FRYSPÅSAR LAX',
    'SERVICEAVGIFT PASTA',
    'LEVERANSAVGIFT MJÖLK',
  ])('does not select a household item as food because of its scent or label: %s', (name) => {
    expect(classifyProduct(name)).toBe('NON_FOOD');
    expect(suggestStorage(name)).toBeNull();
    expect(parseReceipt(ocr(`${name} 19,90 B`)).products[0]).toMatchObject({
      name,
      classification: 'NON_FOOD',
      storageLocation: null,
      quantity: null,
      unit: null,
      price: 19.9,
    });
  });

  it.each(['BASILIKA', 'ÄPPLE', 'TIMJAN', 'LJUS SIRAP', 'KAFFE PÅSE', 'PASTA PRESENTKORTSFAVORIT'])(
    'does not overexclude legitimate or ambiguous food labels: %s',
    (name) => {
      expect(classifyProduct(name)).not.toBe('NON_FOOD');
    },
  );
});

describe('bounded runtime OCR validation', () => {
  it.each<unknown>([
    null,
    undefined,
    {},
    { text: 123, lines: [] },
    { text: '', lines: null },
    { text: '', lines: [null] },
    { text: '', lines: [{ text: 42 }] },
    { text: 'x'.repeat(100_001), lines: [] },
    { text: '', lines: Array.from({ length: 2_001 }, () => ({ text: '' })) },
    { text: '', lines: [{ text: 'x'.repeat(1_001) }] },
    { text: '', lines: Array.from({ length: 101 }, () => ({ text: 'x'.repeat(1_000) })) },
    { text: '', lines: [{ text: 'MJÖLK\nÄGG' }] },
    { text: '\u0000', lines: [] },
    { text: 'x'.repeat(1_001), lines: [] },
  ])('rejects malformed or oversized input without silent truncation: %#', (input) => {
    expect(() => parseReceipt(input as ReceiptOcrResult)).toThrow(Error);
  });

  it.each([
    { left: 0, top: NaN, right: 10, bottom: 10 },
    { left: 0, top: 0, right: Infinity, bottom: 10 },
    { left: -1, top: 0, right: 10, bottom: 10 },
    { left: 0, top: 10, right: 10, bottom: 0 },
    { left: 0, top: 0, right: 0, bottom: 10 },
    { left: 0, top: 0, right: 1_000_001, bottom: 10 },
    null,
    {},
  ])('rejects invalid geometry: %#', (frame) => {
    expect(() =>
      parseReceipt({ text: '', lines: [{ text: 'MJÖLK', frame }] } as ReceiptOcrResult),
    ).toThrow(Error);
  });

  it.each(['0 st x 12,90', '1000001 kg x 12,90'])(
    'preserves invalid explicit quantities for review: %s',
    (line) => {
      const result = parseReceipt(ocr(`MJÖLK\n${line}`));
      expect(result.products[0].quantity).toBeNull();
      expect(result.unrecognizedLines).toEqual([line]);
    },
  );
});
