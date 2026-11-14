import { act, fireEvent, render } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ImageManipulator } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router, usePreventRemove } from 'expo-router';
import { ReceiptImportFlow } from '../features/receipt-import/ReceiptImportFlow';
import { readReceipt, removeReceiptTempFiles } from '../features/receipt-import/receipt-ocr';
import { importReceiptItems } from '../features/receipt-import/receipt-import-api';
import {
  parseReceipt,
  type ParsedReceipt,
  type ReceiptProduct,
  type ReceiptOcrResult,
} from '../features/receipt-import/receipt-parser';
import { useAuth } from '../features/auth/AuthProvider';
import * as ReceiptReviewModule from '../features/receipt-import/ReceiptReview';
import type { ReceiptOcrEngineHandle } from '../features/receipt-import/ReceiptOcrEngine';

const mockRecognize = jest.fn<Promise<ReceiptOcrResult>, [string]>();
const mockCancel = jest.fn();
const mockDelete = jest.fn();
const mockRelease = jest.fn();
jest.mock('../features/receipt-import/ReceiptOcrEngine', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    ReceiptOcrEngine: ({ ref }: { ref?: import('react').Ref<ReceiptOcrEngineHandle> }) => {
      React.useImperativeHandle(ref, () => ({ recognize: mockRecognize, cancel: mockCancel }));
      return null;
    },
  };
});
jest.mock('expo-file-system', () => ({
  File: class {
    uri: string;
    exists = true;
    size = 100_000;
    constructor(uri: string) {
      this.uri = uri;
    }
    open() {
      return { readBytes: async () => Uint8Array.from([255, 216, 255]), close: jest.fn() };
    }
    async base64() {
      return '/9j/receipt';
    }
    delete() {
      mockDelete(this.uri);
    }
  },
}));
jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate: jest.fn() },
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
  usePreventRemove: jest.fn(),
}));
jest.mock('expo-image-picker', () => ({
  getPendingResultAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock(
  '../features/receipt-import/receipt-ocr',
  () => ({ readReceipt: jest.fn(), removeReceiptTempFiles: jest.fn() }),
  { virtual: true },
);
jest.mock('../features/receipt-import/receipt-import-api', () => ({
  importReceiptItems: jest.fn(),
}));
jest.mock('../features/auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('lucide-react-native', () => ({ ArrowLeft: () => null }));

const picker = jest.mocked(ImagePicker);
const readMock = jest.mocked(readReceipt);
const saveMock = jest.mocked(importReceiptItems);
const disablePrevention = jest.fn();
const asset: ImagePicker.ImagePickerAsset = {
  uri: 'file://receipt.jpg',
  width: 1200,
  height: 6000,
  fileSize: 100_000,
  mimeType: 'image/jpeg',
  fileName: 'receipt.jpg',
  assetId: 'receipt',
};
const milk: ReceiptProduct = {
  id: 'milk',
  name: 'Mjölk',
  originalText: 'MJÖLK 16,90',
  quantity: null,
  unit: null,
  price: 16.9,
  classification: 'FOOD',
  storageLocation: 'FRIDGE',
};
const unknown: ReceiptProduct = {
  ...milk,
  id: 'unknown',
  name: 'Specialvara',
  originalText: 'SPECIALVARA 24,90',
  classification: 'UNKNOWN',
  storageLocation: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(usePreventRemove).mockReturnValue(disablePrevention);
  jest.mocked(useAuth).mockReturnValue({ profile: { households: [{ id: 'household' }] } } as never);
  picker.getPendingResultAsync.mockResolvedValue(null);
  picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: true } as never);
  picker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [asset] });
  picker.launchCameraAsync.mockResolvedValue({ canceled: false, assets: [asset] });
  readMock.mockResolvedValue({ products: [milk], unrecognizedLines: [] });
  saveMock.mockResolvedValue([]);
  mockRecognize.mockResolvedValue({ text: 'MJÖLK 16,90', lines: [{ text: 'MJÖLK 16,90' }] });
  jest.mocked(ImageManipulator.manipulate).mockReturnValue({
    renderAsync: async () => ({
      width: 1200,
      height: 6000,
      saveAsync: async () => ({ uri: 'file:///converted.jpg' }),
      release: mockRelease,
    }),
    release: mockRelease,
  } as never);
});

