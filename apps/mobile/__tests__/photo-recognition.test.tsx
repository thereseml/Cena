import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import type { FoodRecognitionResult, InventoryItem } from '@cena/contracts';
import { PhotoRecognitionFlow } from '../features/food-recognition/PhotoRecognitionFlow';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator } from 'expo-image-manipulator';
import { router } from 'expo-router';
import { useAuth } from '../features/auth/AuthProvider';
import {
  analyzeFoodPhoto,
  saveRecognizedFood,
} from '../features/food-recognition/food-recognition-api';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
}));
jest.mock('expo-image-picker', () => ({
  getPendingResultAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate: jest.fn() },
  SaveFormat: { JPEG: 'jpeg' },
}));
jest.mock('../features/auth/AuthProvider', () => ({
  useAuth: jest.fn(),
}));
jest.mock('../features/food-recognition/food-recognition-api', () => ({
  analyzeFoodPhoto: jest.fn(),
  saveRecognizedFood: jest.fn(),
}));
jest.mock('lucide-react-native', () => ({ ArrowLeft: () => null, X: () => null }));

const analyzeMock = jest.mocked(analyzeFoodPhoto);
const saveMock = jest.mocked(saveRecognizedFood);
const pickerMock = jest.mocked(ImagePicker);
const manipulateMock = jest.mocked(ImageManipulator.manipulate);
const authMock = jest.mocked(useAuth);
const result: FoodRecognitionResult = {
  items: [
    {
      id: 'tomater-id',
      name: 'Tomater',
      quantity: 3,
      unit: 'st',
      description: null,
      confidence: 'MEDIUM',
      needsReview: true,
    },
  ],
};
const savedItem: InventoryItem = {
  id: 'saved-tomater',
  name: 'Tomater',
  quantity: 3,
  unit: 'st',
  storageLocation: 'FRIDGE',
  batches: [{ id: 'batch', quantity: 3, expiryDate: null, expiryType: null, expirySource: null }],
  createdAt: '2026-11-14T12:00:00.000Z',
  updatedAt: '2026-11-14T12:00:00.000Z',
  version: 0,
};

