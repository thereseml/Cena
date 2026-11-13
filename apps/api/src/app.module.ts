import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health.controller';
import { HouseholdsModule } from './households/households.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuthModule, HouseholdsModule],
  controllers: [HealthController],
})
export class AppModule {}
