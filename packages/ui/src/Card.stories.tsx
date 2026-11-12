import type { Meta, StoryObj } from '@storybook/react-native';
import { Card, Text } from '@cena/ui';
const meta = { title: 'Primitives/Card', component: Card } satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const WithContent: Story = {
  render: () => (
    <Card>
      <Text variant="h3">Ditt kök</Text>
      <Text>Innehåll i ditt hushåll</Text>
    </Card>
  ),
};
