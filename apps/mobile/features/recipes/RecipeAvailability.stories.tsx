import type { Meta, StoryObj } from '@storybook/react-native';
import { RecipeAvailability } from './RecipeAvailability';
import { ALL_AVAILABLE_RECIPE, RECIPE_FIXTURE } from './recipe-fixtures';

const meta = {
  title: 'Recipes/Availability',
  component: RecipeAvailability,
  args: { availability: RECIPE_FIXTURE.availability },
} satisfies Meta<typeof RecipeAvailability>;
export default meta;
type Story = StoryObj<typeof meta>;
export const SomeMissing: Story = {};
export const AllAvailable: Story = { args: { availability: ALL_AVAILABLE_RECIPE.availability } };
export const Unknown: Story = { args: { availability: null } };
