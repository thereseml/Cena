import { fireEvent, render } from '@testing-library/react-native';
import { InventoryItemRow } from '../components/InventoryItemRow';
import { ShoppingListItem } from '../components/ShoppingListItem';
import { MOCK_PRODUCTS } from '../data/mockData';

jest.mock('lucide-react-native', () => ({
  Check: () => null,
  Circle: () => null,
}));

describe('product list components', () => {
  it('shows inventory quantity, location, and expiry status', async () => {
    const { getByText, getByLabelText } = await render(
      <InventoryItemRow product={MOCK_PRODUCTS[0]} />,
    );

    expect(getByText('Mjölk')).toBeTruthy();
    expect(getByText('1 liter · Kylskåp')).toBeTruthy();
    expect(getByLabelText('Använd snart')).toBeTruthy();
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
