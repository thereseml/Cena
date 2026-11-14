import type { Meta, StoryObj } from '@storybook/react-native';
import { ReceiptReview } from './ReceiptReview';
import { toReviewItem } from './receipt-review';

const food = toReviewItem({
  id: 'pasta',
  name: 'Pasta',
  originalText: 'PASTA 19,90',
  quantity: null,
  unit: null,
  price: 19.9,
  classification: 'FOOD',
  storageLocation: 'PANTRY',
});
const meta = {
  title: 'Receipt/ReceiptReview',
  component: ReceiptReview,
  args: {
    items: [food],
    unrecognizedLines: [],
    disabled: false,
    onChange: () => undefined,
    onRemove: () => undefined,
    onAdd: () => undefined,
    onConvertLine: () => undefined,
  },
} satisfies Meta<typeof ReceiptReview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Empty: Story = { args: { items: [] } };
export const ReviewNeeded: Story = {
  args: { items: [{ ...food, classification: 'UNKNOWN', selected: false, storageLocation: null }] },
};
export const ManuallySelectedUnknown: Story = {
  args: { items: [{ ...food, classification: 'UNKNOWN', selected: true }] },
};
export const OtherAndUnrecognized: Story = {
  args: {
    items: [
      food,
      {
        ...food,
        id: 'soap',
        name: 'Tvål',
        originalText: 'TVÅL 29,90',
        classification: 'NON_FOOD',
        selected: false,
      },
    ],
    unrecognizedLines: ['SVÅRLÄST KVITTORAD'],
  },
};
export const Disabled: Story = { args: { disabled: true } };
