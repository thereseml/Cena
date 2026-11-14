import type { FoodRecognitionResult, InventoryItem, SaveInventoryItemInput } from '@cena/contracts';
import * as ImagePicker from 'expo-image-picker';
import type { ImagePickerOptions } from 'expo-image-picker';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, Text } from '@cena/ui';
import { useAuth } from '../auth/AuthProvider';
import { apiErrorMessage } from '../../lib/api';
import { analyzeFoodPhoto, saveRecognizedFood } from './food-recognition-api';
import { FoodSuggestionReview } from './FoodSuggestionReview';
import { PhotoCaptureStep } from './PhotoCaptureStep';
import {
  createIdempotencyKey,
  createManualDraft,
  isReadyToSave,
  MAX_REVIEW_ITEMS,
  preparePhoto,
  toReviewDraft,
  toSaveInput,
  type ReviewDraft,
} from './food-recognition-review';

export function PhotoRecognitionFlow() {
  const { profile } = useAuth();
  const householdId = profile?.households[0]?.id;
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [step, setStep] = useState<'capture' | 'review'>('capture');
  const [items, setItems] = useState<ReviewDraft[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const analysisAbort = useRef<AbortController | null>(null);
  const analysisBusy = useRef(false);
  const savingBusy = useRef(false);
  const saveRequest = useRef<{ fingerprint: string; key: string } | null>(null);

  useEffect(() => {
    let mounted = true;
    void ImagePicker.getPendingResultAsync()
      .then((pendingResult) => {
        if (!mounted || !pendingResult) return;
        if ('canceled' in pendingResult) {
          const restoredImage = !pendingResult.canceled ? pendingResult.assets?.[0] : null;
          if (restoredImage?.uri) setImageUri(restoredImage.uri);
          return;
        }
        setError('Bilden kunde inte återställas. Välj den igen från dina bilder.');
      })
      .catch(() => {
        if (mounted) setError('Bilden kunde inte återställas. Välj den igen från dina bilder.');
      });
    return () => {
      mounted = false;
      analysisAbort.current?.abort();
    };
  }, []);

  async function choosePhoto(source: 'camera' | 'library'): Promise<void> {
    setError(null);
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setError('Kameratillgång nekades. Tillåt kameran i inställningarna eller välj en bild.');
          return;
        }
      }

      const options: ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
        exif: false,
        selectionLimit: 1,
      };
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets?.[0]) return;

      setImageUri(result.assets[0].uri);
      setItems([]);
      setStep('capture');
      saveRequest.current = null;
    } catch {
      setError('Bilden kunde inte öppnas. Försök igen eller lägg till varan manuellt.');
    }
  }

  async function analyze(): Promise<void> {
    if (!imageUri || analysisBusy.current) return;
    analysisBusy.current = true;
    const controller = new AbortController();
    analysisAbort.current = controller;
    setAnalyzing(true);
    setError(null);
    try {
      const preparedPhoto = await preparePhoto(imageUri);
      setImageUri(preparedPhoto.uri);
      const result: FoodRecognitionResult = await analyzeFoodPhoto(
        { uri: preparedPhoto.uri },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setItems(result.items.slice(0, MAX_REVIEW_ITEMS).map(toReviewDraft));
      setStep('review');
    } catch (analysisError) {
      if (!controller.signal.aborted) {
        setError(
          analysisError instanceof Error && analysisError.message === 'PHOTO_TOO_LARGE'
            ? 'Bilden är för stor även efter komprimering. Välj en annan bild.'
            : apiErrorMessage(analysisError, 'Bilden kunde inte analyseras. Försök igen.'),
        );
      }
    } finally {
      if (analysisAbort.current === controller) {
        analysisAbort.current = null;
        analysisBusy.current = false;
        setAnalyzing(false);
      }
    }
  }

  function cancelAnalysis(): void {
    analysisAbort.current?.abort();
    analysisAbort.current = null;
    analysisBusy.current = false;
    setAnalyzing(false);
  }

  function addManualItem(): void {
    if (items.length >= MAX_REVIEW_ITEMS) {
      setError('Du kan granska högst 30 varor åt gången.');
      return;
    }
    const draft = createManualDraft();
    setItems((current) => [...current, draft]);
    setEditingId(draft.id);
    setError(null);
    saveRequest.current = null;
  }

  function removeItem(id: string): void {
    setItems((current) => current.filter((item) => item.id !== id));
    if (editingId === id) setEditingId(null);
    saveRequest.current = null;
  }

  function updateItem(id: string, input: SaveInventoryItemInput): void {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              name: input.name,
              quantity: input.quantity,
              unit: input.unit,
              storageLocation: input.storageLocation,
              expiryDate: input.expiryDate,
              expiryType: input.expiryType,
            }
          : item,
      ),
    );
    setEditingId(null);
    saveRequest.current = null;
  }

  async function saveApprovedItems(): Promise<void> {
    if (savingBusy.current || !householdId || !items.length || !items.every(isReadyToSave)) return;
    savingBusy.current = true;
    setSaving(true);
    setError(null);
    try {
      const payload = items.map(toSaveInput);
      const fingerprint = JSON.stringify(payload);
      if (saveRequest.current?.fingerprint !== fingerprint) {
        saveRequest.current = { fingerprint, key: createIdempotencyKey() };
      }
      const saved: InventoryItem[] = await saveRecognizedFood(
        householdId,
        payload,
        saveRequest.current.key,
      );
      saveRequest.current = null;
      Alert.alert(
        'Varorna är tillagda',
        `${saved.length} ${saved.length === 1 ? 'vara har lagts' : 'varor har lagts'} till i ditt kök.`,
        [{ text: 'Till mitt kök', onPress: () => router.replace('/(tabs)/kitchen') }],
      );
    } catch (saveError) {
      setError(apiErrorMessage(saveError, 'Varorna kunde inte sparas. Dina ändringar finns kvar.'));
    } finally {
      savingBusy.current = false;
      setSaving(false);
    }
  }

  const editingItem = items.find((item) => item.id === editingId);
  const canSave = items.length > 0 && items.every(isReadyToSave);

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
      {step === 'capture' ? (
        <View style={styles.captureScreen}>
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Tillbaka"
              style={styles.backButton}
            >
              <ArrowLeft size={20} color={colors.brand.primary} strokeWidth={1.8} />
            </Pressable>
            <Text variant="h1" style={styles.title} accessibilityRole="header">
              Lägg till med foto
            </Text>
          </View>
          <PhotoCaptureStep
            imageUri={imageUri}
            analyzing={analyzing}
            error={error}
            onChoosePhoto={(source) => void choosePhoto(source)}
            onReplacePhoto={() => setImageUri(null)}
            onAnalyze={() => void analyze()}
            onCancelAnalysis={cancelAnalysis}
            onAddManually={() => router.push('/add-product')}
          />
        </View>
      ) : (
        <FoodSuggestionReview
          imageUri={imageUri}
          items={items}
          editingItem={editingItem}
          householdAvailable={Boolean(householdId)}
          saving={saving}
          canSave={canSave}
          error={error}
          onBack={() => setStep('capture')}
          onRetryAnalysis={() => setStep('capture')}
          onAddManualItem={addManualItem}
          onEditItem={setEditingId}
          onRemoveItem={removeItem}
          onCloseEditor={() => setEditingId(null)}
          onSaveEdit={updateItem}
          onSaveItems={() => void saveApprovedItems()}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background.primary },
  captureScreen: { flex: 1 },
  header: { paddingHorizontal: spacing.lg },
  backButton: { width: 48, height: 48, justifyContent: 'center' },
  title: { color: colors.brand.primary, marginTop: spacing.md, marginBottom: spacing.md },
});
