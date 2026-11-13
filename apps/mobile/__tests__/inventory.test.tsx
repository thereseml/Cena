import { fireEvent, render } from '@testing-library/react-native';
import type { InventoryItem } from '@cena/contracts';
import { router } from 'expo-router';
import { InventoryItemForm } from '../features/inventory/InventoryItemForm';
import { getExpiryLabel, isUseSoon } from '../features/inventory/expiry';
import { useHouseholdInventory } from '../features/inventory/useHouseholdInventory';
import KitchenScreen from '../app/(tabs)/kitchen';
import HomeScreen from '../app/(tabs)/index';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('lucide-react-native', () => ({
  ArrowRight: () => null,
  Clock3: () => null,
  Plus: () => null,
  ShoppingBasket: () => null,
  Sparkles: () => null,
  UserRound: () => null,
}));
jest.mock('../features/inventory/useHouseholdInventory', () => ({
  useHouseholdInventory: jest.fn(),
}));

const fridgeItem: InventoryItem = {
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
  version: 0,
};
const pantryItem: InventoryItem = {
  ...fridgeItem,
  id: 'pasta',
  name: 'Pasta',
  quantity: 500,
  unit: 'g',
  storageLocation: 'PANTRY',
};
const useInventoryMock = jest.mocked(useHouseholdInventory);

describe('KitchenScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useInventoryMock.mockReturnValue({
      householdId: 'household-id',
      items: [fridgeItem, pantryItem],
      loading: false,
      error: null,
      retry: jest.fn(),
    });
  });

  it('shows a loading state while inventory is fetched', async () => {
    useInventoryMock.mockReturnValue({
      householdId: 'household-id',
      items: [],
      loading: true,
      error: null,
      retry: jest.fn(),
    });

    const { getByLabelText } = await render(<KitchenScreen />);

    expect(getByLabelText('Läser in ditt kök')).toBeTruthy();
  });

  it('shows the approved empty state and opens the add form', async () => {
    useInventoryMock.mockReturnValue({
      householdId: 'household-id',
      items: [],
      loading: false,
      error: null,
      retry: jest.fn(),
    });

    const { getByText } = await render(<KitchenScreen />);
    fireEvent.press(getByText('Lägg till mat'));

    expect(getByText('Ditt kök är tomt')).toBeTruthy();
    expect(
      getByText('Lägg till din första vara så hjälper Cena dig hålla koll på vad du har hemma.'),
    ).toBeTruthy();
    expect(router.push).toHaveBeenCalledWith('/add-product');
  });

  it('shows an error and retries instead of falling back to sample inventory', async () => {
    const retry = jest.fn();
    useInventoryMock.mockReturnValue({
      householdId: 'household-id',
      items: [],
      loading: false,
      error: 'Det gick inte att nå Cena.',
      retry,
    });

    const { getByText, queryByText } = await render(<KitchenScreen />);
    fireEvent.press(getByText('Försök igen'));

    expect(getByText('Köket kunde inte läsas in')).toBeTruthy();
    expect(retry).toHaveBeenCalledTimes(1);
    expect(queryByText('Mjölk')).toBeNull();
  });

  it('filters persisted items by storage location', async () => {
    const { getByText, queryByText } = await render(<KitchenScreen />);
    await fireEvent.press(getByText('Skafferi'));

    expect(getByText('Pasta')).toBeTruthy();
    expect(queryByText('Mjölk')).toBeNull();
  });

  it('searches persisted inventory by food name', async () => {
    const { getByLabelText, getByText, queryByText } = await render(<KitchenScreen />);
    await fireEvent.changeText(getByLabelText('Sök i ditt kök'), 'pasta');

    expect(getByText('Pasta')).toBeTruthy();
    expect(queryByText('Mjölk')).toBeNull();
  });
});

