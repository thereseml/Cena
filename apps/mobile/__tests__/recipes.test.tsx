import { act, fireEvent, render, renderHook, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import RecipesScreen from '../app/(tabs)/recipes';
import RecipeDetailScreen from '../app/recipe/[id]';
import { ApiRequestError, apiRequest } from '../lib/api';
import { useRecipeDetail, useRecipes } from '../features/recipes/useRecipes';
import { RECIPE_FIXTURE, RECIPE_PAGE } from '../features/recipes/recipe-fixtures';

let mockHouseholdId: string | undefined = 'household-a';
let mockFocused = true;
let mockRecipeId = RECIPE_FIXTURE.id;

jest.mock('../features/auth/AuthProvider', () => ({
  useAuth: () => ({ profile: { households: mockHouseholdId ? [{ id: mockHouseholdId }] : [] } }),
}));
jest.mock('../lib/api', () => ({
  ...jest.requireActual('../lib/api'),
  apiRequest: jest.fn(),
}));
jest.mock('../lib/supabase', () => ({ getSupabaseClient: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ id: mockRecipeId }),
  useFocusEffect: (callback: () => () => void) => {
    const React = jest.requireActual<typeof import('react')>('react');
    const focused = mockFocused;
    React.useEffect(() => (focused ? callback() : undefined), [callback, focused]);
  },
}));
jest.mock('lucide-react-native', () => ({
  ArrowRight: () => null,
  ArrowLeft: () => null,
  Clock3: () => null,
  UserRound: () => null,
}));
const request = jest.mocked(apiRequest);

beforeEach(() => {
  jest.clearAllMocks();
  mockHouseholdId = 'household-a';
  mockFocused = true;
  mockRecipeId = RECIPE_FIXTURE.id;
  request.mockResolvedValue(RECIPE_PAGE);
});

it('browses a bounded API page and opens a real recipe card', async () => {
  const screen = await render(<RecipesScreen />);
  expect(await screen.findByText('Vad ska vi laga idag?')).toBeTruthy();
  expect(screen.getByText('Upptäck recept utifrån det du har hemma.')).toBeTruthy();
  await fireEvent.press(await screen.findByLabelText(`Visa receptet ${RECIPE_FIXTURE.title}`));
  expect(request).toHaveBeenCalledWith('recipes?householdId=household-a&page=1&pageSize=12');
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/recipe/[id]',
    params: { id: RECIPE_FIXTURE.id },
  });
  expect(screen.getByText(/1 av 4 ingredienser finns hemma/)).toBeTruthy();
});

it('sends search, category and total-time filters to the API and supports recommendations', async () => {
  const screen = await render(<RecipesScreen />);
  await fireEvent.changeText(screen.getByLabelText('Sök recept'), 'tomat & pasta');
  await fireEvent.press(screen.getByLabelText('Middag'));
  await fireEvent.press(screen.getByLabelText('Högst 30 min'));
  await fireEvent.press(screen.getByLabelText('Utifrån ditt kök'));
  await waitFor(() =>
    expect(request).toHaveBeenLastCalledWith(
      'recipes/recommendations?householdId=household-a&search=tomat+%26+pasta&mealCategory=DINNER&maxTotalMinutes=30&page=1&pageSize=12',
    ),
  );
  expect(screen.getByLabelText('Högst 30 min').props.accessibilityState.selected).toBe(true);
  await fireEvent.press(screen.getByLabelText('Alla tider'));
  await fireEvent.press(screen.getByLabelText('Alla måltider'));
  await fireEvent.press(screen.getByLabelText('Alla recept'));
  await waitFor(() =>
    expect(request).toHaveBeenLastCalledWith(
      'recipes?householdId=household-a&search=tomat+%26+pasta&page=1&pageSize=12',
    ),
  );
});

it('requests subsequent pages and resets paging when a filter changes', async () => {
  request.mockImplementation(async (path) => ({
    ...RECIPE_PAGE,
    page: Number(new URLSearchParams(path.split('?')[1]).get('page')),
    total: 25,
  }));
  const screen = await render(<RecipesScreen />);
  await fireEvent.press(await screen.findByText('Nästa'));
  await waitFor(() =>
    expect(request).toHaveBeenLastCalledWith('recipes?householdId=household-a&page=2&pageSize=12'),
  );
  await fireEvent.press(await screen.findByText('Föregående'));
  await waitFor(() =>
    expect(request).toHaveBeenLastCalledWith('recipes?householdId=household-a&page=1&pageSize=12'),
  );
  await fireEvent.press(await screen.findByText('Nästa'));
  await fireEvent.press(screen.getByLabelText('Lunch'));
  await waitFor(() =>
    expect(request).toHaveBeenLastCalledWith(
      'recipes?householdId=household-a&mealCategory=LUNCH&page=1&pageSize=12',
    ),
  );
});

