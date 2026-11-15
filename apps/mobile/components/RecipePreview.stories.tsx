import type { Meta, StoryObj } from '@storybook/react-native';
import {
  ALL_AVAILABLE_RECIPE,
  LONG_RECIPE,
  RECIPE_FIXTURE,
  UNKNOWN_RECIPE,
} from '../features/recipes/recipe-fixtures';
import { RecipePreview } from './RecipePreview';

const meta = {
  title: 'Product/RecipePreview',
  component: RecipePreview,
  args: { recipe: RECIPE_FIXTURE, onPress: () => undefined },
} satisfies Meta<typeof RecipePreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongerDescription: Story = {
  args: {
    recipe: {
      ...RECIPE_FIXTURE,
      description:
        'En enkel vardagsfavorit med smör, färska örter och långrostade tomater som får ta plats på bordet.',
    },
  },
};

export const FewerIngredientsAvailable: Story = {
  args: {
    recipe: {
      ...RECIPE_FIXTURE,
      availability: { available: 0, partial: 1, missing: 2, unknown: 1, total: 4 },
    },
  },
};

export const AllAvailable: Story = { args: { recipe: ALL_AVAILABLE_RECIPE } };
export const Unknown: Story = { args: { recipe: UNKNOWN_RECIPE } };
export const LongTitle: Story = { args: { recipe: LONG_RECIPE } };
