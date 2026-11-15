import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { SupabaseJwtGuard } from '../auth/supabase-jwt.guard';
import { ShoppingService } from './shopping.service';

@Controller('api/v1/households/:householdId/shopping-list')
@UseGuards(SupabaseJwtGuard)
export class ShoppingController {
  constructor(private readonly shopping: ShoppingService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId', new ParseUUIDPipe()) householdId: string,
  ) {
    return this.shopping.list(user, householdId);
  }

  @Post('items')
  add(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId', new ParseUUIDPipe()) householdId: string,
    @Body() body: unknown,
  ) {
    return this.shopping.add(user, householdId, body);
  }

  @Post('items/batch')
  addFromRecipe(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId', new ParseUUIDPipe()) householdId: string,
    @Body() body: unknown,
  ) {
    return this.shopping.addFromRecipe(user, householdId, body);
  }

  @Patch('items/:itemId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId', new ParseUUIDPipe()) householdId: string,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @Body() body: unknown,
  ) {
    return this.shopping.update(user, householdId, itemId, body);
  }

  @Patch('items/:itemId/purchased')
  setPurchased(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId', new ParseUUIDPipe()) householdId: string,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @Body() body: unknown,
  ) {
    return this.shopping.setPurchased(user, householdId, itemId, body);
  }

  @Delete('items/:itemId')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId', new ParseUUIDPipe()) householdId: string,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @Body() body: unknown,
  ) {
    return this.shopping.remove(user, householdId, itemId, body);
  }

  @Post('clear-completed')
  clearCompleted(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId', new ParseUUIDPipe()) householdId: string,
    @Body() body: unknown,
  ) {
    return this.shopping.clearCompleted(user, householdId, body);
  }

  @Post('import-to-inventory')
  importToInventory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId', new ParseUUIDPipe()) householdId: string,
    @Body() body: unknown,
  ) {
    return this.shopping.importToInventory(user, householdId, body);
  }
}
