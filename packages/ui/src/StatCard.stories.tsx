import type { Meta, StoryObj } from '@storybook/react-native';
import { StatCard } from './StatCard';

const meta = {
  title: 'Data Display/StatCard',
  component: StatCard,
  args: { items: [{ value: 6, label: 'varor hemma' }] },
} satisfies Meta<typeof StatCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SingleStatistic: Story = {};

export const KitchenOverview: Story = {
  args: {
    items: [
      { value: 6, label: 'varor hemma' },
      { value: 2, label: 'att använda snart' },
    ],
  },
};

export const LongLabels: Story = {
  args: {
    items: [
      { value: 12, label: 'varor i kylskåpet och skafferiet' },
      { value: 3, label: 'varor som behöver användas inom kort' },
    ],
  },
};
