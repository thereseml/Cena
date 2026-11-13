import { Injectable, NotFoundException } from '@nestjs/common';
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
      const claimed = await transaction.user.updateMany({
        where: { id: user.id, provisioningCompleted: false },
        data: { provisioningCompleted: true },
      });

      if (claimed.count === 1) {
        const membershipCount = await transaction.householdMember.count({
          where: { userId: user.id },
        });
        if (membershipCount === 0) {
          await transaction.household.create({
            data: {
              name: 'Mitt hushåll',
              members: { create: { userId: user.id, role: HouseholdRole.OWNER } },
            },
          });
        }
      }

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
