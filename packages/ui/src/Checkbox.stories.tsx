import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { Checkbox, type CheckboxProps } from './Checkbox';

function InteractiveCheckbox(args: CheckboxProps) {
  const [checked, setChecked] = useState(args.checked ?? false);
  return <Checkbox {...args} checked={checked} onPress={() => setChecked(!checked)} />;
}

const meta = {
  title: 'Primitives/Checkbox',
  component: Checkbox,
  args: { label: 'Lägg till mjölk', checked: false },
  render: (args) => <InteractiveCheckbox {...args} />,
} satisfies Meta<typeof Checkbox>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {};
export const Checked: Story = { args: { checked: true } };
export const Disabled: Story = { args: { disabled: true } };
export const LongLabel: Story = {
  args: {
    label: 'Lägg till ekologisk svensk mellanmjölk och kontrollera mängden innan du fortsätter',
  },
};
