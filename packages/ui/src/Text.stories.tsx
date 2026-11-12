import type { Meta, StoryObj } from '@storybook/react-native';
import { Text } from '@cena/ui';

const meta = {
  title: 'Primitives/Text',
  component: Text,
  args: { children: 'Mat som gör vardagen lite enklare.' },
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Display: Story = { args: { variant: 'display' } };
export const Headings: Story = {
  render: () => (
    <>
      <Text variant="h1">Kvällens middag</Text>
      <Text variant="h2">Använd det du har hemma</Text>
      <Text variant="h3">Något gott, utan krångel</Text>
    </>
  ),
};
export const Body: Story = { args: { variant: 'body' } };
export const Caption: Story = { args: { variant: 'caption', tone: 'muted' } };
