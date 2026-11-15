import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { HouseholdsController } from './households.controller';
import { HouseholdsService } from './households.service';
import { HouseholdInvitationsService } from './household-invitations.service';

@Module({
  imports: [AuthModule],
  controllers: [HouseholdsController],
  providers: [HouseholdsService, HouseholdInvitationsService],
  exports: [HouseholdsService],
})
export class HouseholdsModule {}
