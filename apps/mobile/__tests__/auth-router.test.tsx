import { render, waitFor } from '@testing-library/react-native';
import { useSegments } from 'expo-router';
import { useAuth } from '../features/auth/AuthProvider';
import { AuthRouter } from '../features/auth/AuthRouter';

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: unknown }) => {
    const React = jest.requireActual<typeof import('react')>('react');
    const { Text: NativeText } = jest.requireActual<typeof import('react-native')>('react-native');
    return React.createElement(NativeText, null, JSON.stringify(href));
  },
  Stack: () => null,
  useSegments: jest.fn(),
}));
jest.mock('../features/auth/AuthProvider', () => ({ useAuth: jest.fn() }));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseSegments = useSegments as jest.MockedFunction<typeof useSegments>;
const token = 'A'.repeat(43);

describe('AuthRouter household invitation navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSegments.mockReturnValue(['invite'] as never);
  });

  it('keeps a logged-out invitee on authentication before preview or acceptance', async () => {
    mockUseAuth.mockReturnValue({
      status: 'signedOut',
      invitationReady: true,
      invitationToken: token,
      profile: null,
      error: null,
      hasSession: false,
    } as never);
    const screen = await render(<AuthRouter />);

    await waitFor(() => expect(screen.getByText('"/(auth)"')).toBeTruthy());
  });

  it('resumes the pending invitation after authentication instead of creating a household', async () => {
    mockUseAuth.mockReturnValue({
      status: 'authenticated',
      invitationReady: true,
      invitationToken: token,
      profile: { id: 'user', email: 'anna@example.se', households: [] },
      error: null,
      hasSession: true,
    } as never);
    const screen = await render(<AuthRouter />);

    expect(
      screen.getByText(JSON.stringify({ pathname: '/invite', params: { token } })),
    ).toBeTruthy();
  });
});
