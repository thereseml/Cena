import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { ReceiptProductCard, type ReceiptProductCardProps } from './ReceiptProductCard';
import { toReviewItem } from './receipt-review';

const item = toReviewItem({
  id: 'milk',
  name: 'Mellanmjölk',
  originalText: 'MELLANMJÖLK 2 st x 16,90 33,80',
  quantity: 2,
  unit: 'st',
  price: 33.8,
  classification: 'FOOD',
  storageLocation: 'FRIDGE',
});

function InteractiveCard(args: ReceiptProductCardProps) {
  const [value, setValue] = useState(args.item);
  return <ReceiptProductCard {...args} item={value} onChange={setValue} />;
}

const meta = {
  title: 'Receipt/ReceiptProductCard',
  component: ReceiptProductCard,
  args: { item, onChange: () => undefined, onRemove: () => undefined },
  render: (args) => <InteractiveCard {...args} />,
} satisfies Meta<typeof ReceiptProductCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Checked: Story = {};
export const Unchecked: Story = { args: { item: { ...item, selected: false } } };
export const Unknown: Story = {
  args: { item: { ...item, classification: 'UNKNOWN', selected: false } },
};
export const MissingStorage: Story = { args: { item: { ...item, storageLocation: null } } };
export const SuggestedAmount: Story = {
  args: {
    item: { ...item, quantity: '1', unit: 'st', suggestedQuantity: true, suggestedUnit: true },
  },
};
export const Disabled: Story = { args: { disabled: true } };
export const InvalidQuantity: Story = { args: { item: { ...item, quantity: '0' } } };
export const LongName: Story = {
  args: {
    item: {
      ...item,
      name: 'Ekologisk svensk mellanmjölk från gårdar i närheten med en lång produktbeskrivning',
    },
  },
};
