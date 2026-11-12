import type { Meta, StoryObj } from '@storybook/react-native';
import { Button } from '@cena/ui';

const meta = { title: 'Primitives/Button', component: Button, args: { label: 'Lägg till vara' } } satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Primary: Story = {};
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Outline: Story = { args: { variant: 'outline' } };
export const Disabled: Story = { args: { disabled: true } };
export const Loading: Story = { args: { loading: true } };
