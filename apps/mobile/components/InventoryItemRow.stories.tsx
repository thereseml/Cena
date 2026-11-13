import type { Meta, StoryObj } from '@storybook/react-native';
import type { InventoryItem } from '@cena/contracts';
import { InventoryItemRow } from './InventoryItemRow';

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
      expiryDate: '2030-11-14',
      expiryType: 'BEST_BEFORE',
      expirySource: 'USER_ENTERED',
    },
  ],
  createdAt: '2030-11-13T12:00:00.000Z',
  updatedAt: '2030-11-13T12:00:00.000Z',
  version: 0,
};

const meta = {
  title: 'Product/InventoryItemRow',
  component: InventoryItemRow,
  args: { item },
} satisfies Meta<typeof InventoryItemRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ExpiringSoon: Story = {
  args: {
    item: {
      ...item,
      batches: [{ ...item.batches[0], expiryDate: '2026-11-15' }],
    },
  },
};

export const WithoutExpiryDate: Story = {
  args: {
    item: {
      ...item,
      batches: [{ ...item.batches[0], expiryDate: null, expiryType: null, expirySource: null }],
    },
  },
};

export const LongProductName: Story = {
  args: { item: { ...item, name: 'Ekologisk mellanmjölk med lång produktbeskrivning' } },
};
