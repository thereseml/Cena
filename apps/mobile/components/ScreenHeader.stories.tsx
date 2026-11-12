import type { Meta, StoryObj } from '@storybook/react-native';
import { ScreenHeader } from './ScreenHeader';

const meta = {
  title: 'Product/ScreenHeader',
  component: ScreenHeader,
  args: { title: 'Mitt kök', eyebrow: '6 EXEMPELVAROR' },
} satisfies Meta<typeof ScreenHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongerTitle: Story = {
  args: { title: 'Profil och inställningar', eyebrow: 'DITT CENA-KONTO' },
};
