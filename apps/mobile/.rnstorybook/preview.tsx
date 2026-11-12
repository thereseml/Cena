import type { Preview } from '@storybook/react-native';
import { colors } from '@cena/ui';
import { View } from 'react-native';

const preview: Preview = {
  decorators: [
    (Story, context) => (
      <View
        style={
          context.parameters.layout === 'fullscreen'
            ? { flex: 1, backgroundColor: colors.background.primary }
            : {
                flex: 1,
                justifyContent: 'center',
                padding: 24,
                backgroundColor: colors.background.primary,
              }
        }
      >
        <Story />
      </View>
    ),
  ],
};

export default preview;