describe('PhotoRecognitionFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authMock.mockReturnValue({ profile: { households: [{ id: 'household-id' }] } } as never);
    pickerMock.requestCameraPermissionsAsync.mockResolvedValue({ granted: true } as never);
    pickerMock.getPendingResultAsync.mockResolvedValue(null);
    pickerMock.launchCameraAsync.mockResolvedValue({ canceled: true, assets: null });
    pickerMock.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://selected.jpg', width: 2000, height: 1200 }],
    } as never);
    manipulateMock.mockReturnValue({
      renderAsync: async () => ({
        saveAsync: async () => ({ uri: 'file://optimized.jpg', base64: 'AA==' }),
      }),
    } as never);
    analyzeMock.mockResolvedValue(result);
    saveMock.mockResolvedValue([savedItem]);
  });

  it('handles denied camera permission and lets the user pick a photo', async () => {
    pickerMock.requestCameraPermissionsAsync.mockResolvedValue({ granted: false } as never);
    const { getByText, findByText } = await render(<PhotoRecognitionFlow />);

    await fireEvent.press(getByText('Ta foto'));
    expect(await findByText(/Kameratillgång nekades/)).toBeTruthy();
    expect(pickerMock.launchCameraAsync).not.toHaveBeenCalled();

    pickerMock.launchImageLibraryAsync.mockResolvedValueOnce({ canceled: true, assets: null });
    await fireEvent.press(getByText('Välj från bilder'));
    expect(getByText('Lägg till med foto')).toBeTruthy();
  });

  it('takes a new photo after requesting camera permission', async () => {
    pickerMock.launchCameraAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://camera.jpg', width: 1600, height: 1200 }],
    } as never);
    const { getByText, getByLabelText } = await render(<PhotoRecognitionFlow />);

    await fireEvent.press(getByText('Ta foto'));

    expect(pickerMock.requestCameraPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(pickerMock.launchCameraAsync).toHaveBeenCalledTimes(1);
    expect(getByLabelText('Förhandsvisning av vald matbild')).toBeTruthy();
  });

  it('restores a photo when Android recreates the activity while the picker is open', async () => {
    pickerMock.getPendingResultAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://restored.jpg', width: 1200, height: 900 }],
    } as never);
    const { findByLabelText } = await render(<PhotoRecognitionFlow />);

    expect(await findByLabelText('Förhandsvisning av vald matbild')).toBeTruthy();
  });

  it('previews, optimizes, analyzes and displays multiple returned foods', async () => {
    analyzeMock.mockResolvedValueOnce({
      items: [...result.items, { ...result.items[0], id: 'eggs-id', name: 'Ägg', quantity: 6 }],
    });
    const { getByText, findByText, getByLabelText } = await render(<PhotoRecognitionFlow />);

    await fireEvent.press(getByText('Välj från bilder'));
    expect(getByLabelText('Förhandsvisning av vald matbild')).toBeTruthy();
    await fireEvent.press(getByText('Analysera bild'));

    expect(await findByText('Granska varorna')).toBeTruthy();
    expect(getByText('Tomater')).toBeTruthy();
    expect(getByText('Ägg')).toBeTruthy();
    expect(manipulateMock).toHaveBeenCalledWith('file://selected.jpg', {
      maxWidth: 1600,
      maxHeight: 1600,
    });
    expect(analyzeMock).toHaveBeenCalledWith(
      { uri: 'file://optimized.jpg' },
      expect.any(AbortSignal),
    );
  });

  it('allows the user to cancel an in-flight analysis request', async () => {
    let requestSignal: AbortSignal | undefined;
    analyzeMock.mockImplementation(
      (_photo, signal) =>
        new Promise((_resolve, reject) => {
          requestSignal = signal;
          signal.addEventListener('abort', () =>
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
          );
        }),
    );
    const { getByText, findByText } = await render(<PhotoRecognitionFlow />);
    await fireEvent.press(getByText('Välj från bilder'));
    await fireEvent.press(getByText('Analysera bild'));
    await findByText('Cena tittar på din bild...');
    await fireEvent.press(getByText('Avbryt'));

    expect(requestSignal?.aborted).toBe(true);
    expect(getByText('Analysera bild')).toBeTruthy();
  });

  it('allows editing and removing a proposal, then saves only approved values', async () => {
    const { getByText, findByText, getByLabelText, queryByText } = await render(
      <PhotoRecognitionFlow />,
    );
    await fireEvent.press(getByText('Välj från bilder'));
    await fireEvent.press(getByText('Analysera bild'));
    await findByText('Granska varorna');
    await fireEvent.press(getByText('Redigera'));
    await fireEvent.changeText(getByLabelText('Namn'), 'Ekologiska tomater');
    await fireEvent.changeText(getByLabelText('Mängd'), '4');
    await fireEvent.press(getByText('Spara ändringar'));

    expect(getByText('Ekologiska tomater')).toBeTruthy();
    await fireEvent.press(getByText('Ta bort'));
    expect(queryByText('Ekologiska tomater')).toBeNull();
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('supports a manually added item and saves through the atomic inventory endpoint', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { getByText, findByText, getByLabelText } = await render(<PhotoRecognitionFlow />);
    await fireEvent.press(getByText('Välj från bilder'));
    await fireEvent.press(getByText('Analysera bild'));
    await findByText('Granska varorna');
    await fireEvent.press(getByText('Lägg till en vara'));
    await fireEvent.changeText(getByLabelText('Namn'), 'Bananer');
    await fireEvent.changeText(getByLabelText('Mängd'), '2');
    await fireEvent.press(getByText('st'));
    await fireEvent.press(getByText('Spara ändringar'));
    expect(getByText('Manuellt tillagd')).toBeTruthy();
    await fireEvent.press(getByText('Lägg till i mitt kök'));

    expect(saveMock).toHaveBeenCalledWith(
      'household-id',
      [
        expect.objectContaining({ name: 'Tomater', quantity: 3, unit: 'st' }),
        expect.objectContaining({ name: 'Bananer', quantity: 2, unit: 'st' }),
      ],
      expect.stringMatching(/^photo-save:/),
    );
    expect(alert).toHaveBeenCalledWith(
      'Varorna är tillagda',
      expect.any(String),
      expect.any(Array),
    );
    const actions = alert.mock.calls[0][2] as { onPress?: () => void }[];
    actions[0].onPress?.();
    alert.mockRestore();
    expect(router.replace).toHaveBeenCalledWith('/(tabs)/kitchen');
  });

  it('keeps suggestions visible after an inventory save failure', async () => {
    saveMock.mockRejectedValueOnce(new Error('offline'));
    const { getByText, findByText, findByRole } = await render(<PhotoRecognitionFlow />);
    await fireEvent.press(getByText('Välj från bilder'));
    await fireEvent.press(getByText('Analysera bild'));
    await findByText('Granska varorna');
    await fireEvent.press(getByText('Lägg till i mitt kök'));

    expect(await findByRole('alert')).toBeTruthy();
    expect(getByText('Tomater')).toBeTruthy();
  });

  it('prevents duplicate inventory submissions while a save is pending', async () => {
    let finishSave: ((items: InventoryItem[]) => void) | undefined;
    saveMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishSave = resolve;
        }),
    );
    const { getByText, getByLabelText, findByText } = await render(<PhotoRecognitionFlow />);
    await fireEvent.press(getByText('Välj från bilder'));
    await fireEvent.press(getByText('Analysera bild'));
    await findByText('Granska varorna');
    const saveButton = getByLabelText('Lägg till i mitt kök');
    await fireEvent.press(saveButton);
    await fireEvent.press(saveButton);

    await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(1));
    await act(async () => {
      finishSave?.([savedItem]);
      await Promise.resolve();
    });
  });

  it('offers a retry and manual entry when image recognition fails', async () => {
    analyzeMock.mockRejectedValueOnce(new Error('offline'));
    const { getByText, findByText } = await render(<PhotoRecognitionFlow />);
    await fireEvent.press(getByText('Välj från bilder'));
    await fireEvent.press(getByText('Analysera bild'));

    expect(await findByText('Lägg till manuellt')).toBeTruthy();
    expect(getByText('Analysera bild')).toBeTruthy();
  });

  it('lets users retry or enter items manually when no food is detected', async () => {
    analyzeMock.mockResolvedValueOnce({ items: [] });
    const { getByText, findByText } = await render(<PhotoRecognitionFlow />);
    await fireEvent.press(getByText('Välj från bilder'));
    await fireEvent.press(getByText('Analysera bild'));

    expect(await findByText('Inga matvaror hittades')).toBeTruthy();
    expect(getByText('Försök igen')).toBeTruthy();
    expect(getByText('Lägg till manuellt')).toBeTruthy();
  });
});
