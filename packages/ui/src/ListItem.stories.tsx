import type { Meta, StoryObj } from '@storybook/react-native';
import { Text } from '@cena/ui';
import { ListItem } from './ListItem';

const meta = {
  title: 'Data Display/ListItem',
  component: ListItem,
  args: { children: <Text variant="label">Mjölk</Text> },
} satisfies Meta<typeof ListItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLeadingAndTrailingContent: Story = {
  args: {
    leading: <Text variant="label">M</Text>,
    children: (
      <>
        <Text variant="label">Mjölk</Text>
        <Text variant="bodySmall">1 liter · Kylskåp</Text>
      </>
    ),
    trailing: <Text variant="caption">Använd snart</Text>,
  },
};

export const Disabled: Story = {
  args: { onPress: () => undefined, disabled: true },
};
