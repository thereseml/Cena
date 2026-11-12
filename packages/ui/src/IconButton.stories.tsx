import type { Meta, StoryObj } from '@storybook/react-native';
import { Text } from '@cena/ui';
import { IconButton } from './IconButton';

const meta = {
  title: 'Actions/IconButton',
  component: IconButton,
  args: { icon: <Text variant="h3">+</Text>, accessibilityLabel: 'Lägg till vara' },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Subtle: Story = {};

export const Filled: Story = {
  args: {
    variant: 'filled',
    icon: (
      <Text variant="h3" tone="inverse">
        +
      </Text>
    ),
  },
};

export const Outline: Story = { args: { variant: 'outline' } };

export const Disabled: Story = { args: { disabled: true } };
