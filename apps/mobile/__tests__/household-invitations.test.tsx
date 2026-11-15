import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../features/auth/AuthProvider';
import { apiRequest } from '../lib/api';
import InvitationScreen from '../app/invite';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));
jest.mock('../features/auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('../lib/api', () => ({
  apiRequest: jest.fn(),
  apiErrorMessage: (_error: unknown, fallback: string) => fallback,
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;
const mockParams = useLocalSearchParams as jest.MockedFunction<typeof useLocalSearchParams>;
const token = 'A'.repeat(43);
const profile = {
  id: 'user-id',
  email: 'anna@example.se',
  households: [{ id: 'household-id', name: 'Familjen', role: 'MEMBER' as const }],
};
const mockSetProfile = jest.fn();
const mockClearInvitation = jest.fn();

describe('household invitation screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams.mockReturnValue({ token } as never);
    mockUseAuth.mockReturnValue({
      invitationToken: token,
      profile: null,
      setProfileFromServer: mockSetProfile,
      clearInvitation: mockClearInvitation,
    } as never);
  });

  it('requires a separate confirmation before joining and then navigates to shared data', async () => {
    mockApiRequest
      .mockResolvedValueOnce({ status: 'VALID', householdName: 'Familjen' })
      .mockResolvedValueOnce({ householdId: 'household-id', profile });
    const screen = await render(<InvitationScreen />);

    expect(await screen.findByText('Du är inbjuden!')).toBeTruthy();
    expect(mockApiRequest).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Gå med i hushållet' }));

    await waitFor(() => {
      expect(mockSetProfile).toHaveBeenCalledWith(profile);
      expect(mockClearInvitation).toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith('/(tabs)');
    });
    expect(mockApiRequest).toHaveBeenLastCalledWith('household-invitations/accept', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  });

  it('shows the expired state and never attempts acceptance', async () => {
    mockApiRequest.mockResolvedValueOnce({ status: 'EXPIRED', householdName: '' });
    const screen = await render(<InvitationScreen />);

    expect(await screen.findByText('Inbjudningslänken har gått ut.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Gå med i hushållet' })).toBeNull();
    expect(mockApiRequest).toHaveBeenCalledTimes(1);
  });

  it('explains that an existing household is not switched automatically', async () => {
    mockApiRequest.mockResolvedValueOnce({ status: 'OTHER_HOUSEHOLD', householdName: '' });
    const screen = await render(<InvitationScreen />);

    expect(await screen.findByText(/Du tillhör redan ett annat hushåll/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Gå med i hushållet' })).toBeNull();
  });

  it('clears the pending token when the user is already in the invited household', async () => {
    mockApiRequest.mockResolvedValueOnce({ status: 'ALREADY_MEMBER', householdName: 'Familjen' });
    const screen = await render(<InvitationScreen />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Till hushållet' }));

    await waitFor(() => {
      expect(mockClearInvitation).toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith('/(tabs)');
    });
  });
});