it('shows loading, recoverable failure and empty results without sample cards', async () => {
  let rejectRequest!: (error: Error) => void;
  request.mockReturnValueOnce(
    new Promise((_resolve, reject) => {
      rejectRequest = reject;
    }),
  );
  const screen = await render(<RecipesScreen />);
  expect(screen.getByLabelText('Läser in recept')).toBeTruthy();
  await act(() => rejectRequest(new Error('offline')));
  expect(await screen.findByText('Recept kunde inte läsas in')).toBeTruthy();
  expect(screen.queryByText(RECIPE_FIXTURE.title)).toBeNull();
  request.mockResolvedValueOnce({ ...RECIPE_PAGE, items: [], total: 0 });
  await fireEvent.press(screen.getByText('Försök igen'));
  expect(await screen.findByText('Receptbiblioteket väntar på granskning')).toBeTruthy();
  expect(screen.getByText(/Recept visas här när de har granskats och publicerats/)).toBeTruthy();
});

it('explains that a filtered empty result can be resolved by changing the search', async () => {
  jest.useFakeTimers();
  request.mockImplementation(async (path) =>
    path.includes('search=tomat') ? { ...RECIPE_PAGE, items: [], total: 0 } : RECIPE_PAGE,
  );
  try {
    const screen = await render(<RecipesScreen />);
    expect(await screen.findByText(RECIPE_FIXTURE.title)).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Sök recept'), 'tomat');
    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText('Inga recept hittades')).toBeTruthy();
    expect(screen.getByText('Prova en annan sökning eller ändra dina filter.')).toBeTruthy();
    await screen.unmount();
  } finally {
    jest.clearAllTimers();
    jest.useRealTimers();
  }
});

it('renders detail metadata, amounts, all availability states, instructions and disclaimer', async () => {
  request.mockResolvedValue(RECIPE_FIXTURE);
  const screen = await render(<RecipeDetailScreen />);
  expect(await screen.findByText(RECIPE_FIXTURE.title)).toBeTruthy();
  expect(request).toHaveBeenCalledWith('recipes/tomato-pasta?householdId=household-a');
  for (const text of [
    '25 min totalt · 2 portioner',
    'Förberedelse 10 min · Tillagning 15 min',
    '200 g',
    'Finns hemma',
    'Finns delvis',
    'Saknas',
    'Okänd tillgång',
    'Saknas: 200 g',
    'Mängd ej angiven',
    'Mängden kan inte jämföras.',
    '1. Koka pastan enligt förpackningen.',
  ]) {
    expect(screen.getByText(text)).toBeTruthy();
  }
  expect(screen.getByText(/inte verifierat som allergisäkert/)).toBeTruthy();
  expect(request.mock.calls.every((call) => call.length === 1)).toBe(true);
  await fireEvent.press(screen.getByLabelText('Tillbaka'));
  expect(router.back).toHaveBeenCalled();
});

it('shows detail loading and supports retry after a not-found or network error', async () => {
  const pending = deferred<typeof RECIPE_FIXTURE>();
  request.mockReturnValueOnce(pending.promise);
  const screen = await render(<RecipeDetailScreen />);
  expect(screen.getByLabelText('Läser in receptdetaljer')).toBeTruthy();
  await act(() => pending.reject(new ApiRequestError('http', 404)));
  expect(await screen.findByText('Receptet kunde inte läsas in')).toBeTruthy();
  expect(screen.getByText('Receptet eller hushållet kunde inte hittas.')).toBeTruthy();
  request.mockResolvedValueOnce(RECIPE_FIXTURE);
  await fireEvent.press(screen.getByText('Försök igen'));
  expect(await screen.findByText(RECIPE_FIXTURE.title)).toBeTruthy();
});

