import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { SupabaseJwtGuard } from '../auth/supabase-jwt.guard';
import { RecipesService } from './recipes.service';

@Controller('api/v1/recipes')
@UseGuards(SupabaseJwtGuard)
export class RecipesController {
  constructor(private readonly recipes: RecipesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: unknown) {
    return this.recipes.list(user, query);
  }

  @Get('recommendations')
  recommendations(@CurrentUser() user: AuthenticatedUser, @Query() query: unknown) {
    return this.recipes.list(user, query, true);
  }

  @Get(':id')
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: unknown,
  ) {
    return this.recipes.get(user, id, query);
  }
}
