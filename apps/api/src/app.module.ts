import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health.controller';
import { HouseholdsModule } from './households/households.module';
import { InventoryModule } from './inventory/inventory.module';
import { FoodRecognitionModule } from './food-recognition/food-recognition.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuthModule, HouseholdsModule, InventoryModule, FoodRecognitionModule],
  controllers: [HealthController],
})
export class AppModule {}
