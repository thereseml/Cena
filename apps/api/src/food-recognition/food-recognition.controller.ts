import {
  Controller,
  BadRequestException,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { SupabaseJwtGuard } from '../auth/supabase-jwt.guard';
import { HARD_MAX_IMAGE_BYTES } from './food-recognition-validation';
import { FoodRecognitionService } from './food-recognition.service';
import type { ServerResponse } from 'node:http';

interface UploadedFoodImage {
  buffer: Buffer;
  size: number;
  mimetype: string;
}

const ALLOWED_DECLARED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Controller('api/v1/food-recognition')
@UseGuards(SupabaseJwtGuard)
export class FoodRecognitionController {
  constructor(private readonly recognition: FoodRecognitionService) {}

  @Post('analyze')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: HARD_MAX_IMAGE_BYTES, files: 1, fields: 0 },
      fileFilter: (_request, file, callback) => {
        if (!ALLOWED_DECLARED_MIME_TYPES.has(file.mimetype)) {
          callback(new BadRequestException('Välj en JPEG-, PNG- eller WebP-bild.'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  async analyze(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: UploadedFoodImage | undefined,
    @Res({ passthrough: true }) response: ServerResponse,
  ) {
    const abortController = new AbortController();
    const abortWhenDisconnected = () => {
      if (!response.writableEnded) abortController.abort();
    };
    response.on('close', abortWhenDisconnected);
    try {
      return await this.recognition.analyze(user, file, abortController.signal);
    } finally {
      response.off('close', abortWhenDisconnected);
    }
  }
}
