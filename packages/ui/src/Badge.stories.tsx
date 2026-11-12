import type { Meta, StoryObj } from '@storybook/react-native';
import { Badge } from '@cena/ui';

const meta = {
  title: 'Data Display/Badge',
  component: Badge,
  args: { label: '4 av 5 ingredienser' },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = {};

export const Success: Story = { args: { label: 'Tillgänglig', variant: 'success' } };

export const Warning: Story = { args: { label: 'Använd snart', variant: 'warning' } };

export const Error: Story = { args: { label: 'Saknas', variant: 'error' } };
