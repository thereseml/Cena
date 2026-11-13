import { fireEvent, render } from '@testing-library/react-native';
import { InventoryItemRow } from '../components/InventoryItemRow';
import { ShoppingListItem } from '../components/ShoppingListItem';
import type { InventoryItem } from '@cena/contracts';

const milk: InventoryItem = {
  id: 'milk',
  name: 'Mjölk',
  quantity: 1,
  unit: 'l',
  storageLocation: 'FRIDGE',
  batches: [
    {
      id: 'milk-batch',
      quantity: 1,
      expiryDate: '2030-11-14',
      expiryType: 'BEST_BEFORE',
      expirySource: 'USER_ENTERED',
    },
  ],
  createdAt: '2030-11-13T12:00:00.000Z',
  updatedAt: '2030-11-13T12:00:00.000Z',
  version: 0,
};

jest.mock('lucide-react-native', () => ({
  Check: () => null,
  Circle: () => null,
}));

describe('product list components', () => {
  it('shows inventory quantity, location, and expiry status', async () => {
    const { getByText } = await render(<InventoryItemRow item={milk} />);

    expect(getByText('Mjölk')).toBeTruthy();
    expect(getByText('1 l · Kylskåp')).toBeTruthy();
    expect(getByText('Bäst före 14 nov.')).toBeTruthy();
  });

  it('shows the label for the earliest-expiring batch', async () => {
    const item: InventoryItem = {
      ...milk,
      batches: [
        { ...milk.batches[0], id: 'later', expiryDate: '2030-11-20' },
        { ...milk.batches[0], id: 'earlier', expiryDate: '2030-11-14' },
      ],
    };
    const { getByText, queryByText } = await render(<InventoryItemRow item={item} />);

    expect(getByText('Bäst före 14 nov.')).toBeTruthy();
    expect(queryByText('Bäst före 20 nov.')).toBeNull();
  });

  it('announces shopping checkbox state and invokes the toggle handler', async () => {
    const onToggle = jest.fn();
    const { getByRole } = await render(
      <ShoppingListItem item="Citroner" checked={false} onToggle={onToggle} />,
    );
    const checkbox = getByRole('checkbox', { name: 'Citroner' });

    expect(checkbox.props.accessibilityState.checked).toBe(false);
    fireEvent.press(checkbox);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
