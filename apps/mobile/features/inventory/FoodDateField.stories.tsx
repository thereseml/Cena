import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { FoodDateField } from './FoodDateField';

function InteractiveField(props: React.ComponentProps<typeof FoodDateField>) {
  const [value, setValue] = useState({ date: props.date, type: props.type });
  return (
    <FoodDateField
      {...props}
      {...value}
      onChange={(date, type) => {
        setValue({ date, type });
        props.onChange(date, type);
      }}
    />
  );
}

const meta = {
  title: 'Inventory/FoodDateField',
  component: FoodDateField,
  args: { date: '', type: null, onChange: () => undefined },
  render: (args) => <InteractiveField {...args} />,
} satisfies Meta<typeof FoodDateField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OptionalDate: Story = {};
export const BestBefore: Story = { args: { date: '2030-11-15', type: 'BEST_BEFORE' } };
export const UseBy: Story = { args: { date: '2030-11-15', type: 'USE_BY' } };
export const Invalid: Story = { args: { date: '2030-02-30', type: null, error: 'Ange ett giltigt datum.' } };
export const Disabled: Story = { args: { date: '2030-11-15', type: 'BEST_BEFORE', disabled: true } };
