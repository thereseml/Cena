import type { StorybookConfig } from '@storybook/react-native';

const config: StorybookConfig = {
  stories: [
    '../../../packages/ui/src/**/*.stories.tsx',
    '../components/**/*.stories.tsx',
    '../storybook/**/*.stories.tsx',
  ],
  deviceAddons: ['@storybook/addon-ondevice-controls', '@storybook/addon-ondevice-actions'],
};

export default config;
