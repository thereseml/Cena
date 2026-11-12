import type { Meta, StoryObj } from '@storybook/react-native';
import { MOCK_RECIPES } from '../data/mockData';
import { RecipePreview } from './RecipePreview';

const meta = {
  title: 'Product/RecipePreview',
  component: RecipePreview,
  args: { recipe: MOCK_RECIPES[0] },
} satisfies Meta<typeof RecipePreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongerDescription: Story = {
  args: {
    recipe: {
      ...MOCK_RECIPES[0],
      description:
        'En enkel vardagsfavorit med smör, färska örter och långrostade tomater som får ta plats på bordet.',
    },
  },
};

export const FewerIngredientsAvailable: Story = {
  args: { recipe: MOCK_RECIPES[1] },
};
