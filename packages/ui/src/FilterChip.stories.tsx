import type { Meta, StoryObj } from '@storybook/react-native';
import { FilterChip } from './FilterChip';

const meta = {
  title: 'Data Display/FilterChip',
  component: FilterChip,
  args: { label: 'Kylskåp', onPress: () => undefined },
} satisfies Meta<typeof FilterChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unselected: Story = {};

export const Selected: Story = { args: { selected: true } };

export const Disabled: Story = { args: { disabled: true } };

export const LongLabel: Story = { args: { label: 'Varor som snart behöver användas' } };
