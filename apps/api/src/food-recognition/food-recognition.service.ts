import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/authenticated-user';
import type { FoodRecognitionProvider } from './food-recognition-provider';
import { normalizeFoodRecognition, validateFoodImage } from './food-recognition-validation';

const USER_REQUEST_LIMIT = 10;
const USER_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_TRACKED_USERS = 10_000;

@Injectable()
export class FoodRecognitionService {
  private readonly requestsByUser = new Map<string, number[]>();

  constructor(private readonly provider: FoodRecognitionProvider) {}

  async analyze(user: AuthenticatedUser, uploadedFile: unknown, signal?: AbortSignal) {
    const image = validateFoodImage(isUpload(uploadedFile) ? uploadedFile : undefined);
    this.consumeRequest(user.id);
    const output = await this.provider.recognizeFood(image, signal);
    return normalizeFoodRecognition(output);
  }

  private consumeRequest(userId: string): void {
    const now = Date.now();
    const recentRequests = (this.requestsByUser.get(userId) ?? []).filter(
      (timestamp) => now - timestamp < USER_WINDOW_MS,
    );
    if (recentRequests.length >= USER_REQUEST_LIMIT) {
      this.requestsByUser.set(userId, recentRequests);
      throw new HttpException(
        'Du har gjort många bildförsök. Försök igen senare.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recentRequests.push(now);
    if (this.requestsByUser.size >= MAX_TRACKED_USERS && !this.requestsByUser.has(userId)) {
      const oldestUserId = this.requestsByUser.keys().next().value;
      if (oldestUserId) this.requestsByUser.delete(oldestUserId);
    }
    this.requestsByUser.set(userId, recentRequests);
  }
}

function isUpload(value: unknown): value is { buffer: Buffer; size: number; mimetype: string } {
  return (
    value !== null &&
    typeof value === 'object' &&
    'buffer' in value &&
    'size' in value &&
    'mimetype' in value
  );
}
