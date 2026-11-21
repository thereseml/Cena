import { fireEvent, render } from '@testing-library/react-native';
import type { InventoryItem } from '@cena/contracts';
import { router } from 'expo-router';
import { InventoryItemForm } from '../features/inventory/InventoryItemForm';
import {
  getExpiryLabel,
  getExpiryStatus,
  isUseSoon,
  stockholmCalendarDate,
} from '../features/inventory/expiry';
import { useHouseholdInventory } from '../features/inventory/useHouseholdInventory';
import KitchenScreen from '../app/(tabs)/kitchen';
import HomeScreen from '../app/(tabs)/index';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('lucide-react-native', () => ({
  ArrowRight: () => null,
  Camera: () => null,
  Clock3: () => null,
  Plus: () => null,
  Search: () => null,
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
    fireEvent.press(getByText('Lägg till vara'));

    expect(getByText('Ditt kök är tomt')).toBeTruthy();
    expect(
      getByText('Lägg till din första vara så hjälper Cena dig hålla koll på vad du har hemma.'),
    ).toBeTruthy();
    expect(router.push).toHaveBeenCalledWith('/add-product');
  });

  it('groups manual and receipt actions and opens receipt import', async () => {
    const { getByText } = await render(<KitchenScreen />);

    expect(getByText('Lägg till vara')).toBeTruthy();
    await fireEvent.press(getByText('Skanna kvitto'));

    expect(router.push).toHaveBeenCalledWith('/receipt-import');
  });

  it('keeps the profile action available alongside the count and grouped kitchen actions', async () => {
    const { getByLabelText, getByRole } = await render(<KitchenScreen />);

    expect(getByLabelText('Öppna profil och inställningar')).toBeTruthy();
    expect(getByRole('button', { name: 'Lägg till vara' })).toBeTruthy();
    expect(getByRole('button', { name: 'Skanna kvitto' })).toBeTruthy();
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

  it('filters and sorts by dates while retaining undated items last', async () => {
    const today = stockholmCalendarDate();
    const nearDate = inventoryDateOffset(today, 1);
    const passedDate = inventoryDateOffset(today, -1);
    const soon: InventoryItem = {
      ...fridgeItem,
      id: 'cream',
      name: 'Grädde',
      batches: [{ ...fridgeItem.batches[0], id: 'cream-batch', expiryDate: nearDate, expiryType: 'BEST_BEFORE', expirySource: 'USER_ENTERED' }],
    };
    const passed: InventoryItem = {
      ...fridgeItem,
      id: 'chicken',
      name: 'Kyckling',
      batches: [{ ...fridgeItem.batches[0], id: 'chicken-batch', expiryDate: passedDate, expiryType: 'USE_BY', expirySource: 'USER_ENTERED' }],
    };
    const later: InventoryItem = {
      ...fridgeItem,
      id: 'pasta-date',
      name: 'Ris',
      batches: [
        { ...fridgeItem.batches[0], id: 'rice-batch', expiryDate: inventoryDateOffset(today, 5), expiryType: 'BEST_BEFORE', expirySource: 'USER_ENTERED' },
        { ...fridgeItem.batches[0], id: 'rice-later-batch', expiryDate: inventoryDateOffset(today, 10), expiryType: 'BEST_BEFORE', expirySource: 'USER_ENTERED' },
      ],
    };
    useInventoryMock.mockReturnValue({
      householdId: 'household-id',
      items: [fridgeItem, later, soon, passed],
      loading: false,
      error: null,
      retry: jest.fn(),
    });

    const screen = await render(<KitchenScreen />);
    await fireEvent.press(screen.getByText('Snart datum'));
    expect(screen.getByText('Grädde')).toBeTruthy();
    expect(screen.queryByText('Kyckling')).toBeNull();
    await fireEvent.press(screen.getByText('Datum passerat'));
    expect(screen.getByText('Kyckling')).toBeTruthy();
    expect(screen.queryByText('Grädde')).toBeNull();
    await fireEvent.press(screen.getByText('Alla varor'));
    await fireEvent.press(screen.getByText('Sortera: Tidigaste datum'));
    const productOrder = screen
      .getAllByRole('button')
      .map((node) => node.props.accessibilityLabel as string)
      .filter((label) => /^(Kyckling|Grädde|Ris|Mjölk),/.test(label));
    expect(productOrder.map((label) => label.split(',')[0])).toEqual([
      'Kyckling',
      'Grädde',
      'Ris',
      'Mjölk',
    ]);
    await fireEvent.press(screen.getByText('Sortera: Senaste datum'));
    const latestOrder = screen
      .getAllByRole('button')
      .map((node) => node.props.accessibilityLabel as string)
      .filter((label) => /^(Kyckling|Grädde|Ris|Mjölk),/.test(label));
    expect(latestOrder.map((label) => label.split(',')[0])).toEqual([
      'Ris',
      'Grädde',
      'Kyckling',
      'Mjölk',
    ]);
  });

  it('searches persisted inventory by food name', async () => {
    const { getByLabelText, getByText, queryByText } = await render(<KitchenScreen />);
    await fireEvent.changeText(getByLabelText('Sök i ditt kök'), 'pasta');

    expect(getByText('Pasta')).toBeTruthy();
    expect(queryByText('Mjölk')).toBeNull();
  });

  it('uses a compact, accessibly named search field', async () => {
    const { getByLabelText, queryByText } = await render(<KitchenScreen />);

    expect(getByLabelText('Sök i ditt kök')).toBeTruthy();
    expect(queryByText('Sök i ditt kök')).toBeNull();
  });
});

function inventoryDateOffset(date: string, offset: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + offset));
  return `${result.getUTCFullYear()}-${String(result.getUTCMonth() + 1).padStart(2, '0')}-${String(result.getUTCDate()).padStart(2, '0')}`;
}

describe('HomeScreen inventory summary', () => {
  it('shows persisted inventory counts and links to recipes without mock availability', async () => {
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

    const { getByText, queryByLabelText } = await render(<HomeScreen />);

    expect(getByText('varor hemma')).toBeTruthy();
    expect(getByText('att använda snart')).toBeTruthy();
    expect(getByText('Från ditt sparade kök.')).toBeTruthy();
    expect(queryByLabelText(/^Visa receptet /)).toBeNull();
    await fireEvent.press(getByText('Vad ska vi laga idag?'));
    expect(router.push).toHaveBeenCalledWith('/(tabs)/recipes');
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
    ).toEqual({ text: 'Sista förbrukningsdag har passerat', urgency: 'passed' });
  });

  it.each([
    [null, 'NO_DATE'],
    ['2026-11-19', 'FUTURE'],
    ['2026-11-16', 'EXPIRING_SOON'],
    ['2026-11-13', 'DATE_REACHED'],
    ['2026-11-12', 'DATE_PASSED'],
  ] as const)('classifies %s relative to the Stockholm calendar day', (date, expected) => {
    expect(getExpiryStatus(date, now)).toBe(expected);
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
    expect(isUseSoon({ ...estimate, expiryDate: '2026-11-12' }, now)).toBe(false);
    expect(
      getExpiryLabel({ ...estimate, expiryDate: null, expiryType: null, expirySource: null }, now),
    ).toBeNull();
  });
});
