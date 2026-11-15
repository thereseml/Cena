import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { ShoppingListItem } from './ShoppingListItem';

function InteractiveShoppingListItem() {
  const [checked, setChecked] = useState(false);
  return (
    <ShoppingListItem
      item="Färsk basilika"
      checked={checked}
      onToggle={() => setChecked((current) => !current)}
    />
  );
}

const meta = {
  title: 'Product/ShoppingListItem',
  component: ShoppingListItem,
  args: { item: 'Färsk basilika', checked: false, onToggle: () => undefined },
} satisfies Meta<typeof ShoppingListItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {};

export const Checked: Story = { args: { checked: true } };

export const Interactive: Story = { render: () => <InteractiveShoppingListItem /> };

export const WithQuantity: Story = { args: { quantity: '500 g' } };

export const MissingQuantity: Story = {
  args: { item: 'En lång ingrediens som behöver få plats på flera rader', quantity: null },
};

export const Disabled: Story = { args: { disabled: true } };
