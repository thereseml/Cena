import type { Meta, StoryObj } from '@storybook/react-native';
import { MOCK_PRODUCTS } from '../data/mockData';
import { InventoryItemRow } from './InventoryItemRow';

const meta = {
  title: 'Product/InventoryItemRow',
  component: InventoryItemRow,
  args: { product: MOCK_PRODUCTS[0] },
} satisfies Meta<typeof InventoryItemRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ExpiringSoon: Story = {};

export const WithoutExpiryDate: Story = {
  args: { product: MOCK_PRODUCTS[2] },
};

export const LongProductName: Story = {
  args: {
    product: {
      ...MOCK_PRODUCTS[0],
      name: 'Ekologisk mellanmjölk med lång produktbeskrivning',
    },
  },
};
