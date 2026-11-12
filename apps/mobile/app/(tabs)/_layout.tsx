import { Tabs } from 'expo-router';
import { House, CookingPot, Refrigerator, ShoppingBasket } from 'lucide-react-native';
import { colors, typography } from '@cena/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_ICON_SIZE = 21;
export const unstable_settings = { initialRouteName: 'index' };

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand.primary,
        tabBarInactiveTintColor: colors.semantic.success,
        tabBarLabelStyle: { ...typography.caption, fontSize: 11, marginTop: 2 },
        tabBarStyle: {
          height: 58 + insets.bottom,
          paddingTop: 7,
          paddingBottom: Math.max(insets.bottom, 7),
          backgroundColor: colors.background.elevated,
          borderTopColor: colors.border,
        },
        sceneStyle: { backgroundColor: colors.background.primary },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Hem',
          tabBarAccessibilityLabel: 'Hem, flik',
          tabBarIcon: ({ color }) => <House size={TAB_ICON_SIZE} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="kitchen"
        options={{
          title: 'Mitt kök',
          tabBarAccessibilityLabel: 'Mitt kök, flik',
          tabBarIcon: ({ color }) => (
            <Refrigerator size={TAB_ICON_SIZE} color={color} strokeWidth={1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: 'Recept',
          tabBarAccessibilityLabel: 'Recept, flik',
          tabBarIcon: ({ color }) => (
            <CookingPot size={TAB_ICON_SIZE} color={color} strokeWidth={1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          title: 'Inköpslista',
          tabBarAccessibilityLabel: 'Inköpslista, flik',
          tabBarIcon: ({ color }) => (
            <ShoppingBasket size={TAB_ICON_SIZE} color={color} strokeWidth={1.8} />
          ),
        }}
      />
    </Tabs>
  );
}
