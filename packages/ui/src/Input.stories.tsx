import type { Meta, StoryObj } from '@storybook/react-native';
import { Input } from '@cena/ui';
const meta = { title: 'Primitives/Input', component: Input, args: { label: 'Livsmedel' } } satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const WithPlaceholder: Story = { args: { placeholder: 'Till exempel mjölk' } };
export const Error: Story = { args: { error: 'Ange ett livsmedel' } };
export const Disabled: Story = { args: { editable: false } };
