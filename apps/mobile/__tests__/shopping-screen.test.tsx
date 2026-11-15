import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import ShoppingScreen from '../app/(tabs)/shopping';
import { apiRequest } from '../lib/api';
import type { ShoppingListItem } from '@cena/contracts';
import { spacing } from '@cena/ui';

const householdId = 'household-a';
let items: ShoppingListItem[];
let failListRead: boolean;

jest.mock('../features/auth/AuthProvider', () => ({
  useAuth: () => ({ profile: { households: [{ id: householdId }] } }),
}));
jest.mock('../lib/api', () => ({
  ...jest.requireActual('../lib/api'),
  apiRequest: jest.fn(),
}));
jest.mock('../lib/supabase', () => ({ getSupabaseClient: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useFocusEffect: (callback: () => () => void) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(() => callback(), [callback]);
  },
}));
jest.mock('lucide-react-native', () => ({
  Check: () => null,
  Circle: () => null,
  Pencil: () => null,
  Plus: () => null,
  Trash2: () => null,
  UserRound: () => null,
}));

const request = jest.mocked(apiRequest);
function makeItem(overrides: Partial<ShoppingListItem> = {}): ShoppingListItem {
  return {
    id: 'item-a', name: 'Pasta', quantity: null, unit: null, isPurchased: false,
    recipeId: null, recipeTitle: null, version: 0,
    createdAt: '2026-11-15T12:00:00.000Z', updatedAt: '2026-11-15T12:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  items = [];
  failListRead = false;
  request.mockImplementation(async (path, init = {}) => {
    if (path.endsWith('/shopping-list')) {
      if (failListRead) throw new Error('offline');
      return { items: [...items] };
    }
    const url = new URL(`https://cena.test/${path}`);
    const segments = url.pathname.split('/');
    const itemId = segments.at(-1) === 'purchased' ? segments.at(-2) : segments.at(-1);
    if (init.method === 'POST' && url.pathname.endsWith('/items')) {
      const input = JSON.parse(String(init.body)) as { name: string; quantity: number | null; unit: ShoppingListItem['unit'] };
      items.push(makeItem({ id: `item-${items.length + 1}`, ...input }));
      return items.at(-1);
    }
    if (init.method === 'PATCH' && url.pathname.endsWith('/purchased')) {
      const input = JSON.parse(String(init.body)) as { isPurchased: boolean };
      items = items.map((item) => item.id === itemId ? { ...item, ...input, version: item.version + 1 } : item);
      return items.find((item) => item.id === itemId);
    }
    return undefined;
  });
});

it('shows the approved empty state and adds a manual item without quantity', async () => {
  const screen = await render(<ShoppingScreen />);
  expect(await screen.findByText('Din inköpslista är tom.')).toBeTruthy();
  expect(screen.getByText('Lägg till något du behöver handla eller välj ingredienser från ett recept.')).toBeTruthy();

  await fireEvent.changeText(screen.getByPlaceholderText('Lägg till en vara...'), 'Havremjölk');
  await fireEvent.press(screen.getByText('Lägg till vara'));

  expect(await screen.findByRole('checkbox', { name: 'Havremjölk' })).toBeTruthy();
  expect(items).toHaveLength(1);
  expect(items[0]).toMatchObject({ name: 'Havremjölk', quantity: null, unit: null });
});

it('checks a purchased item and shows the separate inventory transfer action', async () => {
  items = [makeItem()];
  const screen = await render(<ShoppingScreen />);
  const checkbox = await screen.findByRole('checkbox', { name: 'Pasta' });
  expect(screen.getByTestId('shopping-row-actions').props.style.gap).toBe(spacing.sm);
  await fireEvent.press(checkbox);

  await waitFor(() => expect(items[0].isPurchased).toBe(true));
  expect(await screen.findByText('Handlat')).toBeTruthy();
  await fireEvent.press(screen.getByText('Lägg till i Mitt kök'));
  expect(router.push).toHaveBeenCalledWith('/shopping-import');
  expect(request).toHaveBeenCalledWith(
    `households/${householdId}/shopping-list/items/item-a/purchased`,
    expect.objectContaining({ method: 'PATCH' }),
  );
});

it('offers a retry after a list loading failure', async () => {
  failListRead = true;
  const screen = await render(<ShoppingScreen />);
  expect(await screen.findByText('Inköpslistan kunde inte läsas in')).toBeTruthy();

  failListRead = false;
  await fireEvent.press(screen.getByText('Försök igen'));
  expect(await screen.findByText('Din inköpslista är tom.')).toBeTruthy();
});
