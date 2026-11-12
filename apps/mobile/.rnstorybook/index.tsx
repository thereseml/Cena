import { registerRootComponent } from 'expo';
import { useEffect, useState, type ComponentType } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function StorybookEntry() {
  const [StorybookRuntime, setStorybookRuntime] = useState<ComponentType | null>(null);

  useEffect(() => {
    setStorybookRuntime(() => require('./StorybookRuntime').default);
  }, []);

  if (!StorybookRuntime) {
    return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;
  }

  return <StorybookRuntime />;
}

registerRootComponent(StorybookEntry);
