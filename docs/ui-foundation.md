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

Stories live beside their components and are discovered by `apps/mobile/.rnstorybook/main.ts`:

- Shared primitives and patterns: `packages/ui/src/*.stories.tsx`.
- App-specific product rows and previews: `apps/mobile/components/*.stories.tsx`.
- Full Expo Router pages and the real tab menu: `apps/mobile/storybook/*.stories.tsx`.

The app route stories mount the existing route tree in `ExpoRoot`; they do not recreate navigation for Storybook. All stories use local examples and need no backend or authentication.

## Shared Components

`@cena/ui` exports these reusable, product-independent components:

| Component       | Responsibility                                                          |
| --------------- | ----------------------------------------------------------------------- |
| `ScreenHeader`  | Eyebrow, page title and optional trailing action.                       |
| `SectionHeader` | Section title, optional description and action.                         |
| `IconButton`    | Accessible icon-only action with subtle, filled and outline styles.     |
| `ActionRow`     | Tappable title/description row composed on `ListItem`.                  |
| `FilterChip`    | Controlled selectable filter; the owning screen handles filtering.      |
| `StatCard`      | One or more compact statistics in a shared surface.                     |
| `EmptyState`    | Empty-state title, description, optional icon and composed action.      |
| `ListItem`      | Shared row layout with optional leading/trailing content and separator. |
| `Badge`         | Neutral, success, warning and error status labels.                      |

Product-specific `InventoryItemRow`, `ShoppingListItem` and `RecipePreview` remain in `apps/mobile/components` and compose these primitives. Keep inventory and recipe domain data out of `packages/ui`.

Example:

```tsx
<ActionRow
  title="Lägg till mat"
  description="Håll koll på det du har hemma"
  leadingIcon={<Plus size={20} />}
  trailingIcon={<ArrowRight size={18} />}
  onPress={openAddProduct}
/>
```

## Add a Component

1. Implement a focused, strictly typed component in `packages/ui/src/`.
2. Use tokens from `theme.ts`; preserve caller accessibility props while forcing computed disabled/loading state where the component owns it.
3. Export the component and its public prop type from `src/index.ts`.
4. Add component tests in `apps/mobile/__tests__/` for interaction and accessibility states when applicable.

## Add a Story

Create `ComponentName.stories.tsx` beside the component. Use CSF types from `@storybook/react-native`, import shared primitives from `@cena/ui`, and group stories under `Actions`, `Data Display`, `Feedback` or `Navigation`. Feature-component stories stay beside their component; route stories live under `apps/mobile/storybook` and mount the real route tree. Keep examples deterministic and independent of application services.

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
- The mobile app uses Expo Router with four primary tabs (Home, Kitchen, Recipes and Shopping), plus stack routes for profile/settings, adding a product and recipe details. Routes live under `apps/mobile/app`; the tab shell is `app/(tabs)/_layout.tsx`. `TabScreen` provides safe-area handling. Shared primitives are imported from `@cena/ui`; product rows/previews remain under `apps/mobile/components`. Typed mock data lives in `apps/mobile/data` and is not persisted. Account, household, inventory editing, recipe generation and shared shopping are not connected yet. Start the normal app with `pnpm --filter @cena/mobile start`; Storybook remains opt-in with `pnpm storybook`.
