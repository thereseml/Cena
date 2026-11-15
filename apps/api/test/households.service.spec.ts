import { ConflictException, NotFoundException } from '@nestjs/common';
import { HouseholdRole } from '@prisma/client';
import { HouseholdsService } from '../src/households/households.service';

const identity = { id: '00000000-0000-4000-8000-000000000001', email: 'anna@example.com' };
const appUser = { id: '00000000-0000-4000-8000-000000000002' };
const householdMembership = {
  household: {
    id: '00000000-0000-4000-8000-000000000003',
    name: 'Mitt hushåll',
    createdAt: new Date('2026-11-12T00:00:00Z'),
  },
  role: HouseholdRole.OWNER,
};

function createDatabase() {
  let completed = false;
  let householdCount = 0;
  let serial: Promise<void> = Promise.resolve();
  const transaction = {
    $queryRaw: jest.fn(),
    user: {
      upsert: jest.fn().mockResolvedValue(appUser),
      updateMany: jest.fn(async () => {
        if (completed) return { count: 0 };
        completed = true;
        return { count: 1 };
      }),
    },
    householdMember: {
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue({ id: 'membership-id', role: HouseholdRole.MEMBER }),
      findMany: jest
        .fn()
        .mockResolvedValue([
          { id: 'membership-id', userId: appUser.id, role: HouseholdRole.MEMBER },
        ]),
      delete: jest.fn(),
    },
    household: {
      delete: jest.fn(),
      create: jest.fn(async () => {
        householdCount += 1;
        return householdMembership.household;
      }),
    },
  };
  const prisma = {
    $transaction: jest.fn(async (callback: (client: typeof transaction) => Promise<unknown>) => {
      let release: () => void = () => undefined;
      const previous = serial;
      serial = new Promise<void>((resolve) => {
        release = resolve;
      });
      await previous;
      try {
        return await callback(transaction);
      } catch (error) {
        completed = false;
        householdCount = 0;
        throw error;
      } finally {
        release();
      }
    }),
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: appUser.id,
        email: identity.email,
        memberships: [householdMembership],
      }),
    },
    householdMember: {
      findMany: jest.fn().mockResolvedValue([householdMembership]),
      findUnique: jest.fn().mockResolvedValue(householdMembership),
    },
  };

  return { prisma, transaction, householdCount: () => householdCount };
}

