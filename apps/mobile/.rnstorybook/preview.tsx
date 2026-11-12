import type { Preview } from '@storybook/react-native';
import { colors } from '@cena/ui';
import { View } from 'react-native';

const preview: Preview = {
  decorators: [
    (Story) => (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.background.primary }}>
        <Story />
      </View>
    ),
  ],
};

export default preview;
