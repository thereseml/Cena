import { fireEvent, render } from '@testing-library/react-native';
import type { InventoryItem } from '@cena/contracts';
import InventoryItemScreen from '../app/inventory/[id]';
import { router } from 'expo-router';
import { apiRequest } from '../lib/api';

jest.mock('expo-router', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
    useLocalSearchParams: () => ({ id: 'milk' }),
    useFocusEffect: (effect: () => void | (() => void)) => React.useEffect(effect, [effect]),
  };
});
jest.mock('lucide-react-native', () => ({ ArrowLeft: () => null, Trash2: () => null }));
jest.mock('../features/auth/AuthProvider', () => ({
  useAuth: () => ({ profile: { households: [{ id: 'household-id' }] } }),
}));
jest.mock('../lib/api', () => ({
  apiRequest: jest.fn(),
  apiErrorMessage: (_error: unknown, fallback: string) => fallback,
}));

const item: InventoryItem = {
  id: 'milk',
  name: 'Mjölk',
  quantity: 1,
  unit: 'l',
  storageLocation: 'FRIDGE',
  batches: [
    {
      id: 'milk-batch',
      quantity: 1,
      expiryDate: null,
      expiryType: null,
      expirySource: null,
    },
  ],
  createdAt: '2026-11-13T12:00:00.000Z',
  updatedAt: '2026-11-13T12:00:00.000Z',
  version: 3,
};
const apiRequestMock = jest.mocked(apiRequest);

describe('InventoryItemScreen delete confirmation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiRequestMock.mockResolvedValue(item);
  });

  it('cancels deletion without making a request', async () => {
    const { getByText, findByText } = await render(<InventoryItemScreen />);
    await findByText('Ta bort vara');
    await fireEvent.press(getByText('Ta bort vara'));
    await fireEvent.press(getByText('Avbryt'));

    expect(apiRequestMock).toHaveBeenCalledTimes(1);
    expect(getByText('Redigera vara')).toBeTruthy();
  });

  it('archives only after confirmation and sends the current version', async () => {
    apiRequestMock.mockResolvedValueOnce(item).mockResolvedValueOnce(undefined);
    const { getByText, findByText } = await render(<InventoryItemScreen />);
    await findByText('Ta bort vara');
    await fireEvent.press(getByText('Ta bort vara'));
    expect(getByText('Ta bort vara?')).toBeTruthy();
    expect(getByText('Varan tas bort från ditt kök.')).toBeTruthy();
    await fireEvent.press(getByText('Ta bort'));

    await findByText('Redigera vara');
    expect(apiRequestMock).toHaveBeenNthCalledWith(2, 'households/household-id/inventory/milk', {
      method: 'DELETE',
      body: JSON.stringify({ expectedVersion: 3 }),
    });
    expect(router.replace).toHaveBeenCalledWith('/(tabs)/kitchen');
  });

  it('shows an error and keeps the confirmation open when deletion fails', async () => {
    apiRequestMock.mockResolvedValueOnce(item).mockRejectedValueOnce(new Error('network'));
    const { getByText, findByText } = await render(<InventoryItemScreen />);
    await findByText('Ta bort vara');
    await fireEvent.press(getByText('Ta bort vara'));
    await fireEvent.press(getByText('Ta bort'));

    expect(await findByText('Varan kunde inte tas bort. Försök igen.')).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
