import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { HouseholdsModule } from '../households/households.module';
import { InventoryModule } from '../inventory/inventory.module';
import { RecipesModule } from '../recipes/recipes.module';
import { ShoppingController } from './shopping.controller';
import { ShoppingService } from './shopping.service';

@Module({
  imports: [AuthModule, HouseholdsModule, InventoryModule, RecipesModule],
  controllers: [ShoppingController],
  providers: [ShoppingService],
})
export class ShoppingModule {}
