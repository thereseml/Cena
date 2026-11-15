import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { SupabaseJwtGuard } from '../auth/supabase-jwt.guard';
import { HouseholdsService } from './households.service';
import { HouseholdInvitationsService } from './household-invitations.service';

@Controller('api/v1')
@UseGuards(SupabaseJwtGuard)
export class HouseholdsController {
  constructor(
    private readonly households: HouseholdsService,
    private readonly invitations: HouseholdInvitationsService,
  ) {}

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

  @Post('households')
  createHousehold(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const name = body && typeof body === 'object' && 'name' in body ? body.name : undefined;
    if (name !== undefined && typeof name !== 'string') {
      throw new BadRequestException('Ange ett giltigt hushållsnamn.');
    }
    return this.households.createHousehold(user.id, name ?? 'Mitt hushåll');
  }

  @Get('households/:id/members')
  listMembers(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) householdId: string,
  ) {
    return this.households.listMembers(user.id, householdId);
  }

  @Post('households/:id/invitations')
  createInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) householdId: string,
  ) {
    return this.invitations.create(user.id, householdId);
  }

  @Get('households/:id/invitations')
  listInvitations(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) householdId: string,
  ) {
    return this.invitations.list(user.id, householdId);
  }

  @Delete('households/:id/invitations/:invitationId')
  revokeInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) householdId: string,
    @Param('invitationId', new ParseUUIDPipe()) invitationId: string,
  ) {
    return this.invitations.revoke(user.id, householdId, invitationId);
  }

  @Post('household-invitations/preview')
  previewInvitation(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const token = body && typeof body === 'object' && 'token' in body ? body.token : undefined;
    return this.invitations.preview(user.id, typeof token === 'string' ? token : '');
  }

  @Post('household-invitations/accept')
  acceptInvitation(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const token = body && typeof body === 'object' && 'token' in body ? body.token : undefined;
    return this.invitations.accept(user.id, typeof token === 'string' ? token : '');
  }

  @Post('households/:id/leave')
  leaveHousehold(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) householdId: string,
  ) {
    return this.households.leaveHousehold(user.id, householdId);
  }
}
