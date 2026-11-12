# Cena UI Foundation

`packages/ui` is the shared React Native primitive library. Its tokens in `src/theme.ts` follow Warm Minimalism v1 in `docs/blueprint.md`; keep that canonical document unchanged. The package is independent of Cena services and business logic.

## Import Components

Import primitives and tokens from the public package entrypoint:

```tsx
import { Badge, Button, Card, Input, Text, colors, spacing } from '@cena/ui';

export function KitchenSummary() {
  return (
    <Card>
      <Text variant="h2">Ditt kök</Text>
      <Badge label="3 varor hemma" />
      <Button label="Visa köket" />
    </Card>
  );
}
```

The app loads the approved DM Sans font family. Components use the canonical color, spacing, typography and radius tokens, expose typed native props, and support React Native Web where the underlying React Native component does.

## Storybook

Expo Metro uses Storybook React Native's supported `withStorybook` entry-point swapping. The Storybook entry registers itself with Expo and loads the Storybook runtime after Expo initializes. Storybook is off unless explicitly enabled, leaving normal Cena startup unchanged and excluding Storybook modules from normal and production bundles.

```sh
pnpm storybook       # Start Metro with Storybook enabled
pnpm storybook:ios   # Start Storybook and open the iOS simulator
pnpm --filter @cena/mobile start  # Start the normal app
```

Stories live beside their components in `packages/ui/src/*.stories.tsx` and are discovered by `apps/mobile/.rnstorybook/main.ts`. They import public components from `@cena/ui`, use local props only, and require no backend or authentication.

## Add a Component

1. Implement a focused, strictly typed component in `packages/ui/src/`.
2. Use tokens from `theme.ts`; preserve caller accessibility props while forcing computed disabled/loading state where the component owns it.
3. Export the component and its public prop type from `src/index.ts`.
4. Add component tests in `apps/mobile/__tests__/` for interaction and accessibility states when applicable.

## Add a Story

Create `ComponentName.stories.tsx` beside the component. Use CSF types from `@storybook/react-native`, import the component from `@cena/ui`, and add it to the existing `Primitives/...` catalog. Keep examples deterministic and independent of application services.

## Verification

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Run only the component suite with `pnpm --filter @cena/mobile test`.

## Limitations

- Storybook's on-device UI is intended for native iOS/Android development. Storybook Web is not configured; primitives remain usable in Expo Web.
- DM Sans assets are bundled in the Expo Google Fonts package and loaded before both the normal app and Storybook render.
- The mobile app is currently a small foundation shell; these primitives are not yet integrated into product screens.
