import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { SupabaseJwtGuard } from '../auth/supabase-jwt.guard';
import { InventoryService } from './inventory.service';

@Controller('api/v1/households/:householdId/inventory')
@UseGuards(SupabaseJwtGuard)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId', new ParseUUIDPipe()) householdId: string,
  ) {
    return this.inventory.list(user, householdId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId', new ParseUUIDPipe()) householdId: string,
    @Body() body: unknown,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    return this.inventory.create(user, householdId, body, idempotencyKey);
  }

  @Get(':itemId')
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId', new ParseUUIDPipe()) householdId: string,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
  ) {
    return this.inventory.get(user, householdId, itemId);
  }

  @Patch(':itemId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId', new ParseUUIDPipe()) householdId: string,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @Body() body: unknown,
  ) {
    return this.inventory.update(user, householdId, itemId, body);
  }

  @Delete(':itemId')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId', new ParseUUIDPipe()) householdId: string,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @Body() body: unknown,
  ) {
    return this.inventory.remove(user, householdId, itemId, body);
  }
}