afterEach(() => jest.restoreAllMocks());

async function openReview(receipt?: ParsedReceipt) {
  if (receipt) readMock.mockResolvedValueOnce(receipt);
  const screen = await render(<ReceiptImportFlow />);
  await fireEvent.press(screen.getByText('Välj från bilder'));
  await fireEvent.press(screen.getByText('Läs kvitto'));
  await screen.findByText('Granska kvitto');
  return screen;
}

it('requests camera permission and handles denial, picker cancel and picker errors', async () => {
  picker.requestCameraPermissionsAsync.mockResolvedValueOnce({ granted: false } as never);
  const screen = await render(<ReceiptImportFlow />);
  await fireEvent.press(screen.getByText('Ta foto av kvitto'));
  expect(await screen.findByText(/Kameratillgång nekades/)).toBeTruthy();
  expect(picker.launchCameraAsync).not.toHaveBeenCalled();
  picker.launchImageLibraryAsync.mockResolvedValueOnce({ canceled: true, assets: null });
  await fireEvent.press(screen.getByText('Välj från bilder'));
  expect(screen.getByText('Bildvalet avbröts. Inget har lagts till.')).toBeTruthy();
  picker.launchImageLibraryAsync.mockRejectedValueOnce(new Error('private native failure'));
  await fireEvent.press(screen.getByText('Välj från bilder'));
  expect(screen.getByText(/Bilden kunde inte öppnas/)).toBeTruthy();
  expect(readMock).not.toHaveBeenCalled();
  expect(saveMock).not.toHaveBeenCalled();
});

it('takes a photo without cropping and passes the full asset and rotation to local OCR', async () => {
  const screen = await render(<ReceiptImportFlow />);
  await fireEvent.press(screen.getByText('Ta foto av kvitto'));
  expect(picker.requestCameraPermissionsAsync).toHaveBeenCalledTimes(1);
  expect(picker.launchCameraAsync).toHaveBeenCalledWith(
    expect.objectContaining({ allowsEditing: false, quality: 1 }),
  );
  expect(screen.getByLabelText('Förhandsvisning av kvitto').props.resizeMode).toBe('contain');
  expect(screen.getByLabelText('Förhandsvisning av kvitto')).toHaveStyle({
    width: '100%',
    maxWidth: 280,
    aspectRatio: 1,
  });
  await fireEvent.press(screen.getByText('Rotera kvitto'));
  await fireEvent.press(screen.getByText('Läs kvitto'));
  expect(readMock).toHaveBeenCalledWith(asset, 90, expect.any(Function), expect.any(AbortSignal));
  expect(saveMock).not.toHaveBeenCalled();
});

it('shows a neutral waiting message while the image picker is still open', async () => {
  let resolve!: (result: ImagePicker.ImagePickerResult) => void;
  picker.launchImageLibraryAsync.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const screen = await render(<ReceiptImportFlow />);
  await fireEvent.press(screen.getByText('Välj från bilder'));
  expect(screen.getByText('Väntar...')).toBeTruthy();
  expect(screen.getByRole('progressbar', { name: 'Väntar' })).toBeTruthy();
  expect(screen.queryByText(/avbrutna/)).toBeNull();
  expect(screen.queryByText('Bildvalet avbröts. Inget har lagts till.')).toBeNull();
  await act(async () => resolve({ canceled: true, assets: null }));
  expect(screen.getByText('Bildvalet avbröts. Inget har lagts till.')).toBeTruthy();
});

it('restores the entire Android pending asset, including file metadata', async () => {
  picker.getPendingResultAsync.mockResolvedValueOnce({ canceled: false, assets: [asset] });
  const screen = await render(<ReceiptImportFlow />);
  await screen.findByLabelText('Förhandsvisning av kvitto');
  await fireEvent.press(screen.getByText('Läs kvitto'));
  expect(readMock).toHaveBeenCalledWith(asset, 0, expect.any(Function), expect.any(AbortSignal));
});

