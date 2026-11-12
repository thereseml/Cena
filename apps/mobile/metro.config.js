const { getDefaultConfig } = require('expo/metro-config');
const { withStorybook } = require('@storybook/react-native/withStorybook');

const config = getDefaultConfig(__dirname);

module.exports = withStorybook(config, {
  configPath: './.rnstorybook',
  enabled: process.env.STORYBOOK_ENABLED === 'true',
});
