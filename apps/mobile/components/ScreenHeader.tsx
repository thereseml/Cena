import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';
import { UserRound } from 'lucide-react-native';
import { colors, spacing, Text } from '@cena/ui';

interface ScreenHeaderProps {
  title: string;
  eyebrow?: string;
  onProfilePress?: PressableProps['onPress'];
}

export function ScreenHeader({ title, eyebrow, onProfilePress }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.heading}>
        {eyebrow ? (
          <Text variant="caption" style={styles.eyebrow}>
            {eyebrow}
          </Text>
        ) : null}
        <Text variant="h1" style={styles.title}>
          {title}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Öppna profil och inställningar"
        onPress={onProfilePress}
        style={styles.profileButton}
      >
        <UserRound size={21} color={colors.brand.primary} strokeWidth={1.8} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  heading: { flex: 1, paddingRight: spacing.base },
  eyebrow: { color: colors.semantic.success, marginBottom: spacing.xs },
  title: { color: colors.brand.primary },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.subtle,
  },
});
