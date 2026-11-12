import { router } from 'expo-router';
import { ArrowLeft, CircleUserRound, House, Info } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, Text } from '@cena/ui';

export default function ProfileScreen() {
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
            <Text variant="bodySmall">Hushållsinformation är inte tillgänglig ännu.</Text>
          </View>
        </View>

        <Text variant="caption" style={styles.sectionLabel}>
          KONTO
        </Text>
        <View style={styles.settingRow}>
          <CircleUserRound size={20} color={colors.brand.primary} strokeWidth={1.8} />
          <View style={styles.rowCopy}>
            <Text variant="label">Kontoinställningar</Text>
            <Text variant="bodySmall">Konton och inloggning kommer senare.</Text>
          </View>
        </View>

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
});
