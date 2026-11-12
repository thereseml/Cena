import { StatusBar } from 'expo-status-bar';
import { useFonts } from '@expo-google-fonts/dm-sans/useFonts';
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_600SemiBold } from '@expo-google-fonts/dm-sans/600SemiBold';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { Text as CenaText, colors } from '@cena/ui';
import { StyleSheet, View } from 'react-native';

export default function App() {
  const [fontsLoaded] = useFonts({ DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold });

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      <CenaText variant="display" style={styles.title}>cena.</CenaText>
      <CenaText style={styles.subtitle}>Less waste. More taste.</CenaText>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.primary },
  title: { color: colors.brand.primary },
  subtitle: { marginTop: 8 },
});
