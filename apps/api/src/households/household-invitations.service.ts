import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { HouseholdRole } from '@prisma/client';
import type {
  CreatedHouseholdInvitation,
  HouseholdInvitationPreview,
  HouseholdInvitationSummary,
} from '@cena/contracts';
import { PrismaService } from '../prisma/prisma.module';

const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

@Injectable()
export class HouseholdInvitationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(supabaseAuthId: string, householdId: string): Promise<CreatedHouseholdInvitation> {
    const userId = await this.applicationUserId(supabaseAuthId);
    const membership = await this.prisma.householdMember.findUnique({
      where: { householdId_userId: { householdId, userId } },
    });
    if (!membership) throw new NotFoundException('Hushållet kunde inte hittas.');
    if (membership.role !== HouseholdRole.OWNER) {
      throw new ConflictException('Endast hushållets ägare kan bjuda in medlemmar.');
    }
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + INVITATION_LIFETIME_MS);
    const url = this.invitationUrl(token);
    const invitation = await this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
      const recentCount = await transaction.householdInvitation.count({
        where: { createdById: userId, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
      });
      if (recentCount >= 5) {
        throw new HttpException(
          'Vänta en stund innan du skapar fler inbjudningar.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      return transaction.householdInvitation.create({
        data: { householdId, createdById: userId, tokenHash: this.hash(token), expiresAt },
        select: { id: true, expiresAt: true },
      });
    });
    return { id: invitation.id, expiresAt: invitation.expiresAt.toISOString(), url };
  }

  async list(supabaseAuthId: string, householdId: string): Promise<HouseholdInvitationSummary[]> {
    const userId = await this.applicationUserId(supabaseAuthId);
    await this.requireOwner(userId, householdId);
    const invitations = await this.prisma.householdInvitation.findMany({
      where: {
        householdId,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, createdAt: true, expiresAt: true },
    });
    return invitations.map((invitation) => ({
      id: invitation.id,
      createdAt: invitation.createdAt.toISOString(),
      expiresAt: invitation.expiresAt.toISOString(),
    }));
  }

  async revoke(supabaseAuthId: string, householdId: string, invitationId: string): Promise<void> {
    const userId = await this.applicationUserId(supabaseAuthId);
    await this.requireOwner(userId, householdId);
    const result = await this.prisma.householdInvitation.updateMany({
      where: {
        id: invitationId,
        householdId,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { revokedAt: new Date() },
    });
    if (result.count === 0) throw new NotFoundException('Inbjudan kunde inte hittas.');
  }

  async preview(supabaseAuthId: string, token: string): Promise<HouseholdInvitationPreview> {
    if (!TOKEN_PATTERN.test(token)) return { status: 'INVALID', householdName: '' };
    const userId = await this.applicationUserId(supabaseAuthId);
    const invitation = await this.prisma.householdInvitation.findUnique({
      where: { tokenHash: this.hash(token) },
      include: { household: { select: { id: true, name: true } } },
    });
    if (!invitation) return { status: 'INVALID', householdName: '' };

    const membership = await this.prisma.householdMember.findFirst({ where: { userId } });
    if (membership?.householdId === invitation.householdId) {
      return { status: 'ALREADY_MEMBER', householdName: invitation.household.name };
    }
    if (invitation.revokedAt) return { status: 'REVOKED', householdName: '' };
    if (invitation.acceptedAt) return { status: 'ACCEPTED', householdName: '' };
    if (invitation.expiresAt <= new Date()) return { status: 'EXPIRED', householdName: '' };
    if (membership) return { status: 'OTHER_HOUSEHOLD', householdName: '' };
    return { status: 'VALID', householdName: invitation.household.name };
  }

  async accept(supabaseAuthId: string, token: string) {
    if (!TOKEN_PATTERN.test(token))
      throw new ConflictException('Inbjudningslänken är inte giltig.');
    const userId = await this.applicationUserId(supabaseAuthId);
    const tokenHash = this.hash(token);
    const candidate = await this.prisma.householdInvitation.findUnique({
      where: { tokenHash },
      select: { id: true },
    });
    if (!candidate) throw new ConflictException('Inbjudningslänken är inte giltig.');

    const householdId = await this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT id FROM household_invitations WHERE id = ${candidate.id}::uuid FOR UPDATE`;
      await transaction.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
      const invitation = await transaction.householdInvitation.findUnique({
        where: { id: candidate.id },
        select: {
          householdId: true,
          expiresAt: true,
          acceptedAt: true,
          acceptedById: true,
          revokedAt: true,
        },
      });
      if (
        !invitation ||
        invitation.revokedAt ||
        invitation.acceptedAt ||
        invitation.expiresAt <= new Date()
      ) {
        throw new ConflictException('Inbjudningslänken är inte längre giltig.');
      }
      const memberships = await transaction.householdMember.findMany({
        where: { userId },
        select: { householdId: true },
      });
      if (
        memberships.some(({ householdId: existingId }) => existingId === invitation.householdId)
      ) {
        throw new ConflictException('Du tillhör redan hushållet.');
      }
      if (memberships.length > 0) {
        throw new ConflictException(
          'Du tillhör redan ett annat hushåll och kan inte byta automatiskt.',
        );
      }
      await transaction.householdMember.create({
        data: { householdId: invitation.householdId, userId, role: HouseholdRole.MEMBER },
      });
      await transaction.householdInvitation.update({
        where: { id: candidate.id },
        data: { acceptedAt: new Date(), acceptedById: userId },
      });
      return invitation.householdId;
    });

    return { householdId, profile: await this.profile(supabaseAuthId) };
  }

  private async requireOwner(userId: string, householdId: string): Promise<void> {
    const membership = await this.prisma.householdMember.findUnique({
      where: { householdId_userId: { householdId, userId } },
      select: { role: true },
    });
    if (!membership) throw new NotFoundException('Hushållet kunde inte hittas.');
    if (membership.role !== HouseholdRole.OWNER) {
      throw new ConflictException('Endast hushållets ägare kan hantera inbjudningar.');
    }
  }

  private async applicationUserId(supabaseAuthId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { supabaseAuthId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('Användaren kunde inte hittas.');
    return user.id;
  }

  private async profile(supabaseAuthId: string) {
    return this.prisma.user
      .findUniqueOrThrow({
        where: { supabaseAuthId },
        include: { memberships: { include: { household: true }, orderBy: { createdAt: 'asc' } } },
      })
      .then((user) => ({
        id: user.id,
        email: user.email,
        households: user.memberships.map(({ household, role }) => ({
          id: household.id,
          name: household.name,
          role,
        })),
      }));
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private invitationUrl(token: string): string {
    const base = process.env.INVITATION_BASE_URL?.trim();
    if (!base) return `cena://invite?token=${encodeURIComponent(token)}`;
    let url: URL;
    try {
      url = new URL(base);
    } catch {
      throw new ConflictException('Inbjudningslänken är inte konfigurerad säkert.');
    }
    if (url.protocol !== 'https:' && url.protocol !== 'cena:') {
      throw new ConflictException('Inbjudningslänken är inte konfigurerad säkert.');
    }
    url.searchParams.set('token', token);
    return url.toString();
  }
}
