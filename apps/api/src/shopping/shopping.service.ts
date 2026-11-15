import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { InventoryUnit, ShoppingList, ShoppingListItem } from '@cena/contracts';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { HouseholdsService } from '../households/households.service';
import { InventoryService } from '../inventory/inventory.service';
import { parseInventoryInput, unitToDatabase } from '../inventory/inventory-validation';
import { PrismaService } from '../prisma/prisma.module';
import { RecipesService } from '../recipes/recipes.service';
import { parseExpectedVersion, parseShoppingItem } from './shopping-validation';

@Injectable()
export class ShoppingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly households: HouseholdsService,
    private readonly inventory: InventoryService,
    private readonly recipes: RecipesService,
  ) {}

  async list(user: AuthenticatedUser, householdId: string): Promise<ShoppingList> {
    await this.authorize(user, householdId);
    const list = await this.getOrCreateList(householdId);
    const items = await this.prisma.shoppingListItem.findMany({
      where: { shoppingListId: list.id, transferredAt: null },
      include: { recipe: { select: { title: true } } },
      orderBy: [{ isPurchased: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
    return { items: items.map((item) => this.toContract(item)) };
  }

  async add(
    user: AuthenticatedUser,
    householdId: string,
    value: unknown,
  ): Promise<ShoppingListItem> {
    await this.authorize(user, householdId);
    const input = parseShoppingItem(value);
    const list = await this.getOrCreateList(householdId);
    let savedId: string;
    try {
      const saved = await this.prisma.$transaction((transaction) =>
        this.saveItem(transaction, list.id, input),
      );
      savedId = saved.id;
    } catch (error) {
      if (isUniqueConflict(error)) throw this.duplicateConflict(input.name);
      throw error;
    }
    return this.getItem(list.id, savedId);
  }

  async update(
    user: AuthenticatedUser,
    householdId: string,
    itemId: string,
    value: unknown,
  ): Promise<ShoppingListItem> {
    await this.authorize(user, householdId);
    const input = parseShoppingItem(value);
    const expectedVersion = parseExpectedVersion(value);
    const list = await this.getOrCreateList(householdId);
    let result;
    try {
      result = await this.prisma.shoppingListItem.updateMany({
        where: {
          id: itemId,
          shoppingListId: list.id,
          transferredAt: null,
          version: expectedVersion,
        },
        data: {
          ...input,
          unit: input.unit ? unitToDatabase(input.unit) : null,
          normalizedName: normalizeName(input.name),
          version: { increment: 1 },
        },
      });
    } catch (error) {
      if (isUniqueConflict(error)) throw this.duplicateConflict(input.name);
      throw error;
    }
    if (result.count !== 1) throw new ConflictException('Varan har ändrats. Läs in listan igen.');
    return this.getItem(list.id, itemId);
  }

  async remove(user: AuthenticatedUser, householdId: string, itemId: string, value: unknown) {
    await this.authorize(user, householdId);
    const expectedVersion = parseExpectedVersion(value);
    const list = await this.getOrCreateList(householdId);
    const result = await this.prisma.shoppingListItem.deleteMany({
      where: { id: itemId, shoppingListId: list.id, transferredAt: null, version: expectedVersion },
    });
    if (result.count !== 1) throw new ConflictException('Varan har ändrats. Läs in listan igen.');
    return { id: itemId };
  }

  async setPurchased(
    user: AuthenticatedUser,
    householdId: string,
    itemId: string,
    value: unknown,
  ): Promise<ShoppingListItem> {
    await this.authorize(user, householdId);
    if (
      !value ||
      typeof value !== 'object' ||
      typeof (value as Record<string, unknown>).isPurchased !== 'boolean'
    ) {
      throw new BadRequestException('Ange om varan är handlad.');
    }
    const expectedVersion = parseExpectedVersion(value);
    const list = await this.getOrCreateList(householdId);
    let result;
    try {
      result = await this.prisma.shoppingListItem.updateMany({
        where: {
          id: itemId,
          shoppingListId: list.id,
          transferredAt: null,
          version: expectedVersion,
        },
        data: {
          isPurchased: (value as { isPurchased: boolean }).isPurchased,
          version: { increment: 1 },
        },
      });
    } catch (error) {
      if (isUniqueConflict(error)) throw this.duplicateConflict('Varan');
      throw error;
    }
    if (result.count !== 1) throw new ConflictException('Varan har ändrats. Läs in listan igen.');
    return this.getItem(list.id, itemId);
  }

  async addFromRecipe(
    user: AuthenticatedUser,
    householdId: string,
    value: unknown,
  ): Promise<ShoppingList> {
    await this.authorize(user, householdId);
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new BadRequestException('Välj ingredienser.');
    const body = value as Record<string, unknown>;
    if (
      !isUuid(body.recipeId) ||
      !Array.isArray(body.items) ||
      body.items.length < 1 ||
      body.items.length > 30
    ) {
      throw new BadRequestException('Välj mellan 1 och 30 receptingredienser.');
    }
    const recipe = await this.recipes.get(user, body.recipeId, { householdId });
    const recipeIngredients = new Map(
      recipe.ingredients.map((ingredient) => [ingredient.id, ingredient]),
    );
    const selected = body.items.map((item) => {
      if (
        !item ||
        typeof item !== 'object' ||
        !isUuid((item as Record<string, unknown>).recipeIngredientId)
      ) {
        throw new BadRequestException('Kontrollera receptets ingredienser.');
      }
      const row = item as Record<string, unknown>;
      const source = recipeIngredients.get(row.recipeIngredientId as string);
      if (!source) throw new BadRequestException('En ingrediens tillhör inte receptet.');
      if (!['PARTIAL', 'MISSING', 'UNKNOWN'].includes(source.availability ?? '')) {
        throw new BadRequestException('Ingrediensen är inte markerad som saknad i receptet.');
      }
      const input = parseShoppingItem(row);
      return { ...input, source };
    });
    const list = await this.getOrCreateList(householdId);
    try {
      await this.prisma.$transaction(async (transaction) => {
        for (const { source, ...input } of selected) {
          await this.saveItem(transaction, list.id, input, {
            recipeId: recipe.id,
            recipeTitle: recipe.title,
            recipeIngredientId: source.id,
          });
        }
      });
    } catch (error) {
      if (isUniqueConflict(error)) throw this.duplicateConflict('En ingrediens');
      throw error;
    }
    return this.list(user, householdId);
  }

  async clearCompleted(user: AuthenticatedUser, householdId: string, value: unknown) {
    await this.authorize(user, householdId);
    const entries =
      value && typeof value === 'object' ? (value as Record<string, unknown>).items : null;
    if (
      !Array.isArray(entries) ||
      entries.length < 1 ||
      entries.length > 100 ||
      entries.some(
        (entry) =>
          !entry || typeof entry !== 'object' || !isUuid((entry as Record<string, unknown>).id),
      )
    ) {
      throw new BadRequestException('Välj vilka handlade varor som ska tas bort.');
    }
    const list = await this.getOrCreateList(householdId);
    const deleted = await this.prisma.$transaction(async (transaction) => {
      let count = 0;
      for (const entry of entries as Array<{ id: string; expectedVersion: number }>) {
        const expectedVersion = parseExpectedVersion(entry);
        const result = await transaction.shoppingListItem.deleteMany({
          where: {
            shoppingListId: list.id,
            id: entry.id,
            isPurchased: true,
            transferredAt: null,
            version: expectedVersion,
          },
        });
        if (result.count !== 1)
          throw new ConflictException('En handlad vara har ändrats. Läs in listan igen.');
        count += result.count;
      }
      return count;
    });
    return { deleted };
  }

  async importToInventory(user: AuthenticatedUser, householdId: string, value: unknown) {
    await this.authorize(user, householdId);
    if (
      !value ||
      typeof value !== 'object' ||
      !Array.isArray((value as Record<string, unknown>).items)
    ) {
      throw new BadRequestException('Granska varorna som ska läggas till i köket.');
    }
    const entries = (value as { items: unknown[] }).items;
    if (entries.length < 1 || entries.length > 30)
      throw new BadRequestException('Välj mellan 1 och 30 varor.');
    const normalized = entries.map((entry) => {
      if (!entry || typeof entry !== 'object')
        throw new BadRequestException('Kontrollera varorna.');
      const row = entry as Record<string, unknown>;
      if (!isUuid(row.shoppingListItemId))
        throw new BadRequestException('Varan kunde inte hittas.');
      const expectedVersion = parseExpectedVersion(row);
      const input = parseInventoryInput(row);
      return { shoppingListItemId: row.shoppingListItemId, expectedVersion, input };
    });
    const list = await this.getOrCreateList(householdId);
    return this.prisma.$transaction(async (transaction) => {
      const created = [];
      for (const entry of normalized) {
        const claimed = await transaction.shoppingListItem.updateMany({
          where: {
            id: entry.shoppingListItemId,
            shoppingListId: list.id,
            isPurchased: true,
            transferredAt: null,
            version: entry.expectedVersion,
          },
          data: { transferredAt: new Date(), version: { increment: 1 } },
        });
        if (claimed.count !== 1)
          throw new ConflictException('En vara har ändrats eller redan lagts till i köket.');
        const inventoryItem = await this.inventory.createPurchasedWithinTransaction(
          transaction,
          householdId,
          entry.input,
          `shopping:${entry.shoppingListItemId}`,
        );
        await transaction.shoppingListItem.update({
          where: { id: entry.shoppingListItemId },
          data: { importedInventoryItemId: inventoryItem.id },
        });
        created.push(inventoryItem);
      }
      return { items: created };
    });
  }

  private async authorize(user: AuthenticatedUser, householdId: string) {
    await this.households.getHouseholdForUser(user.id, householdId);
  }

  private getOrCreateList(householdId: string) {
    return this.prisma.shoppingList.upsert({
      where: { householdId },
      create: { householdId },
      update: {},
    });
  }

  private async saveItem(
    transaction: Prisma.TransactionClient,
    listId: string,
    input: ReturnType<typeof parseShoppingItem>,
    recipe: { recipeId: string; recipeTitle: string; recipeIngredientId: string } | null = null,
  ) {
    const normalizedName = normalizeName(input.name);
    const existing = await transaction.shoppingListItem.findFirst({
      where: { shoppingListId: listId, normalizedName, isPurchased: false, transferredAt: null },
      orderBy: { createdAt: 'asc' },
    });
    const databaseUnit = input.unit ? unitToDatabase(input.unit) : null;
    if (!existing) {
      return transaction.shoppingListItem.create({
        data: {
          shoppingListId: listId,
          ...input,
          unit: databaseUnit,
          normalizedName,
          ...(recipe ?? {}),
        },
      });
    }
    throw this.duplicateConflict(input.name);
  }

  private duplicateConflict(name: string) {
    return new ConflictException(
      `${name} finns redan på listan. Granska eller redigera den befintliga varan innan du lägger till fler.`,
    );
  }

  private async getItem(listId: string, itemId: string): Promise<ShoppingListItem> {
    const item = await this.prisma.shoppingListItem.findFirst({
      where: { id: itemId, shoppingListId: listId },
      include: { recipe: { select: { title: true } } },
    });
    if (!item) throw new NotFoundException('Varan kunde inte hittas.');
    return this.toContract(item);
  }

  private toContract(item: {
    id: string;
    name: string;
    quantity: Prisma.Decimal | null;
    unit: keyof typeof DB_UNITS | null;
    isPurchased: boolean;
    recipeId: string | null;
    recipeTitle?: string | null;
    recipe?: { title: string } | null;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }): ShoppingListItem {
    return {
      id: item.id,
      name: item.name,
      quantity: item.quantity?.toNumber() ?? null,
      unit: item.unit ? DB_UNITS[item.unit] : null,
      isPurchased: item.isPurchased,
      recipeId: item.recipeId,
      recipeTitle: item.recipe?.title ?? item.recipeTitle ?? null,
      version: item.version,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}

const DB_UNITS: Record<'PIECE' | 'GRAM' | 'KILOGRAM' | 'MILLILITER' | 'LITER', InventoryUnit> = {
  PIECE: 'st',
  GRAM: 'g',
  KILOGRAM: 'kg',
  MILLILITER: 'ml',
  LITER: 'l',
};

function normalizeName(value: string): string {
  return value.trim().normalize('NFKC').toLocaleLowerCase('sv-SE').replace(/\s+/g, ' ');
}

function isUniqueConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}