it('does not fetch without an authenticated household', async () => {
  mockHouseholdId = undefined;
  const screen = await render(<RecipesScreen />);
  expect(await screen.findByText('Ditt hushåll eller recept kunde inte hittas.')).toBeTruthy();
  expect(request).not.toHaveBeenCalled();
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

it('ignores stale filter responses and failures, including after focus refresh', async () => {
  const first = deferred<typeof RECIPE_PAGE>();
  const second = deferred<typeof RECIPE_PAGE>();
  const third = deferred<typeof RECIPE_PAGE>();
  request
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise)
    .mockReturnValueOnce(third.promise);
  const hook = await renderHook(
    ({ search }: { search: string }) => useRecipes({ householdId: 'a', search }, false),
    { initialProps: { search: '' } },
  );
  await hook.rerender({ search: 'tomat' });
  await act(() => second.resolve(RECIPE_PAGE));
  expect(hook.result.current.data).toEqual(RECIPE_PAGE);
  await act(() => first.reject(new Error('old error')));
  expect(hook.result.current.error).toBeNull();
  mockFocused = false;
  await hook.rerender({ search: 'tomat' });
  mockFocused = true;
  await hook.rerender({ search: 'tomat' });
  expect(hook.result.current.loading).toBe(true);
  await act(() => third.resolve({ ...RECIPE_PAGE, total: 2 }));
  expect(hook.result.current.data?.total).toBe(2);
});

it('hides old household data immediately and ignores its pending reply', async () => {
  const old = deferred<typeof RECIPE_PAGE>();
  const next = deferred<typeof RECIPE_PAGE>();
  request.mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
  const hook = await renderHook(
    ({ householdId }: { householdId: string }) => useRecipes({ householdId }, true),
    { initialProps: { householdId: 'a' } },
  );
  await hook.rerender({ householdId: 'b' });
  await act(() => old.resolve(RECIPE_PAGE));
  expect(hook.result.current.data).toBeNull();
  expect(hook.result.current.loading).toBe(true);
  await act(() => next.resolve({ ...RECIPE_PAGE, items: [] }));
  expect(hook.result.current.data?.items).toEqual([]);
});

it('ignores a pending response after blur and fetches again on focus', async () => {
  const old = deferred<typeof RECIPE_PAGE>();
  request.mockReturnValueOnce(old.promise);
  const hook = await renderHook(() => useRecipes({ householdId: 'a' }, false));
  mockFocused = false;
  await hook.rerender(undefined);
  await act(() => old.resolve(RECIPE_PAGE));
  expect(hook.result.current.data).toBeNull();
  mockFocused = true;
  await hook.rerender(undefined);
  await waitFor(() => expect(hook.result.current.data).toEqual(RECIPE_PAGE));
  expect(request).toHaveBeenCalledTimes(2);
});

it('never displays the previous recipe or household detail after navigation', async () => {
  const old = deferred<typeof RECIPE_FIXTURE>();
  const next = deferred<typeof RECIPE_FIXTURE>();
  request.mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
  const hook = await renderHook(
    ({ householdId, id }: { householdId: string; id: string }) => useRecipeDetail(householdId, id),
    { initialProps: { householdId: 'a', id: 'first' } },
  );
  await hook.rerender({ householdId: 'b', id: 'second' });
  await act(() => next.resolve({ ...RECIPE_FIXTURE, title: 'Nytt recept' }));
  await act(() => old.resolve(RECIPE_FIXTURE));
  expect(hook.result.current.data?.title).toBe('Nytt recept');
});

it('clears successful household results and resets filters and page on household change', async () => {
  const screen = await render(<RecipesScreen />);
  expect(await screen.findByText(RECIPE_FIXTURE.title)).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Middag'));
  await fireEvent.press(screen.getByLabelText('Utifrån ditt kök'));
  const pending = deferred<typeof RECIPE_PAGE>();
  request.mockReturnValueOnce(pending.promise);
  mockHouseholdId = 'household-b';
  await screen.rerender(<RecipesScreen />);
  expect(screen.queryByText(RECIPE_FIXTURE.title)).toBeNull();
  expect(screen.getByLabelText('Alla recept').props.accessibilityState.selected).toBe(true);
  expect(request).toHaveBeenLastCalledWith('recipes?householdId=household-b&page=1&pageSize=12');
  await act(() => pending.resolve({ ...RECIPE_PAGE, items: [], total: 0 }));
});

it('lets only the latest retry update the current request', async () => {
  const old = deferred<typeof RECIPE_PAGE>();
  request.mockReturnValueOnce(old.promise).mockResolvedValueOnce({ ...RECIPE_PAGE, total: 3 });
  const hook = await renderHook(() => useRecipes({ householdId: 'a' }, false));
  await act(() => hook.result.current.retry());
  await act(() => old.resolve(RECIPE_PAGE));
  expect(hook.result.current.data?.total).toBe(3);
});

it('shows a recoverable error instead of rendering a malformed recipe page', async () => {
  request.mockResolvedValueOnce({ ...RECIPE_PAGE, items: [{ title: {} }] });
  const screen = await render(<RecipesScreen />);
  expect(await screen.findByText('Recept kunde inte läsas in')).toBeTruthy();
  expect(screen.queryByText(RECIPE_FIXTURE.title)).toBeNull();
  await fireEvent.press(screen.getByText('Försök igen'));
  expect(await screen.findByText(RECIPE_FIXTURE.title)).toBeTruthy();
});

it('shows a recoverable error instead of rendering malformed detail ingredients', async () => {
  request.mockResolvedValueOnce({ ...RECIPE_FIXTURE, ingredients: [null] });
  const screen = await render(<RecipeDetailScreen />);
  expect(await screen.findByText('Receptet kunde inte läsas in')).toBeTruthy();
  expect(screen.queryByText(RECIPE_FIXTURE.title)).toBeNull();
  request.mockResolvedValueOnce(RECIPE_FIXTURE);
  await fireEvent.press(screen.getByText('Försök igen'));
  expect(await screen.findByText(RECIPE_FIXTURE.title)).toBeTruthy();
});

describe('debounced recipe search', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('waits 300 ms after the latest input and hides old results while waiting', async () => {
    const screen = await render(<RecipesScreen />);
    expect(screen.getByPlaceholderText('Sök receptnamn')).toBeTruthy();
    expect(screen.getByText(RECIPE_FIXTURE.title)).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Sök recept'), 't');
    await act(() => jest.advanceTimersByTime(200));
    await fireEvent.changeText(screen.getByLabelText('Sök recept'), 'tomat');
    expect(screen.queryByText(RECIPE_FIXTURE.title)).toBeNull();
    expect(screen.getByLabelText('Läser in recept')).toBeTruthy();
    await act(() => jest.advanceTimersByTime(299));
    expect(request).toHaveBeenCalledTimes(1);
    await act(() => jest.advanceTimersByTime(1));
    expect(request).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenLastCalledWith(
      'recipes?householdId=household-a&search=tomat&page=1&pageSize=12',
    );
  });

  it('resets the page without fetching the previous search and rejects its late response', async () => {
    request.mockResolvedValueOnce({ ...RECIPE_PAGE, total: 25 });
    const screen = await render(<RecipesScreen />);
    const pending = deferred<typeof RECIPE_PAGE>();
    request.mockReturnValueOnce(pending.promise);
    await fireEvent.press(screen.getByText('Nästa'));
    expect(request).toHaveBeenLastCalledWith('recipes?householdId=household-a&page=2&pageSize=12');
    await fireEvent.changeText(screen.getByLabelText('Sök recept'), 'pasta');
    await fireEvent.press(screen.getByLabelText('Lunch'));
    await act(() => pending.resolve(RECIPE_PAGE));
    expect(screen.queryByText(RECIPE_FIXTURE.title)).toBeNull();
    expect(request).toHaveBeenCalledTimes(2);
    await act(() => jest.advanceTimersByTime(300));
    expect(request).toHaveBeenCalledTimes(3);
    expect(request).toHaveBeenLastCalledWith(
      'recipes?householdId=household-a&search=pasta&mealCategory=LUNCH&page=1&pageSize=12',
    );
  });

  it('cancels the pending search on household change and unmount', async () => {
    const screen = await render(<RecipesScreen />);
    await fireEvent.changeText(screen.getByLabelText('Sök recept'), 'pasta');
    mockHouseholdId = 'household-b';
    await screen.rerender(<RecipesScreen />);
    await act(() => jest.advanceTimersByTime(300));
    expect(request).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenLastCalledWith('recipes?householdId=household-b&page=1&pageSize=12');
    await fireEvent.changeText(screen.getByLabelText('Sök recept'), 'tomat');
    await screen.unmount();
    await act(() => jest.advanceTimersByTime(300));
    expect(request).toHaveBeenCalledTimes(2);
  });
});
