import type { Meta, StoryObj } from '@storybook/react-native';
import { ScrollView } from 'react-native';
import { spacing } from '@cena/ui';
import { RecipeDetails } from './RecipeDetails';
import {
  ALL_AVAILABLE_RECIPE,
  LONG_RECIPE,
  RECIPE_FIXTURE,
  UNKNOWN_RECIPE,
} from './recipe-fixtures';

const meta = {
  title: 'Recipes/Details',
  component: RecipeDetails,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Story />
      </ScrollView>
    ),
  ],
  args: {
    data: RECIPE_FIXTURE,
    loading: false,
    error: null,
    onRetry: () => undefined,
    onAddMissing: () => undefined,
  },
} satisfies Meta<typeof RecipeDetails>;
export default meta;
type Story = StoryObj<typeof meta>;
export const SomeMissing: Story = {};
export const Loading: Story = { args: { data: null, loading: true } };
export const Error: Story = {
  args: { data: null, error: 'Receptet kunde inte hämtas. Försök igen.' },
};
export const Empty: Story = { args: { data: null } };
export const LongTitle: Story = { args: { data: LONG_RECIPE } };
export const AllAvailable: Story = { args: { data: ALL_AVAILABLE_RECIPE } };
export const Unknown: Story = { args: { data: UNKNOWN_RECIPE } };
