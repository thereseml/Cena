import type { Meta, StoryObj } from '@storybook/react-native';
import { IconButton, Text } from '@cena/ui';
import { SectionHeader } from './SectionHeader';

const meta = {
  title: 'Data Display/SectionHeader',
  component: SectionHeader,
  args: { title: 'Små saker, stor skillnad' },
} satisfies Meta<typeof SectionHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithDescription: Story = {
  args: { description: 'Förslag utifrån exempelvarorna i ditt kök.' },
};

export const WithTrailingAction: Story = {
  args: {
    trailing: (
      <IconButton
        icon={<Text variant="h3">›</Text>}
        accessibilityLabel="Visa allt"
        variant="outline"
      />
    ),
  },
};
