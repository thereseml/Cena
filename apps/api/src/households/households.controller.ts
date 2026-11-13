import { Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { SupabaseJwtGuard } from '../auth/supabase-jwt.guard';
import { HouseholdsService } from './households.service';

@Controller('api/v1')
@UseGuards(SupabaseJwtGuard)
export class HouseholdsController {
  constructor(private readonly households: HouseholdsService) {}

  @Post('me/bootstrap')
  bootstrap(@CurrentUser() user: AuthenticatedUser) {
    return this.households.bootstrap(user);
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.households.getForUser(user.id);
  }

  @Get('households')
  listHouseholds(@CurrentUser() user: AuthenticatedUser) {
    return this.households.listForUser(user.id);
  }

  @Get('households/:id')
  getHousehold(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) householdId: string,
  ) {
    return this.households.getHouseholdForUser(user.id, householdId);
  }
}
