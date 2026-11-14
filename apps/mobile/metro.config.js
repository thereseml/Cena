const { getDefaultConfig } = require('expo/metro-config');
const { withStorybook } = require('@storybook/react-native/withStorybook');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts = [...new Set([...config.resolver.assetExts, 'txt', 'wasm', 'gz'])];

module.exports = withStorybook(config, {
  configPath: './.rnstorybook',
  enabled: process.env.STORYBOOK_ENABLED === 'true',
});
