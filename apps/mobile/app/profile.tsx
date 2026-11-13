import { router } from 'expo-router';
import { ArrowLeft, CircleUserRound, House, Info } from 'lucide-react-native';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, colors, spacing, Text } from '@cena/ui';
import { useAuth } from '../features/auth/AuthProvider';

export default function ProfileScreen() {
  const { profile, signOut } = useAuth();
  const household = profile?.households[0];

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Tillbaka"
          style={styles.backButton}
        >
          <ArrowLeft size={20} color={colors.brand.primary} strokeWidth={1.8} />
        </Pressable>
        <Text variant="h1" style={styles.title}>
          Profil & inställningar
        </Text>
        <Text style={styles.intro}>Här kommer du kunna anpassa Cena efter ditt hushåll.</Text>

        <Text variant="caption" style={styles.sectionLabel}>
          HUSHÅLL
        </Text>
        <View style={styles.settingRow}>
          <House size={20} color={colors.brand.primary} strokeWidth={1.8} />
          <View style={styles.rowCopy}>
            <Text variant="label">Ditt hushåll</Text>
            <Text variant="bodySmall">{household?.name ?? 'Du tillhör inget hushåll ännu.'}</Text>
          </View>
        </View>

        <Text variant="caption" style={styles.sectionLabel}>
          KONTO
        </Text>
        <View style={styles.settingRow}>
          <CircleUserRound size={20} color={colors.brand.primary} strokeWidth={1.8} />
          <View style={styles.rowCopy}>
            <Text variant="label">{profile?.email ?? 'Ditt konto'}</Text>
            <Text variant="bodySmall">Inloggad med engångskod via e-post.</Text>
          </View>
        </View>

        <Button
          label="Logga ut"
          variant="outline"
          onPress={() => {
            void signOut().catch(() => Alert.alert('Kunde inte logga ut', 'Försök igen.'));
          }}
          style={styles.signOut}
        />

        <Text variant="caption" style={styles.sectionLabel}>
          OM CENA
        </Text>
        <View style={styles.settingRow}>
          <Info size={20} color={colors.brand.primary} strokeWidth={1.8} />
          <View style={styles.rowCopy}>
            <Text variant="label">cena.</Text>
            <Text variant="bodySmall">Mindre svinn. Mer smak.</Text>
          </View>
          <Text variant="caption" style={styles.version}>
            Beta · 0.1.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background.primary },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  backButton: { width: 48, height: 48, justifyContent: 'center' },
  title: { color: colors.brand.primary, marginTop: spacing.md },
  intro: { lineHeight: 24, marginTop: spacing.sm, marginBottom: spacing.xl },
  sectionLabel: { color: colors.semantic.success, marginTop: spacing.lg, marginBottom: spacing.xs },
  settingRow: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowCopy: { flex: 1, gap: spacing.xs },
  version: { color: colors.text.muted },
  signOut: { marginTop: spacing.xl },
});
