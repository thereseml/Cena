import { TabScreen } from '../../components/TabScreen';
import { useAuth } from '../../features/auth/AuthProvider';
import { RecipeBrowser } from '../../features/recipes/RecipeBrowser';

export default function RecipesScreen() {
  const { profile } = useAuth();
  const householdId = profile?.households[0]?.id;
  return (
    <TabScreen>
      <RecipeBrowser key={householdId ?? 'no-household'} householdId={householdId} />
    </TabScreen>
  );
}
