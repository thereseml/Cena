import type { SaveInventoryItemInput } from '@cena/contracts';
import { ArrowLeft, X } from 'lucide-react-native';
import { Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, colors, EmptyState, IconButton, spacing, Text } from '@cena/ui';
import { InventoryItemForm } from '../inventory/InventoryItemForm';
import { FoodSuggestionCard } from './FoodSuggestionCard';
import { toFormValues, type ReviewDraft } from './food-recognition-review';

export interface FoodSuggestionReviewProps {
  imageUri: string | null;
  items: ReviewDraft[];
  editingItem: ReviewDraft | undefined;
  householdAvailable: boolean;
  saving: boolean;
  canSave: boolean;
  error: string | null;
  onBack(): void;
  onRetryAnalysis(): void;
  onAddManualItem(): void;
  onEditItem(id: string): void;
  onRemoveItem(id: string): void;
  onCloseEditor(): void;
  onSaveEdit(id: string, input: SaveInventoryItemInput): void;
  onSaveItems(): void;
}

export function FoodSuggestionReview({
  imageUri,
  items,
  editingItem,
  householdAvailable,
  saving,
  canSave,
  error,
  onBack,
  onRetryAnalysis,
  onAddManualItem,
  onEditItem,
  onRemoveItem,
  onCloseEditor,
  onSaveEdit,
  onSaveItems,
}: FoodSuggestionReviewProps) {
  return (
    <View style={styles.reviewScreen}>
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Tillbaka"
          style={styles.backButton}
        >
          <ArrowLeft size={20} color={colors.brand.primary} strokeWidth={1.8} />
        </Pressable>
        <Text variant="h1" style={styles.title} accessibilityRole="header">
          Granska varorna
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.preview}
            resizeMode="cover"
            accessibilityLabel="Bilden med de föreslagna matvarorna"
          />
        ) : null}
        <Text style={styles.intro}>
          Kontrollera varje förslag. Inget läggs till innan du bekräftar.
        </Text>
        {items.length === 0 ? (
          <EmptyState
            title="Inga matvaror hittades"
            description="Prova en tydligare bild eller lägg till en vara själv."
            action={
              <View style={styles.emptyActions}>
                <Button label="Försök igen" variant="outline" onPress={onRetryAnalysis} />
                <Button label="Lägg till manuellt" onPress={onAddManualItem} />
              </View>
            }
          />
        ) : (
          <View style={styles.suggestionList}>
            {items.map((item) => (
              <FoodSuggestionCard
                key={item.id}
                suggestion={{
                  id: item.id,
                  name: item.name || 'Ny vara',
                  quantity: item.quantity,
                  unit: item.unit,
                  description: item.description,
                  confidence: item.confidence,
                  needsReview: true,
                }}
                manuallyAdded={item.source === 'MANUAL'}
                quantity={item.quantity}
                unit={item.unit}
                storageLocation={item.storageLocation}
                expiryDate={item.expiryDate}
                disabled={saving}
                onEdit={() => onEditItem(item.id)}
                onRemove={() => onRemoveItem(item.id)}
              />
            ))}
          </View>
        )}
        <Button
          label="Lägg till en vara"
          variant="outline"
          onPress={onAddManualItem}
          disabled={saving || items.length >= 30}
        />
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        {items.length > 0 ? (
          <Button
            label="Lägg till i mitt kök"
            onPress={onSaveItems}
            loading={saving}
            disabled={!canSave || !householdAvailable}
          />
        ) : null}
        {!canSave && items.length > 0 ? (
          <Text variant="caption" tone="muted">
            Redigera varje vara och ange mängd och enhet innan du sparar.
          </Text>
        ) : null}
      </ScrollView>

      <Modal
        visible={Boolean(editingItem)}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onCloseEditor}
      >
        <SafeAreaView style={styles.modalSafeArea} edges={['top', 'left', 'right', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text variant="h2">Redigera vara</Text>
            <IconButton
              icon={<X size={20} color={colors.brand.primary} strokeWidth={1.8} />}
              accessibilityLabel="Stäng redigering"
              onPress={onCloseEditor}
            />
          </View>
          {editingItem ? (
            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
            >
              {editingItem.description ? (
                <Text variant="bodySmall" tone="muted">
                  Förpackning: {editingItem.description}
                </Text>
              ) : null}
              <InventoryItemForm
                key={editingItem.id}
                initialValues={toFormValues(editingItem)}
                saveLabel="Spara ändringar"
                onSave={async (input) => onSaveEdit(editingItem.id, input)}
              />
            </ScrollView>
          ) : null}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  reviewScreen: { flex: 1 },
  header: { paddingHorizontal: spacing.lg },
  content: { gap: spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  backButton: { width: 48, height: 48, justifyContent: 'center' },
  title: { color: colors.brand.primary, marginTop: spacing.md, marginBottom: spacing.md },
  intro: { lineHeight: 24 },
  preview: {
    width: '100%',
    height: 150,
    borderRadius: 20,
    backgroundColor: colors.background.subtle,
  },
  error: { color: colors.semantic.error },
  suggestionList: { gap: spacing.md },
  emptyActions: { gap: spacing.sm },
  modalSafeArea: { flex: 1, backgroundColor: colors.background.primary },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  modalContent: { gap: spacing.lg, padding: spacing.lg, paddingBottom: spacing.xxl },
});
