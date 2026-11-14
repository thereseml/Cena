import type { Meta, StoryObj } from '@storybook/react-native';
import { ReceiptCapture } from './ReceiptCapture';

const meta = {
  title: 'Receipt/ReceiptCapture',
  component: ReceiptCapture,
  args: {
    asset: null,
    rotation: 0,
    busy: false,
    analyzing: false,
    onChoose: () => undefined,
    onRotate: () => undefined,
    onRead: () => undefined,
    onCancel: () => undefined,
  },
} satisfies Meta<typeof ReceiptCapture>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Loading: Story = { args: { busy: true, analyzing: true } };
export const Waiting: Story = { args: { busy: true } };
