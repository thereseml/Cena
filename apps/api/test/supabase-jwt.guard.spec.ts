import { UnauthorizedException } from '@nestjs/common';
import { jwtVerify } from 'jose';
import { SupabaseJwtGuard } from '../src/auth/supabase-jwt.guard';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => jest.fn()),
  jwtVerify: jest.fn(),
}));

const verify = jwtVerify as jest.MockedFunction<typeof jwtVerify>;

describe('SupabaseJwtGuard', () => {
  beforeEach(() => {
    process.env.SUPABASE_JWT_ISSUER = 'https://example.supabase.co/auth/v1';
    process.env.SUPABASE_JWKS_URL = 'https://example.supabase.co/auth/v1/.well-known/jwks.json';
    process.env.SUPABASE_JWT_AUDIENCE = 'authenticated';
    verify.mockReset();
  });

  it('rejects requests without a bearer token', async () => {
    const guard = new SupabaseJwtGuard();
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
    } as never;

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(verify).not.toHaveBeenCalled();
  });

  it('verifies token identity with the configured issuer and audience', async () => {
    verify.mockResolvedValue({
      payload: { sub: 'user-id', email: 'user@example.com', role: 'authenticated' },
    } as never);
    const guard = new SupabaseJwtGuard();
    const request = { headers: { authorization: 'Bearer signed-token' } };
    const context = { switchToHttp: () => ({ getRequest: () => request }) } as never;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request).toHaveProperty('user', { id: 'user-id', email: 'user@example.com' });
    expect(verify).toHaveBeenCalledWith('signed-token', expect.any(Function), {
      issuer: process.env.SUPABASE_JWT_ISSUER,
      audience: 'authenticated',
    });
  });

  it('rejects invalid and expired tokens', async () => {
    verify.mockRejectedValue(new Error('JWTExpired'));
    const guard = new SupabaseJwtGuard();
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization: 'Bearer expired' } }),
      }),
    } as never;

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects tokens carrying a privileged Supabase role', async () => {
    verify.mockResolvedValue({
      payload: { sub: 'user-id', email: 'user@example.com', role: 'service_role' },
    } as never);
    const guard = new SupabaseJwtGuard();
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization: 'Bearer privileged' } }),
      }),
    } as never;

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