describe('HouseholdsService', () => {
  it('bootstraps the application profile without automatically creating a household', async () => {
    const database = createDatabase();
    const service = new HouseholdsService(database.prisma as never);

    await expect(service.bootstrap(identity)).resolves.toEqual({
      id: appUser.id,
      email: identity.email,
      households: [{ id: householdMembership.household.id, name: 'Mitt hushåll', role: 'OWNER' }],
    });
    expect(database.transaction.household.create).not.toHaveBeenCalled();
    expect(database.transaction.user.updateMany).toHaveBeenCalledWith({
      where: { id: appUser.id, provisioningCompleted: false },
      data: { provisioningCompleted: true },
    });
  });

  it('keeps identity bootstrap idempotent under concurrent requests', async () => {
    const database = createDatabase();
    const service = new HouseholdsService(database.prisma as never);

    await Promise.all([
      service.bootstrap(identity),
      service.bootstrap(identity),
      service.bootstrap(identity),
    ]);

    expect(database.transaction.user.upsert).toHaveBeenCalledTimes(3);
    expect(database.transaction.household.create).not.toHaveBeenCalled();
  });

  it('does not create a new household on a later bootstrap retry', async () => {
    const database = createDatabase();
    database.transaction.user.updateMany.mockResolvedValue({ count: 0 });
    const service = new HouseholdsService(database.prisma as never);

    await service.bootstrap(identity);

    expect(database.transaction.household.create).not.toHaveBeenCalled();
  });

  it('does not attempt household creation during bootstrap', async () => {
    const database = createDatabase();
    const service = new HouseholdsService(database.prisma as never);

    await expect(service.bootstrap(identity)).resolves.toMatchObject({
      households: [{ role: 'OWNER' }],
    });
    expect(database.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(database.transaction.household.create).not.toHaveBeenCalled();
  });

  it('does not reveal a household to a non-member', async () => {
    const database = createDatabase();
    database.prisma.householdMember.findUnique.mockResolvedValue(null);
    const service = new HouseholdsService(database.prisma as never);

    await expect(
      service.getHouseholdForUser(identity.id, householdMembership.household.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('resolves the Supabase identity before listing household memberships', async () => {
    const database = createDatabase();
    const service = new HouseholdsService(database.prisma as never);

    await service.listForUser(identity.id);

    expect(database.prisma.user.findUnique).toHaveBeenCalledWith({
      where: { supabaseAuthId: identity.id },
      select: { id: true },
    });
    expect(database.prisma.householdMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: appUser.id } }),
    );
  });

  it('resolves the Supabase identity before checking household membership', async () => {
    const database = createDatabase();
    const service = new HouseholdsService(database.prisma as never);

    await service.getHouseholdForUser(identity.id, householdMembership.household.id);

    expect(database.prisma.householdMember.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          householdId_userId: {
            householdId: householdMembership.household.id,
            userId: appUser.id,
          },
        },
      }),
    );
  });

  it('creates a household explicitly with the owner role', async () => {
    const database = createDatabase();
    const service = new HouseholdsService(database.prisma as never);

    await service.createHousehold(identity.id, 'Vårt kök');

    expect(database.transaction.household.create).toHaveBeenCalledWith({
      data: {
        name: 'Vårt kök',
        members: { create: { userId: appUser.id, role: HouseholdRole.OWNER } },
      },
    });
  });

  it('does not replace a household that the user already has', async () => {
    const database = createDatabase();
    database.transaction.householdMember.findFirst.mockResolvedValue({ id: 'existing-membership' });
    const service = new HouseholdsService(database.prisma as never);

    await expect(service.createHousehold(identity.id, 'Nytt hushåll')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(database.transaction.household.create).not.toHaveBeenCalled();
  });

  it('does not allow an owner to leave a household', async () => {
    const database = createDatabase();
    database.transaction.householdMember.findUnique.mockResolvedValue({
      id: 'owner-membership',
      role: HouseholdRole.OWNER,
    });
    const service = new HouseholdsService(database.prisma as never);

    await expect(
      service.leaveHousehold(identity.id, householdMembership.household.id),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(database.transaction.householdMember.delete).not.toHaveBeenCalled();
  });

  it('removes only a member relationship when a member leaves', async () => {
    const database = createDatabase();
    const service = new HouseholdsService(database.prisma as never);

    await service.leaveHousehold(identity.id, householdMembership.household.id);

    expect(database.transaction.householdMember.delete).toHaveBeenCalledWith({
      where: { id: 'membership-id' },
    });
    expect(database.transaction.household.delete).not.toHaveBeenCalled();
  });

  it('reads members while holding the same user lock used by leave', async () => {
    const database = createDatabase();
    const service = new HouseholdsService(database.prisma as never);

    await expect(
      service.listMembers(identity.id, householdMembership.household.id),
    ).resolves.toEqual([
      { id: 'membership-id', displayName: 'Du', role: HouseholdRole.MEMBER, isCurrentUser: true },
    ]);
    expect(database.transaction.$queryRaw).toHaveBeenCalled();
  });

  it('does not list household members after the current membership is absent', async () => {
    const database = createDatabase();
    database.transaction.householdMember.findUnique.mockResolvedValue(null);
    const service = new HouseholdsService(database.prisma as never);

    await expect(
      service.listMembers(identity.id, householdMembership.household.id),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(database.transaction.householdMember.findMany).not.toHaveBeenCalled();
  });
});
