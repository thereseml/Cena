import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { AuthenticatedRequest } from './authenticated-user';

@Injectable()
export class SupabaseJwtGuard implements CanActivate {
  private readonly issuer = process.env.SUPABASE_JWT_ISSUER;
  private readonly audience = process.env.SUPABASE_JWT_AUDIENCE ?? 'authenticated';
  private readonly jwks = process.env.SUPABASE_JWKS_URL
    ? createRemoteJWKSet(new URL(process.env.SUPABASE_JWKS_URL))
    : null;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;

    if (!token || !this.jwks || !this.issuer) throw new UnauthorizedException();

    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: this.audience,
      });
      if (
        payload.role !== 'authenticated' ||
        typeof payload.sub !== 'string' ||
        typeof payload.email !== 'string'
      ) {
        throw new UnauthorizedException();
      }
      request.user = { id: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
