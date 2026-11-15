import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health.controller';
import { HouseholdsModule } from './households/households.module';
import { InventoryModule } from './inventory/inventory.module';
import { PrismaModule } from './prisma/prisma.module';
import { RecipesModule } from './recipes/recipes.module';
import { ShoppingModule } from './shopping/shopping.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    HouseholdsModule,
    InventoryModule,
    RecipesModule,
    ShoppingModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