it('prepares an image with the real adapter and reviews the mounted engine callback result', async () => {
  const actual = jest.requireActual<typeof import('../features/receipt-import/receipt-ocr')>(
    '../features/receipt-import/receipt-ocr',
  );
  readMock.mockImplementationOnce(actual.readReceipt);
  const screen = await openReview();
  expect(ImageManipulator.manipulate).toHaveBeenCalledWith(asset.uri, {
    maxWidth: 1200,
    maxHeight: 6000,
  });
  expect(mockRecognize).toHaveBeenCalledWith('data:image/jpeg;base64,/9j/receipt');
  expect(screen.getByText('Originaltext: MJÖLK 16,90')).toBeTruthy();
  expect(screen.getByRole('checkbox', { name: /Vald: MJÖLK/i })).toBeChecked();
  expect(mockDelete.mock.calls).toEqual([['file:///converted.jpg']]);
  expect(mockRelease).toHaveBeenCalledTimes(2);
  expect(saveMock).not.toHaveBeenCalled();
});

it('handles failed Android recovery safely', async () => {
  picker.getPendingResultAsync.mockRejectedValueOnce(new Error('recovery failure'));
  const screen = await render(<ReceiptImportFlow />);
  expect(await screen.findByText('Bilden kunde inte återställas. Välj den igen.')).toBeTruthy();
});

it.each([
  ['UNSUPPORTED_IMAGE', /Bildformatet stöds inte/],
  ['IMAGE_TOO_LARGE', /Bilden är för stor/],
  ['INVALID_IMAGE', /Bilden kunde inte öppnas/],
  ['OCR_FAILED', /Kvittot kunde inte läsas/],
  ['NO_TEXT', /Ingen text kunde läsas/],
  ['OCR_UNAVAILABLE', /Kvittoläsningen kunde inte starta/],
  ['secret internal error', /Kvittot kunde inte läsas/],
])('maps %s to safe Swedish recovery copy', async (code, message) => {
  readMock.mockRejectedValueOnce(Object.assign(new Error('private details'), { code }));
  const screen = await render(<ReceiptImportFlow />);
  await fireEvent.press(screen.getByText('Välj från bilder'));
  await fireEvent.press(screen.getByText('Läs kvitto'));
  expect(await screen.findByText(message)).toBeTruthy();
  if (code === 'OCR_UNAVAILABLE') {
    expect(screen.getByText(/Expo Go/)).toBeTruthy();
    expect(screen.queryByText(/egen appversion|custom|specialbygg/i)).toBeNull();
  }
  expect(screen.queryByText('private details')).toBeNull();
  expect(screen.getByText('Läs kvitto')).toBeTruthy();
  await fireEvent.press(screen.getByText('Lägg till manuellt'));
  expect(router.push).toHaveBeenCalledWith('/add-product');
  expect(saveMock).not.toHaveBeenCalled();
});

it('ignores canceled OCR results but prevents overlapping calls until settlement', async () => {
  let resolve!: (receipt: ParsedReceipt) => void;
  readMock.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const screen = await render(<ReceiptImportFlow />);
  await fireEvent.press(screen.getByText('Välj från bilder'));
  await fireEvent.press(screen.getByText('Läs kvitto'));
  const signal = readMock.mock.calls[0][3];
  expect(signal?.aborted).toBe(false);
  await fireEvent.press(screen.getByText('Avbryt läsning'));
  expect(signal?.aborted).toBe(true);
  expect(mockCancel).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Läsningen avbröts. Inget har lagts till.')).toBeTruthy();
  await fireEvent.press(screen.getByText('Läs kvitto'));
  await fireEvent.press(screen.getByText('Välj från bilder'));
  expect(readMock).toHaveBeenCalledTimes(1);
  expect(picker.launchImageLibraryAsync).toHaveBeenCalledTimes(1);
  await act(async () => resolve({ products: [milk], unrecognizedLines: [] }));
  expect(screen.queryByText('Granska kvitto')).toBeNull();
  expect(screen.getByRole('button', { name: 'Läs kvitto' })).toBeEnabled();
  await fireEvent.press(screen.getByText('Läs kvitto'));
  expect(await screen.findByText('Granska kvitto')).toBeTruthy();
  expect(readMock).toHaveBeenCalledTimes(2);
  expect(readMock.mock.calls[1][3]?.aborted).toBe(false);
  expect(readMock.mock.calls[1][3]).not.toBe(signal);
});

