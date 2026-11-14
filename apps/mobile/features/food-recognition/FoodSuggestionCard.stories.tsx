import type { Meta, StoryObj } from '@storybook/react-native';
import { FoodSuggestionCard } from './FoodSuggestionCard';

const suggestion = {
  id: 'tomater-1',
  name: 'Tomater',
  quantity: 4,
  unit: 'st',
  description: null,
  confidence: 'MEDIUM',
  needsReview: true,
} as const;

const meta = {
  title: 'FoodRecognition/FoodSuggestionCard',
  component: FoodSuggestionCard,
  args: {
    suggestion,
    quantity: 4,
    unit: 'st',
    storageLocation: 'FRIDGE',
    expiryDate: null,
    onEdit: () => undefined,
    onRemove: () => undefined,
  },
} satisfies Meta<typeof FoodSuggestionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const UncertainWithoutQuantity: Story = {
  args: {
    suggestion: { ...suggestion, confidence: 'LOW', name: 'Okänd grönsak' },
    quantity: null,
    unit: null,
  },
};

export const WithUserEnteredExpiry: Story = {
  args: { expiryDate: '2026-11-20' },
};
