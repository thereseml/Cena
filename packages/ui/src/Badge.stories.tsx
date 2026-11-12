import type { Meta, StoryObj } from '@storybook/react-native';
import { Badge } from '@cena/ui';
const meta = { title: 'Primitives/Badge', component: Badge, args: { label: 'Använd snart' } } satisfies Meta<typeof Badge>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
