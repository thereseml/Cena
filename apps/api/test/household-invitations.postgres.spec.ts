import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { HouseholdInvitationsService } from '../src/households/household-invitations.service';
import { PrismaService } from '../src/prisma/prisma.module';

const databaseUrl = process.env.RECIPE_TEST_DATABASE_URL;
if (databaseUrl !== undefined) {
  const target = new URL(databaseUrl);
  if (
    !['postgres:', 'postgresql:'].includes(target.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) ||
    target.pathname !== '/cena_recipes_test' ||
    target.port !== '55439' ||
    target.search ||
    target.hash
  ) {
    throw new Error('RECIPE_TEST_DATABASE_URL must target localhost:55439/cena_recipes_test');
  }
}

const describeDatabase = databaseUrl === undefined ? describe.skip : describe;

describeDatabase('household invitation concurrency on isolated local PostgreSQL', () => {
  let prisma: PrismaClient;
  let service: HouseholdInvitationsService;
  const ownerId = randomUUID();
  const firstInviteeId = randomUUID();
  const secondInviteeId = randomUUID();
  const householdId = randomUUID();
  const runId = randomUUID();

  beforeAll(async () => {
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl, max: 5 }) });
    await prisma.$connect();
    const target = await prisma.$queryRaw<
      Array<{ name: string }>
    >`SELECT current_database() AS name`;
    expect(target[0].name).toBe('cena_recipes_test');

    await prisma.user.createMany({
      data: [ownerId, firstInviteeId, secondInviteeId].map((id, index) => ({
        id,
        supabaseAuthId: randomUUID(),
        email: `invitation-${runId}-${index}@example.invalid`,
        provisioningCompleted: true,
      })),
    });
    await prisma.household.create({
      data: {
        id: householdId,
        name: `Invitation race ${runId}`,
        members: { create: { userId: ownerId, role: 'OWNER' } },
      },
    });
    service = new HouseholdInvitationsService(prisma as PrismaService);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.household.deleteMany({ where: { id: householdId } });
      await prisma.user.deleteMany({
        where: { id: { in: [ownerId, firstInviteeId, secondInviteeId] } },
      });
      await prisma.$disconnect();
    }
  });

  it('allows exactly one concurrent account to consume a single-use invitation', async () => {
    const token = randomBytes(32).toString('base64url');
    await prisma.householdInvitation.create({
      data: {
        householdId,
        createdById: ownerId,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const results = await Promise.allSettled([
      service.accept(
        (await prisma.user.findUniqueOrThrow({ where: { id: firstInviteeId } })).supabaseAuthId,
        token,
      ),
      service.accept(
        (await prisma.user.findUniqueOrThrow({ where: { id: secondInviteeId } })).supabaseAuthId,
        token,
      ),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(await prisma.householdMember.count({ where: { householdId } })).toBe(2);
    expect(
      await prisma.householdInvitation.count({ where: { householdId, acceptedAt: { not: null } } }),
    ).toBe(1);
  });
});
