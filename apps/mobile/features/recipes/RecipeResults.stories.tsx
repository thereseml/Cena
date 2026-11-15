import type { Meta, StoryObj } from '@storybook/react-native';
import { ScrollView } from 'react-native';
import { spacing } from '@cena/ui';
import { RecipeResults } from './RecipeResults';
import { ALL_AVAILABLE_RECIPE, LONG_RECIPE, RECIPE_PAGE, UNKNOWN_RECIPE } from './recipe-fixtures';

const meta = {
  title: 'Recipes/Results',
  component: RecipeResults,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Story />
      </ScrollView>
    ),
  ],
  args: {
    data: RECIPE_PAGE,
    loading: false,
    error: null,
    onRetry: () => undefined,
    onSelect: () => undefined,
    onPage: () => undefined,
  },
} satisfies Meta<typeof RecipeResults>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Loading: Story = { args: { data: null, loading: true } };
export const Error: Story = {
  args: { data: null, error: 'Det gick inte att nå Cena. Försök igen.' },
};
export const Empty: Story = { args: { data: { ...RECIPE_PAGE, items: [], total: 0 } } };
export const AwaitingEditorialReview: Story = {
  args: {
    data: { ...RECIPE_PAGE, items: [], total: 0 },
    emptyTitle: 'Receptbiblioteket väntar på granskning',
    emptyDescription:
      'Recept visas här när de har granskats och publicerats. Inga recept publiceras automatiskt.',
  },
};
export const LongTitle: Story = { args: { data: { ...RECIPE_PAGE, items: [LONG_RECIPE] } } };
export const AllAvailable: Story = {
  args: { data: { ...RECIPE_PAGE, items: [ALL_AVAILABLE_RECIPE] } },
};
export const Unknown: Story = { args: { data: { ...RECIPE_PAGE, items: [UNKNOWN_RECIPE] } } };
export const Paging: Story = { args: { data: { ...RECIPE_PAGE, total: 30 } } };
