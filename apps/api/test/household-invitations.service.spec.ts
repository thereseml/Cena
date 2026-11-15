import { createHash } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import { HouseholdInvitationsService } from '../src/households/household-invitations.service';

const userId = '00000000-0000-4000-8000-000000000002';
const householdId = '00000000-0000-4000-8000-000000000003';
const invitationId = '00000000-0000-4000-8000-000000000004';

function createDatabase() {
  const invitationCreate = jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({
    id: invitationId,
    expiresAt: data.expiresAt,
    tokenHash: data.tokenHash,
  }));
  const invitationFindUnique = jest.fn();
  const invitationUpdate = jest.fn();
  const memberCreate = jest.fn();
  const transaction = {
    $queryRaw: jest.fn(),
    householdInvitation: {
      count: jest.fn().mockResolvedValue(0),
      create: invitationCreate,
      findUnique: invitationFindUnique,
      update: invitationUpdate,
    },
    householdMember: { findMany: jest.fn().mockResolvedValue([]), create: memberCreate },
  };
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: userId }),
      findUniqueOrThrow: jest.fn(),
    },
    householdMember: {
      findUnique: jest.fn().mockResolvedValue({ role: 'OWNER' }),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    householdInvitation: {
      count: jest.fn().mockResolvedValue(0),
      create: invitationCreate,
      findUnique: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (client: typeof transaction) => Promise<unknown>) =>
      callback(transaction),
    ),
  };
  return { prisma, transaction, invitationCreate };
}

describe('HouseholdInvitationsService', () => {
  it('creates a high-entropy link and stores only its SHA-256 hash for seven days', async () => {
    const database = createDatabase();
    const before = Date.now();
    const service = new HouseholdInvitationsService(database.prisma as never);

    const invitation = await service.create('supabase-user', householdId);
    const token = new URL(invitation.url).searchParams.get('token');
    const storedHash = database.invitationCreate.mock.calls[0][0].data.tokenHash;

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(storedHash).toBe(
      createHash('sha256')
        .update(token as string)
        .digest('hex'),
    );
    expect(storedHash).not.toBe(token);
    expect(new Date(invitation.expiresAt).getTime()).toBeGreaterThanOrEqual(
      before + 7 * 24 * 60 * 60 * 1000,
    );
    expect(new Date(invitation.expiresAt).getTime()).toBeLessThanOrEqual(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    );
  });

  it('limits invitation creation to five per hour', async () => {
    const database = createDatabase();
    database.transaction.householdInvitation.count.mockResolvedValue(5);
    const service = new HouseholdInvitationsService(database.prisma as never);

    await expect(service.create('supabase-user', householdId)).rejects.toThrow('Vänta en stund');
    expect(database.invitationCreate).not.toHaveBeenCalled();
  });

  it('does not let members create invitations', async () => {
    const database = createDatabase();
    database.prisma.householdMember.findUnique.mockResolvedValue({ role: 'MEMBER' });
    const service = new HouseholdInvitationsService(database.prisma as never);

    await expect(service.create('supabase-user', householdId)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(database.invitationCreate).not.toHaveBeenCalled();
  });

  it('revokes only an unaccepted, unexpired invitation for its household', async () => {
    const database = createDatabase();
    database.prisma.householdInvitation.updateMany.mockResolvedValue({ count: 1 });
    const service = new HouseholdInvitationsService(database.prisma as never);

    await service.revoke('supabase-user', householdId, invitationId);

    expect(database.prisma.householdInvitation.updateMany).toHaveBeenCalledWith({
      where: {
        id: invitationId,
        householdId,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: expect.any(Date) },
      },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('rejects acceptance of an expired invitation without creating membership', async () => {
    const database = createDatabase();
    database.prisma.householdInvitation.findUnique.mockResolvedValue({ id: invitationId });
    database.transaction.householdInvitation.findUnique.mockResolvedValue({
      householdId,
      expiresAt: new Date(Date.now() - 1000),
      acceptedAt: null,
      acceptedById: null,
      revokedAt: null,
    });
    const service = new HouseholdInvitationsService(database.prisma as never);

    await expect(service.accept('supabase-user', 'A'.repeat(43))).rejects.toThrow(
      'Inbjudningslänken är inte längre giltig.',
    );
    expect(database.transaction.householdMember.create).not.toHaveBeenCalled();
  });

  it('treats malformed tokens as invalid without querying invitation records', async () => {
    const database = createDatabase();
    const service = new HouseholdInvitationsService(database.prisma as never);

    await expect(service.preview('supabase-user', 'bad-token')).resolves.toEqual({
      status: 'INVALID',
      householdName: '',
    });
    expect(database.prisma.householdInvitation.findUnique).not.toHaveBeenCalled();
  });

  it('does not expose household details for expired invitations', async () => {
    const database = createDatabase();
    database.prisma.householdInvitation.findUnique.mockResolvedValue({
      householdId,
      household: { id: householdId, name: 'Privat hushåll' },
      expiresAt: new Date(Date.now() - 1000),
      acceptedAt: null,
      revokedAt: null,
    });
    const service = new HouseholdInvitationsService(database.prisma as never);

    await expect(service.preview('supabase-user', 'A'.repeat(43))).resolves.toEqual({
      status: 'EXPIRED',
      householdName: '',
    });
  });

  it('creates membership and consumes the invitation in the same transaction', async () => {
    const database = createDatabase();
    const token = 'A'.repeat(43);
    database.prisma.householdInvitation.findUnique.mockResolvedValue({ id: invitationId });
    database.transaction.householdInvitation.findUnique.mockResolvedValue({
      householdId,
      expiresAt: new Date(Date.now() + 10000),
      acceptedAt: null,
      acceptedById: null,
      revokedAt: null,
    });
    database.prisma.user.findUnique.mockResolvedValueOnce({ id: userId });
    database.prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: userId,
      email: 'anna@example.se',
      memberships: [{ household: { id: householdId, name: 'Familjen' }, role: 'MEMBER' }],
    });
    const service = new HouseholdInvitationsService(database.prisma as never);

    await expect(service.accept('supabase-user', token)).resolves.toMatchObject({
      householdId,
      profile: { households: [{ id: householdId, role: 'MEMBER' }] },
    });
    expect(database.transaction.householdMember.create).toHaveBeenCalledWith({
      data: { householdId, userId, role: 'MEMBER' },
    });
    expect(database.transaction.householdInvitation.update).toHaveBeenCalledWith({
      where: { id: invitationId },
      data: { acceptedAt: expect.any(Date), acceptedById: userId },
    });
  });

  it('rejects users who already have a different household without changing membership', async () => {
    const database = createDatabase();
    database.prisma.householdInvitation.findUnique.mockResolvedValue({ id: invitationId });
    database.transaction.householdInvitation.findUnique.mockResolvedValue({
      householdId,
      expiresAt: new Date(Date.now() + 10000),
      acceptedAt: null,
      acceptedById: null,
      revokedAt: null,
    });
    database.transaction.householdMember.findMany.mockResolvedValue([
      { householdId: 'other-household' },
    ]);
    const service = new HouseholdInvitationsService(database.prisma as never);

    await expect(service.accept('supabase-user', 'A'.repeat(43))).rejects.toThrow(
      'Du tillhör redan ett annat hushåll',
    );
    expect(database.transaction.householdMember.create).not.toHaveBeenCalled();
    expect(database.transaction.householdInvitation.update).not.toHaveBeenCalled();
  });
});