describe('HomeScreen inventory summary', () => {
  it('shows counts from persisted inventory rather than mock product statistics', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const expiryDate = [
      tomorrow.getFullYear().toString().padStart(4, '0'),
      String(tomorrow.getMonth() + 1).padStart(2, '0'),
      String(tomorrow.getDate()).padStart(2, '0'),
    ].join('-');
    useInventoryMock.mockReturnValue({
      householdId: 'household-id',
      items: [
        {
          ...fridgeItem,
          batches: [
            {
              ...fridgeItem.batches[0],
              expiryDate,
              expiryType: 'USE_BY',
              expirySource: 'USER_ENTERED',
            },
          ],
        },
      ],
      loading: false,
      error: null,
      retry: jest.fn(),
    });

    const { getByText } = await render(<HomeScreen />);

    expect(getByText('varor hemma')).toBeTruthy();
    expect(getByText('att använda snart')).toBeTruthy();
    expect(getByText('Från ditt sparade kök.')).toBeTruthy();
  });
});

describe('InventoryItemForm', () => {
  it('validates required name and expiry type before saving', async () => {
    const onSave = jest.fn();
    const { getByLabelText, getByText } = await render(
      <InventoryItemForm saveLabel="Lägg till vara" onSave={onSave} />,
    );

    await fireEvent.press(getByText('Lägg till vara'));
    expect(getByText('Skriv vad varan heter.')).toBeTruthy();

    await fireEvent.changeText(getByLabelText('Namn'), 'Mjölk');
    await fireEvent.changeText(getByLabelText('Datum (valfritt)'), '2026-11-20');
    await fireEvent.press(getByText('Lägg till vara'));

    expect(getByText('Välj vilken typ av datum du har angett.')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves valid manual values with user-entered date source', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    const { getByLabelText, getByText } = await render(
      <InventoryItemForm saveLabel="Lägg till vara" onSave={onSave} />,
    );
    await fireEvent.changeText(getByLabelText('Namn'), 'Mjölk');
    await fireEvent.changeText(getByLabelText('Mängd'), '1,5');
    await fireEvent.changeText(getByLabelText('Datum (valfritt)'), '2026-11-20');
    await fireEvent.press(getByLabelText('Bäst före'));
    await fireEvent.press(getByText('Lägg till vara'));

    expect(onSave).toHaveBeenCalledWith(
      {
        name: 'Mjölk',
        quantity: 1.5,
        unit: 'st',
        storageLocation: 'FRIDGE',
        expiryDate: '2026-11-20',
        expiryType: 'BEST_BEFORE',
        expirySource: 'USER_ENTERED',
      },
      expect.stringMatching(/^mobile:/),
    );
  });

  it('keeps server data visible when a save fails', async () => {
    const onSave = jest.fn().mockRejectedValue(new Error('server error'));
    const { getByLabelText, getByText, findByText } = await render(
      <InventoryItemForm saveLabel="Spara ändringar" onSave={onSave} />,
    );
    await fireEvent.changeText(getByLabelText('Namn'), 'Mjölk');
    await fireEvent.press(getByText('Spara ändringar'));

    expect(await findByText('Vara kunde inte sparas. Försök igen.')).toBeTruthy();
  });
});

describe('expiry labels', () => {
  const now = new Date(2026, 10, 13, 12);

  it('uses date-only calendar math and expiry-type-specific labels', () => {
    expect(
      getExpiryLabel(
        {
          id: 'batch',
          quantity: 1,
          expiryDate: '2026-11-13',
          expiryType: 'BEST_BEFORE',
          expirySource: 'USER_ENTERED',
        },
        now,
      ),
    ).toEqual({ text: 'Bäst före idag', urgency: 'soon' });
    expect(
      getExpiryLabel(
        {
          id: 'batch',
          quantity: 1,
          expiryDate: '2026-11-12',
          expiryType: 'USE_BY',
          expirySource: 'USER_ENTERED',
        },
        now,
      ),
    ).toEqual({ text: 'Sista förbrukningsdag passerad', urgency: 'passed' });
  });

  it('identifies the documented three-day use-soon window and preserves estimates', () => {
    const estimate = {
      id: 'batch',
      quantity: 1,
      expiryDate: '2026-11-15',
      expiryType: 'BEST_BEFORE' as const,
      expirySource: 'ESTIMATED' as const,
    };
    expect(isUseSoon(estimate, now)).toBe(true);
    expect(getExpiryLabel(estimate, now)?.text).toBe('Uppskattat datum närmar sig');
    expect(
      getExpiryLabel({ ...estimate, expiryDate: null, expiryType: null, expirySource: null }, now),
    ).toBeNull();
  });
});
