import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { useAuth } from '../features/auth/AuthProvider';
import SignInScreen from '../app/(auth)/index';
import VerifyEmailScreen from '../app/(auth)/verify';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ email: 'anna@example.com' }),
}));

jest.mock('../features/auth/AuthProvider', () => ({ useAuth: jest.fn() }));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockRequestCode = jest.fn();
const mockVerifyCode = jest.fn();
const mockResendCode = jest.fn();

describe('email sign-in screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      requestCode: mockRequestCode,
      verifyCode: mockVerifyCode,
      resendCode: mockResendCode,
    } as never);
  });

  it('shows validation feedback without requesting a code for an invalid email', async () => {
    const { getByRole, getByPlaceholderText, findByText } = await render(<SignInScreen />);
    await fireEvent.changeText(getByPlaceholderText('namn@exempel.se'), 'not-an-email');
    await fireEvent.press(getByRole('button', { name: 'Fortsätt med e-post' }));

    expect(await findByText('Ange en giltig e-postadress.')).toBeTruthy();
    expect(mockRequestCode).not.toHaveBeenCalled();
  });

  it('requests a code and opens the verification screen for a valid email', async () => {
    mockRequestCode.mockResolvedValue(undefined);
    const { getByRole, getByPlaceholderText } = await render(<SignInScreen />);
    await fireEvent.changeText(getByPlaceholderText('namn@exempel.se'), '  Anna@Example.com ');
    await fireEvent.press(getByRole('button', { name: 'Fortsätt med e-post' }));

    await waitFor(() => {
      expect(mockRequestCode).toHaveBeenCalledWith('anna@example.com');
      expect(router.push).toHaveBeenCalledWith({
        pathname: '/(auth)/verify',
        params: { email: 'anna@example.com' },
      });
    });
  });

  it('shows invalid or expired OTP feedback and keeps the user on verification', async () => {
    mockVerifyCode.mockRejectedValue(new Error('Koden är felaktig eller har gått ut.'));
    const { getByPlaceholderText, getByRole, findByText } = await render(<VerifyEmailScreen />);
    await fireEvent.changeText(getByPlaceholderText('123456'), '123456');
    await fireEvent.press(getByRole('button', { name: 'Verifiera kod' }));

    expect(await findByText('Koden är felaktig eller har gått ut.')).toBeTruthy();
    expect(mockVerifyCode).toHaveBeenCalledWith('anna@example.com', '123456');
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('requires all six OTP digits before submitting', async () => {
    const { getByPlaceholderText, getByRole, findByText } = await render(<VerifyEmailScreen />);
    await fireEvent.changeText(getByPlaceholderText('123456'), '12345');
    await fireEvent.press(getByRole('button', { name: 'Verifiera kod' }));

    expect(await findByText('Ange den sexsiffriga koden i mejlet.')).toBeTruthy();
    expect(mockVerifyCode).not.toHaveBeenCalled();
  });
});
