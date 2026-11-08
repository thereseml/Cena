import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>cena.</Text>
      <Text style={styles.subtitle}>Less waste. More taste.</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F6F0' },
  title: { color: '#243C32', fontSize: 36, fontWeight: '700' },
  subtitle: { color: '#252B27', fontSize: 16, marginTop: 8 },
});
