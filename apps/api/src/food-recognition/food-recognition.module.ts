import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CloudflareFoodRecognitionProvider } from './cloudflare-food-recognition.provider';
import { FoodRecognitionController } from './food-recognition.controller';
import { FoodRecognitionService } from './food-recognition.service';

@Module({
  imports: [AuthModule],
  controllers: [FoodRecognitionController],
  providers: [
    CloudflareFoodRecognitionProvider,
    {
      provide: 'FOOD_RECOGNITION_PROVIDER',
      useExisting: CloudflareFoodRecognitionProvider,
    },
    {
      provide: FoodRecognitionService,
      useFactory: (provider: CloudflareFoodRecognitionProvider) =>
        new FoodRecognitionService(provider),
      inject: ['FOOD_RECOGNITION_PROVIDER'],
    },
  ],
})
export class FoodRecognitionModule {}
