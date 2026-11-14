import { ExpoRoot } from 'expo-router';
import type { Meta, StoryObj } from '@storybook/react-native';
import type { ComponentProps } from 'react';

declare const require: {
  context(directory: string): ComponentProps<typeof ExpoRoot>['context'];
};

const appRoutes = require.context('../app');

interface AppRouteStoryProps {
  location: string;
}

function AppRouteStory({ location }: AppRouteStoryProps) {
  return <ExpoRoot context={appRoutes} location={location} />;
}

const meta = {
  title: 'App/Navigation and Pages',
  component: AppRouteStory,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AppRouteStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HomeAndMenu: Story = { args: { location: '/' } };

export const KitchenTab: Story = { args: { location: '/kitchen' } };

export const RecipesTab: Story = { args: { location: '/recipes' } };

export const ShoppingTab: Story = { args: { location: '/shopping' } };

export const ProfileSettings: Story = { args: { location: '/profile' } };

export const AddProduct: Story = { args: { location: '/add-product' } };

export const ReceiptImport: Story = { args: { location: '/receipt-import' } };

export const RecipeDetails: Story = { args: { location: '/recipe/tomato-pasta' } };