it('cleans up after unmount without accepting a stale OCR result', async () => {
  let resolve!: (receipt: ParsedReceipt) => void;
  readMock.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const screen = await render(<ReceiptImportFlow />);
  await fireEvent.press(screen.getByText('Välj från bilder'));
  await fireEvent.press(screen.getByText('Läs kvitto'));
  const signal = readMock.mock.calls[0][3];
  await screen.unmount();
  expect(signal?.aborted).toBe(true);
  expect(removeReceiptTempFiles).not.toHaveBeenCalled();
  await act(async () => resolve({ products: [milk], unrecognizedLines: [] }));
  expect(removeReceiptTempFiles).toHaveBeenCalledTimes(1);
  expect(saveMock).not.toHaveBeenCalled();
});

it('reviews real parser output, selecting food only and retaining the original receipt text', async () => {
  const receipt = parseReceipt({
    text: '',
    lines: ['MJÖLK 16,90', 'SPECIALVARA 24,90', 'TVÅL 29,90', 'SVÅRLÄST RAD'].map((text) => ({
      text,
    })),
  });
  const screen = await openReview(receipt);
  expect(screen.getByText('Originaltext: MJÖLK 16,90')).toBeTruthy();
  expect(screen.getByRole('checkbox', { name: /Vald: MJÖLK/i })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: /Välj: SPECIALVARA/i })).not.toBeChecked();
  expect(screen.getByText('Kontrollera varorna innan du lägger till dem i ditt kök.')).toBeTruthy();
  expect(screen.queryByText('Originaltext: TVÅL 29,90')).toBeNull();
  await fireEvent.press(screen.getByText('Övriga varor (1)'));
  expect(screen.getByText('Originaltext: TVÅL 29,90')).toBeTruthy();
  expect(screen.queryByRole('checkbox', { name: /Välj: TVÅL/i })).toBeNull();
  expect(screen.getAllByText(/Förslag: mängd 1, enhet st/).length).toBeGreaterThan(0);
  expect(saveMock).not.toHaveBeenCalled();
});

