import type { Meta, StoryObj } from '@storybook/react-native';
import { Button, EmptyState, Text } from '@cena/ui';

const meta = {
  title: 'Feedback/EmptyState',
  component: EmptyState,
  args: { title: 'Ditt kök är tomt', description: 'Lägg till en vara för att komma igång.' },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutDescription: Story = { args: { description: undefined } };

export const WithIconAndAction: Story = {
  args: {
    icon: <Text variant="h1">+</Text>,
    action: <Button label="Lägg till vara" onPress={() => undefined} />,
  },
};
