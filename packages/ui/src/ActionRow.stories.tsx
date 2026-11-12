import type { Meta, StoryObj } from '@storybook/react-native';
import { Text } from '@cena/ui';
import { ActionRow } from './ActionRow';

const meta = {
  title: 'Actions/ActionRow',
  component: ActionRow,
  args: { title: 'Lägg till mat', onPress: () => undefined },
} satisfies Meta<typeof ActionRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithDescriptionAndIcon: Story = {
  args: {
    description: 'Håll koll på det du har hemma',
    leadingIcon: <Text variant="h3">+</Text>,
    trailingIcon: <Text variant="h3">›</Text>,
  },
};

export const Disabled: Story = { args: { description: 'Tillgänglig senare', disabled: true } };
