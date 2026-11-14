import type { Meta, StoryObj } from '@storybook/react-native';
import { Card, IconButton, spacing, Text } from '@cena/ui';
import { ScreenHeader } from './ScreenHeader';

const meta = {
  title: 'Navigation/ScreenHeader',
  component: ScreenHeader,
  args: { title: 'Mitt kök', eyebrow: '6 EXEMPELVAROR' },
} satisfies Meta<typeof ScreenHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutEyebrow: Story = { args: { eyebrow: undefined } };

export const WithTrailingAction: Story = {
  args: {
    trailing: <IconButton icon={<Text variant="h3">+</Text>} accessibilityLabel="Lägg till vara" />,
  },
};

export const LongTitle: Story = {
  args: { title: 'Profil och inställningar', eyebrow: 'DITT CENA-KONTO' },
};

export const CompactSpacing: Story = {
  render: () => (
    <>
      <ScreenHeader title="Mitt kök" eyebrow="6 VAROR" style={{ marginBottom: spacing.sm }} />
      <Card>
        <Text variant="bodySmall">Nästa åtgärd</Text>
      </Card>
    </>
  ),
};