it('supports empty and unknown-only receipts without silently selecting uncertain food', async () => {
  const screen = await openReview({ products: [unknown], unrecognizedLines: ['OTOLKAD VARA'] });
  expect(screen.getByText('Inga matvaror hittades')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Lägg till i Mitt kök (0)' })).toBeDisabled();
  await fireEvent.press(screen.getByText('Otolkade rader (1)'));
  await fireEvent.press(screen.getByText('Granska rad 1 som vara'));
  expect(screen.getByText('Originaltext: OTOLKAD VARA')).toBeTruthy();
  expect(screen.getByRole('checkbox', { name: 'Välj: OTOLKAD VARA' })).not.toBeChecked();
  expect(saveMock).not.toHaveBeenCalled();
});

it('allows manual additions even when the receipt contains no products', async () => {
  const screen = await openReview({ products: [], unrecognizedLines: [] });
  await fireEvent.press(screen.getByText('Lägg till en vara manuellt'));
  await fireEvent.changeText(screen.getByLabelText('Namn manual-1'), 'Bananer');
  await fireEvent.press(screen.getByText('Välj: Bananer'));
  expect(screen.getByRole('button', { name: 'Lägg till i Mitt kök (1)' })).toBeDisabled();
  await fireEvent.press(screen.getByText('Skafferi'));
  await fireEvent.press(screen.getByText('Lägg till i Mitt kök (1)'));
  expect(saveMock).toHaveBeenCalledWith(
    'household',
    [
      expect.objectContaining({
        name: 'Bananer',
        quantity: 1,
        unit: 'st',
        storageLocation: 'PANTRY',
      }),
    ],
    expect.any(String),
  );
});

it('validates edits and nullable storage, and imports selected edited values without inferred dates', async () => {
  const screen = await openReview({
    products: [{ ...milk, storageLocation: null }, unknown],
    unrecognizedLines: [],
  });
  expect(screen.getByRole('button', { name: 'Lägg till i Mitt kök (1)' })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText('Namn milk'), 'Ekologisk mjölk');
  await fireEvent.changeText(screen.getByLabelText('Mängd milk'), '0');
  expect(screen.getByText(/Ange en mängd större än noll/)).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Mängd milk'), '1,2500');
  expect(screen.getByRole('button', { name: 'Lägg till i Mitt kök (1)' })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText('Mängd milk'), '1,25');
  await fireEvent.press(screen.getAllByText('l')[0]);
  await fireEvent.press(screen.getAllByText('Frys')[0]);
  await fireEvent.press(screen.getAllByText('Frys')[0]);
  expect(screen.getByRole('button', { name: 'Lägg till i Mitt kök (1)' })).toBeDisabled();
  await fireEvent.press(screen.getAllByText('Kylskåp')[0]);
  await fireEvent.press(screen.getByText('Lägg till i Mitt kök (1)'));
  expect(saveMock).toHaveBeenCalledWith(
    'household',
    [
      {
        name: 'Ekologisk mjölk',
        quantity: 1.25,
        unit: 'l',
        storageLocation: 'FRIDGE',
        expiryDate: null,
        expiryType: null,
        expirySource: null,
      },
    ],
    expect.any(String),
  );
});

it('supports selecting, deselecting and removing uncertain rows', async () => {
  const screen = await openReview({ products: [milk, unknown], unrecognizedLines: [] });
  await fireEvent.press(screen.getByText('Välj: Specialvara'));
  expect(screen.getByRole('checkbox', { name: 'Vald: Specialvara' })).toBeChecked();
  expect(
    screen.getByText(
      'Raderna väljs inte automatiskt. Kontrollera att de är matvaror innan du väljer dem.',
    ),
  ).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Lägg till i Mitt kök (2)' })).toBeDisabled();
  await fireEvent.press(screen.getAllByText('Skafferi')[1]);
  expect(screen.getByRole('button', { name: 'Lägg till i Mitt kök (2)' })).toBeEnabled();
  await fireEvent.press(screen.getByText('Vald: Mjölk'));
  await fireEvent.press(screen.getByText('Ta bort Mjölk'));
  expect(screen.queryByText('Originaltext: MJÖLK 16,90')).toBeNull();
  await fireEvent.press(screen.getByText('Lägg till i Mitt kök (1)'));
  expect(saveMock.mock.calls[0][1]).toEqual([
    expect.objectContaining({ name: 'Specialvara', storageLocation: 'PANTRY' }),
  ]);
});

it('preserves duplicate rows and all rows above the backend limit, requiring at most 30 selected', async () => {
  const products = Array.from({ length: 31 }, (_, index) => ({ ...milk, id: `milk-${index}` }));
  const screen = await openReview({ products, unrecognizedLines: [] });
  expect(screen.getAllByText('Originaltext: MJÖLK 16,90')).toHaveLength(31);
  expect(screen.getByRole('button', { name: 'Lägg till i Mitt kök (31)' })).toBeDisabled();
  expect(screen.getByText(/högst 30 varor åt gången/)).toBeTruthy();
  await fireEvent.press(screen.getAllByText('Vald: Mjölk')[30]);
  await fireEvent.press(screen.getByText('Lägg till i Mitt kök (30)'));
  expect(saveMock.mock.calls[0][1]).toHaveLength(30);
});

it('locks an uncertain committed import and retries its captured payload and key without duplicates', async () => {
  const reviewSpy = jest.spyOn(ReceiptReviewModule, 'ReceiptReview');
  const committed = new Map<string, string[]>();
  saveMock.mockImplementation(async (_household, payload, key) => {
    if (!committed.has(key)) {
      committed.set(
        key,
        payload.map((item) => item.name),
      );
      throw new Error('private transport error after server commit');
    }
    return [];
  });
  const screen = await openReview({
    products: [milk, unknown],
    unrecognizedLines: ['OTOLKAD VARA'],
  });
  const staleReview = reviewSpy.mock.calls[reviewSpy.mock.calls.length - 1][0];
  await fireEvent.press(screen.getByText('Lägg till i Mitt kök (1)'));
  expect(
    await screen.findByText(/Resultatet är osäkert. Varorna kan redan ha sparats/),
  ).toBeTruthy();
  expect(screen.queryByText(/private transport error/)).toBeNull();
  const submission = saveMock.mock.calls[0];
  const originalPayload = JSON.stringify(submission[1]);
  expect(screen.getByLabelText('Namn milk')).toHaveProp('editable', false);
  expect(screen.getByLabelText('Mängd milk')).toHaveProp('editable', false);
  for (const name of ['Ta bort Mjölk', 'Lägg till en vara manuellt', 'Välj en annan bild']) {
    expect(screen.getByRole('button', { name })).toBeDisabled();
  }
  expect(screen.getByRole('checkbox', { name: 'Vald: Mjölk' })).toBeDisabled();
  expect(screen.getByRole('checkbox', { name: 'Välj: Specialvara' })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText('Namn milk'), 'Ändrad mjölk');
  await fireEvent.changeText(screen.getByLabelText('Mängd milk'), '8');
  // Even callbacks captured before submission must not change the locked review.
  await act(async () => {
    staleReview.onChange({
      ...staleReview.items[0],
      name: 'Ändrad mjölk',
      quantity: '8',
      selected: false,
    });
    staleReview.onRemove('milk');
    staleReview.onAdd('Ny vara');
    staleReview.onConvertLine(0);
  });
  expect(screen.getByLabelText('Namn milk')).toHaveProp('value', 'Mjölk');
  expect(screen.getByLabelText('Mängd milk')).toHaveProp('value', '1');
  expect(screen.getByText('Originaltext: MJÖLK 16,90')).toBeTruthy();
  expect(screen.getByText('Otolkade rader (1)')).toBeTruthy();
  expect(screen.queryByText('Ny vara')).toBeNull();
  await fireEvent.press(screen.getByText('Välj en annan bild'));
  expect(readMock).toHaveBeenCalledTimes(1);
  expect(picker.launchImageLibraryAsync).toHaveBeenCalledTimes(1);
  const retryButton = screen.getByRole('button', { name: 'Försök samma import igen (1)' });
  await fireEvent.press(retryButton);
  expect(saveMock).toHaveBeenCalledTimes(2);
  expect(saveMock.mock.calls[1]).toEqual(submission);
  expect(saveMock.mock.calls[1][1]).toBe(submission[1]);
  expect(JSON.stringify(saveMock.mock.calls[1][1])).toBe(originalPayload);
  expect([...committed.values()]).toEqual([['Mjölk']]);
  expect(screen.getByText('Varorna är tillagda')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Försök samma import igen (1)' })).toBeNull();
  expect(saveMock).toHaveBeenCalledTimes(2);
});

it('warns before abandoning an unresolved import and opens the kitchen only after confirmation', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  try {
    saveMock.mockRejectedValueOnce(new Error('unknown outcome'));
    const screen = await openReview();
    await fireEvent.press(screen.getByText('Lägg till i Mitt kök (1)'));
    expect(usePreventRemove).toHaveBeenLastCalledWith(true, expect.any(Function));
    await fireEvent.press(screen.getByLabelText('Tillbaka'));
    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith(
      'Lämna importen och kontrollera Mitt kök?',
      expect.stringMatching(/Varorna kan redan ha sparats.*dubbelt/),
      expect.arrayContaining([expect.objectContaining({ text: 'Stanna kvar', style: 'cancel' })]),
    );
    expect(screen.getByRole('button', { name: 'Försök samma import igen (1)' })).toBeEnabled();
    await fireEvent.press(screen.getByText('Kontrollera Mitt kök'));
    const confirm = alert.mock.calls[1][2]?.find(
      (action) => action.text === 'Kontrollera Mitt kök',
    );
    await act(async () => confirm?.onPress?.());
    expect(usePreventRemove).toHaveBeenLastCalledWith(false, expect.any(Function));
    expect(disablePrevention).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith('/(tabs)/kitchen');
    await fireEvent.press(screen.getByText('Lägg till i Mitt kök (1)'));
    expect(saveMock).toHaveBeenCalledTimes(1);
  } finally {
    alert.mockRestore();
  }
});

it('guards system removal while pending or unresolved and releases it only after confirmed exit', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  let reject!: (error: Error) => void;
  saveMock.mockImplementationOnce(
    () =>
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
  );
  const screen = await openReview();
  await fireEvent.press(screen.getByText('Lägg till i Mitt kök (1)'));
  const removal = { data: { action: { type: 'GO_BACK' } }, repeat: jest.fn() };
  const pendingCallback = jest.mocked(usePreventRemove).mock.calls.at(-1)?.[1];
  expect(usePreventRemove).toHaveBeenLastCalledWith(true, expect.any(Function));
  await act(async () => pendingCallback?.(removal));
  expect(alert).not.toHaveBeenCalled();
  expect(disablePrevention).not.toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();

  await act(async () => reject(new Error('response lost')));
  expect(usePreventRemove).toHaveBeenLastCalledWith(true, expect.any(Function));
  const unresolvedCallback = jest.mocked(usePreventRemove).mock.calls.at(-1)?.[1];
  await act(async () => unresolvedCallback?.(removal));
  expect(alert).toHaveBeenCalledWith(
    'Lämna importen och kontrollera Mitt kök?',
    expect.stringMatching(/Varorna kan redan ha sparats.*dubbelt/),
    expect.any(Array),
  );
  const cancel = alert.mock.calls[0][2]?.find((action) => action.text === 'Stanna kvar');
  expect(cancel?.style).toBe('cancel');
  await act(async () => cancel?.onPress?.());
  expect(usePreventRemove).toHaveBeenLastCalledWith(true, expect.any(Function));
  expect(disablePrevention).not.toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();

  await act(async () => unresolvedCallback?.(removal));
  const confirm = alert.mock.calls[1][2]?.find((action) => action.text === 'Kontrollera Mitt kök');
  await act(async () => confirm?.onPress?.());
  expect(usePreventRemove).toHaveBeenLastCalledWith(false, expect.any(Function));
  expect(disablePrevention).toHaveBeenCalledTimes(1);
  expect(router.replace).toHaveBeenCalledWith('/(tabs)/kitchen');
  expect(disablePrevention.mock.invocationCallOrder[0]).toBeLessThan(
    jest.mocked(router.replace).mock.invocationCallOrder[0],
  );
  expect(removal.repeat).not.toHaveBeenCalled();
  expect(saveMock).toHaveBeenCalledTimes(1);
  await act(async () => unresolvedCallback?.(removal));
  expect(alert).toHaveBeenCalledTimes(2);
});

