import { NotFoundException } from '@nestjs/common';
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
    user: {
      upsert: jest.fn().mockResolvedValue(appUser),
      updateMany: jest.fn(async () => {
        if (completed) return { count: 0 };
        completed = true;
        return { count: 1 };
      }),
    },
    householdMember: { count: jest.fn().mockResolvedValue(0) },
    household: {
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
  it('creates one owner household and returns the application profile', async () => {
    const database = createDatabase();
    const service = new HouseholdsService(database.prisma as never);

    await expect(service.bootstrap(identity)).resolves.toEqual({
      id: appUser.id,
      email: identity.email,
      households: [{ id: householdMembership.household.id, name: 'Mitt hushåll', role: 'OWNER' }],
    });
    expect(database.transaction.household.create).toHaveBeenCalledWith({
      data: {
        name: 'Mitt hushåll',
        members: { create: { userId: appUser.id, role: HouseholdRole.OWNER } },
      },
    });
  });

  it('keeps bootstrap idempotent and prevents concurrent duplicate households', async () => {
    const database = createDatabase();
    const service = new HouseholdsService(database.prisma as never);

    await Promise.all([
      service.bootstrap(identity),
      service.bootstrap(identity),
      service.bootstrap(identity),
    ]);

    expect(database.householdCount()).toBe(1);
  });

  it('does not recreate a household after a later membership removal', async () => {
    const database = createDatabase();
    database.transaction.user.updateMany.mockResolvedValue({ count: 0 });
    const service = new HouseholdsService(database.prisma as never);

    await service.bootstrap(identity);

    expect(database.transaction.household.create).not.toHaveBeenCalled();
  });

  it('rolls back when household creation fails', async () => {
    const database = createDatabase();
    database.transaction.household.create.mockRejectedValueOnce(new Error('database failure'));
    const service = new HouseholdsService(database.prisma as never);

    await expect(service.bootstrap(identity)).rejects.toThrow('database failure');
    await expect(service.bootstrap(identity)).resolves.toMatchObject({
      households: [{ role: 'OWNER' }],
    });
    expect(database.prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(database.householdCount()).toBe(1);
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
});
