import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HouseholdRole } from '@prisma/client';
import type { CurrentUser } from '@cena/contracts';
import { PrismaService } from '../prisma/prisma.module';
import { AuthenticatedUser } from '../auth/authenticated-user';

@Injectable()
export class HouseholdsService {
  constructor(private readonly prisma: PrismaService) {}

  async bootstrap(identity: AuthenticatedUser): Promise<CurrentUser> {
    await this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.upsert({
        where: { supabaseAuthId: identity.id },
        create: { supabaseAuthId: identity.id, email: identity.email },
        update: { email: identity.email },
      });

      // The conditional update is the concurrency gate: only one request can
      // perform initial household provisioning for this user.
      await transaction.user.updateMany({
        where: { id: user.id, provisioningCompleted: false },
        data: { provisioningCompleted: true },
      });
    });

    return this.getForUser(identity.id);
  }

  async getForUser(supabaseAuthId: string): Promise<CurrentUser> {
    const user = await this.prisma.user.findUnique({
      where: { supabaseAuthId },
      include: {
        memberships: {
          include: { household: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!user) throw new NotFoundException('Användaren kunde inte hittas.');

    return {
      id: user.id,
      email: user.email,
      households: user.memberships.map(({ household, role }) => ({
        id: household.id,
        name: household.name,
        role,
      })),
    };
  }

  async listForUser(supabaseAuthId: string): Promise<CurrentUser['households']> {
    const userId = await this.getApplicationUserId(supabaseAuthId);
    const memberships = await this.prisma.householdMember.findMany({
      where: { userId },
      include: { household: true },
      orderBy: { createdAt: 'asc' },
    });
    return memberships.map(({ household, role }) => ({
      id: household.id,
      name: household.name,
      role,
    }));
  }

  async createHousehold(supabaseAuthId: string, name: string) {
    const userId = await this.getApplicationUserId(supabaseAuthId);
    const cleanName = name.trim();
    if (cleanName.length < 1 || cleanName.length > 80) {
      throw new BadRequestException('Ange ett hushållsnamn på högst 80 tecken.');
    }

    await this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
      const existing = await transaction.householdMember.findFirst({ where: { userId } });
      if (existing) throw new ConflictException('Du tillhör redan ett hushåll.');
      await transaction.household.create({
        data: { name: cleanName, members: { create: { userId, role: HouseholdRole.OWNER } } },
      });
    });

    return this.getForUser(supabaseAuthId);
  }

  async listMembers(supabaseAuthId: string, householdId: string) {
    const userId = await this.getApplicationUserId(supabaseAuthId);
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
      const currentMembership = await transaction.householdMember.findUnique({
        where: { householdId_userId: { householdId, userId } },
      });
      if (!currentMembership) throw new NotFoundException('Hushållet kunde inte hittas.');
      const memberships = await transaction.householdMember.findMany({
        where: { householdId },
        orderBy: { createdAt: 'asc' },
        select: { id: true, userId: true, role: true },
      });
      return memberships.map((membership, index) => ({
        id: membership.id,
        displayName: membership.userId === userId ? 'Du' : `Medlem ${index + 1}`,
        role: membership.role,
        isCurrentUser: membership.userId === userId,
      }));
    });
  }

  async leaveHousehold(supabaseAuthId: string, householdId: string): Promise<CurrentUser> {
    const userId = await this.getApplicationUserId(supabaseAuthId);
    await this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
      const membership = await transaction.householdMember.findUnique({
        where: { householdId_userId: { householdId, userId } },
      });
      if (!membership) throw new NotFoundException('Hushållet kunde inte hittas.');
      if (membership.role === HouseholdRole.OWNER) {
        throw new ConflictException('Ägaren kan inte lämna hushållet i den här versionen.');
      }
      await transaction.householdMember.delete({ where: { id: membership.id } });
    });
    return this.getForUser(supabaseAuthId);
  }

  async getHouseholdForUser(supabaseAuthId: string, householdId: string) {
    const userId = await this.getApplicationUserId(supabaseAuthId);
    const membership = await this.prisma.householdMember.findUnique({
      where: { householdId_userId: { householdId, userId } },
      include: { household: true },
    });
    if (!membership) throw new NotFoundException('Hushållet kunde inte hittas.');
    return {
      id: membership.household.id,
      name: membership.household.name,
      role: membership.role,
      createdAt: membership.household.createdAt,
    };
  }

  private async getApplicationUserId(supabaseAuthId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { supabaseAuthId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('Användaren kunde inte hittas.');
    return user.id;
  }
}