it('blocks duplicate saves and navigation while saving and repeat writes after success', async () => {
  let resolve!: (value: []) => void;
  saveMock.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const screen = await openReview();
  const button = screen.getByRole('button', { name: 'Lägg till i Mitt kök (1)' });
  await fireEvent.press(button);
  await fireEvent.press(button);
  expect(saveMock).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Tillbaka' })).toBeDisabled();
  expect(usePreventRemove).toHaveBeenLastCalledWith(true, expect.any(Function));
  await fireEvent.press(screen.getByLabelText('Tillbaka'));
  expect(router.back).not.toHaveBeenCalled();
  await act(async () => resolve([]));
  expect(screen.getByText('Varorna är tillagda')).toBeTruthy();
  expect(usePreventRemove).toHaveBeenLastCalledWith(false, expect.any(Function));
  expect(screen.queryByRole('button', { name: 'Lägg till i Mitt kök (1)' })).toBeNull();
  await fireEvent.press(screen.getByText('Till Mitt kök'));
  expect(router.replace).toHaveBeenCalledWith('/(tabs)/kitchen');
  expect(saveMock).toHaveBeenCalledTimes(1);
});

it('does not import without a household', async () => {
  jest.mocked(useAuth).mockReturnValue({ profile: { households: [] } } as never);
  const screen = await openReview();
  expect(screen.getByRole('button', { name: 'Lägg till i Mitt kök (1)' })).toBeDisabled();
  await fireEvent.press(screen.getByText('Lägg till i Mitt kök (1)'));
  expect(saveMock).not.toHaveBeenCalled();
});
