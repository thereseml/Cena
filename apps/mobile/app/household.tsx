import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Copy, House, UserRoundPlus } from 'lucide-react-native';
import type {
  CreatedHouseholdInvitation,
  CurrentUser,
  HouseholdInvitationSummary,
  HouseholdMemberSummary,
} from '@cena/contracts';
import {
  Badge,
  Button,
  Card,
  colors,
  EmptyState,
  IconButton,
  ScreenHeader,
  spacing,
  Text,
} from '@cena/ui';
import { apiErrorMessage, apiRequest } from '../lib/api';
import { useAuth } from '../features/auth/AuthProvider';

export default function HouseholdScreen() {
  const { profile, setProfileFromServer } = useAuth();
  const household = profile?.households[0];
  const [members, setMembers] = useState<HouseholdMemberSummary[]>([]);
  const [invitations, setInvitations] = useState<HouseholdInvitationSummary[]>([]);
  const [createdLink, setCreatedLink] = useState<CreatedHouseholdInvitation | null>(null);
  const [loadedHouseholdId, setLoadedHouseholdId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadVersion, setLoadVersion] = useState(0);
  const isOwner = household?.role === 'OWNER';
  const loading = Boolean(household && loadedHouseholdId !== household.id);
  const householdId = household?.id;

  useEffect(() => {
    let active = true;
    if (!householdId) return;
    void Promise.allSettled([
      apiRequest<HouseholdMemberSummary[]>(`households/${householdId}/members`),
      isOwner
        ? apiRequest<HouseholdInvitationSummary[]>(`households/${householdId}/invitations`)
        : Promise.resolve([] as HouseholdInvitationSummary[]),
    ]).then(([memberResult, invitationResult]) => {
      if (!active) return;
      if (memberResult.status === 'fulfilled') {
        setMembers(memberResult.value);
        setError(null);
      } else {
        setError(apiErrorMessage(memberResult.reason, 'Hushållets medlemmar kunde inte hämtas.'));
      }
      if (invitationResult.status === 'fulfilled') {
        setInvitations(invitationResult.value);
        setInviteError(null);
      } else {
        setInviteError(apiErrorMessage(invitationResult.reason, 'Inbjudningar kunde inte hämtas.'));
      }
      setLoadedHouseholdId(householdId);
    });
    return () => {
      active = false;
    };
  }, [householdId, isOwner, loadVersion]);

  async function createInvitation() {
    if (!household) return;
    setBusy(true);
    setInviteError(null);
    try {
      const invitation = await apiRequest<CreatedHouseholdInvitation>(
        `households/${household.id}/invitations`,
        { method: 'POST' },
      );
      setCreatedLink(invitation);
      await Share.share({ message: `Gå med i ${household.name} i Cena: ${invitation.url}` });
      setInvitations(
        await apiRequest<HouseholdInvitationSummary[]>(`households/${household.id}/invitations`),
      );
    } catch (requestError) {
      setInviteError(
        apiErrorMessage(requestError, 'Inbjudan kunde inte skapas eller delas. Försök igen.'),
      );
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!createdLink) return;
    try {
      await Clipboard.setStringAsync(createdLink.url);
      Alert.alert('Länken är kopierad', 'Dela den bara med personen du vill bjuda in.');
    } catch {
      setInviteError('Länken kunde inte kopieras. Försök dela den igen.');
    }
  }

  async function revoke(invitationId: string) {
    if (!household) return;
    try {
      await apiRequest(`households/${household.id}/invitations/${invitationId}`, {
        method: 'DELETE',
      });
      setInvitations((current) => current.filter((invitation) => invitation.id !== invitationId));
    } catch (requestError) {
      setInviteError(apiErrorMessage(requestError, 'Inbjudan kunde inte återkallas. Försök igen.'));
    }
  }

  function confirmLeave() {
    if (!household) return;
    Alert.alert(
      'Lämna hushållet?',
      'Du förlorar åtkomsten till hushållets gemensamma varor och inköpslista. Hushållets data raderas inte.',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Lämna hushåll',
          style: 'destructive',
          onPress: () => {
            void leave();
          },
        },
      ],
    );
  }

  async function leave() {
    if (!household) return;
    setBusy(true);
    try {
      const nextProfile = await apiRequest<CurrentUser>(`households/${household.id}/leave`, {
        method: 'POST',
      });
      setProfileFromServer(nextProfile);
      router.replace('/household-setup');
    } catch (requestError) {
      Alert.alert('Kunde inte lämna hushållet', apiErrorMessage(requestError, 'Försök igen.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.back}>
          <IconButton
            accessibilityLabel="Tillbaka"
            icon={<ArrowLeft size={20} color={colors.brand.primary} />}
            onPress={() => router.back()}
          />
        </View>
        <ScreenHeader title="Mitt hushåll" />
        {household ? (
          <Card style={styles.householdCard}>
            <House size={22} color={colors.brand.primary} />
            <View style={styles.flex}>
              <Text variant="h3">{household.name}</Text>
            </View>
            <Badge label={isOwner ? 'Ägare' : 'Medlem'} />
          </Card>
        ) : (
          <Text>Du tillhör inget hushåll ännu.</Text>
        )}

        <Text variant="h2" style={styles.sectionTitle}>
          Medlemmar
        </Text>
        {loading ? (
          <Text>Hämtar medlemmar…</Text>
        ) : error ? (
          <EmptyState
            title="Medlemmarna kunde inte hämtas"
            description={error}
            action={
              <Button
                label="Försök igen"
                variant="outline"
                onPress={() => {
                  setLoadedHouseholdId(null);
                  setLoadVersion((version) => version + 1);
                }}
              />
            }
          />
        ) : members.length <= 1 ? (
          <EmptyState
            title="Bara du, än så länge"
            description="Bjud in någon att dela kökets varor och inköpslista."
          />
        ) : null}
        {!loading && !error
          ? members.map((member) => (
              <View key={member.id} style={styles.memberRow}>
                <View style={styles.avatar}>
                  <Text variant="label">{member.displayName === 'Du' ? 'D' : 'M'}</Text>
                </View>
                <View style={styles.flex}>
                  <Text variant="label">{member.displayName}</Text>
                  <Text variant="bodySmall">{member.role === 'OWNER' ? 'Ägare' : 'Medlem'}</Text>
                </View>
              </View>
            ))
          : null}

        {isOwner ? (
          <>
            <Text variant="h2" style={styles.sectionTitle}>
              Inbjudningar
            </Text>
            <Button
              label="Bjud in medlem"
              loading={busy}
              leadingIcon={<UserRoundPlus size={18} color={colors.text.inverse} />}
              onPress={() => void createInvitation()}
            />
            {createdLink ? (
              <Card style={styles.linkCard}>
                <Text variant="label">Dela inbjudningslänken</Text>
                <Text variant="caption" numberOfLines={2} selectable>
                  {createdLink.url}
                </Text>
                <Text variant="bodySmall">
                  Går ut {new Date(createdLink.expiresAt).toLocaleDateString('sv-SE')}.
                </Text>
                <View style={styles.linkActions}>
                  <Button
                    label="Dela igen"
                    variant="secondary"
                    onPress={() => void Share.share({ message: createdLink.url })}
                  />
                  <Button
                    label="Kopiera länk"
                    variant="outline"
                    leadingIcon={<Copy size={16} color={colors.brand.primary} />}
                    onPress={() => void copyLink()}
                  />
                </View>
              </Card>
            ) : null}
            {inviteError ? (
              <Text style={styles.error} accessibilityRole="alert">
                {inviteError}
              </Text>
            ) : null}
            {!inviteError && invitations.length === 0 ? (
              <Text variant="bodySmall" style={styles.muted}>
                Inga väntande inbjudningar.
              </Text>
            ) : (
              invitations.map((invitation) => (
                <View key={invitation.id} style={styles.invitationRow}>
                  <View style={styles.flex}>
                    <Text variant="label">Väntar på svar</Text>
                    <Text variant="bodySmall">
                      Går ut {new Date(invitation.expiresAt).toLocaleDateString('sv-SE')}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => void revoke(invitation.id)}
                    style={styles.revoke}
                    accessibilityRole="button"
                    accessibilityLabel="Återkalla inbjudan"
                  >
                    <Text style={styles.revokeText}>Återkalla</Text>
                  </Pressable>
                </View>
              ))
            )}
          </>
        ) : (
          <>
            <Text variant="bodySmall" style={styles.ownerNote}>
              Endast hushållets ägare kan bjuda in nya medlemmar. Ägaren kan inte lämna hushållet i
              den här versionen.
            </Text>
            <Button label="Lämna hushåll" variant="outline" loading={busy} onPress={confirmLeave} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background.primary },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  back: { height: 48, justifyContent: 'center' },
  householdCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  sectionTitle: { color: colors.brand.primary, marginTop: spacing.xl, marginBottom: spacing.md },
  memberRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkCard: { marginTop: spacing.md, gap: spacing.md },
  linkActions: { gap: spacing.sm },
  invitationRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  revoke: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.sm },
  revokeText: { color: colors.semantic.error, textDecorationLine: 'underline' },
  error: { color: colors.semantic.error, marginTop: spacing.sm },
  muted: { color: colors.text.muted },
  ownerNote: { lineHeight: 21, marginVertical: spacing.md },
});
