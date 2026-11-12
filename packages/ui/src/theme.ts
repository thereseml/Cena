/** Cena Design System v1.0 — canonical values from docs/blueprint.md. */
export const colors = {
  brand: { primary: '#243C32', secondary: '#A9BBA4', accent: '#E8B17A' },
  background: { primary: '#F8F6F0', elevated: '#FFFFFF', subtle: '#E9EEE7' },
  text: { primary: '#252B27', inverse: '#FFFFFF', muted: '#252B27' },
  semantic: { success: '#35765B', warning: '#A76420', error: '#B4483F', info: '#476C83' },
  border: '#DCE2D9',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, base: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radius = { input: 12, button: 14, card: 20, modal: 24, pill: 999 } as const;
export const typography = {
  display: { fontSize: 36, fontFamily: 'DMSans_700Bold' },
  h1: { fontSize: 28, fontFamily: 'DMSans_700Bold' },
  h2: { fontSize: 22, fontFamily: 'DMSans_600SemiBold' },
  h3: { fontSize: 18, fontFamily: 'DMSans_600SemiBold' },
  body: { fontSize: 16, fontFamily: 'DMSans_400Regular' },
  bodySmall: { fontSize: 14, fontFamily: 'DMSans_400Regular' },
  label: { fontSize: 14, fontFamily: 'DMSans_600SemiBold' },
  caption: { fontSize: 12, fontFamily: 'DMSans_500Medium' },
} as const;
