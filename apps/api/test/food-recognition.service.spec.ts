import { HttpException } from '@nestjs/common';
import { FoodRecognitionService } from '../src/food-recognition/food-recognition.service';

const onePixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/cWQAAAAASUVORK5CYII=',
  'base64',
);
const user = { id: 'supabase-user-id', email: 'anna@example.com' };
const file = { buffer: onePixelPng, size: onePixelPng.length, mimetype: 'image/png' };

describe('FoodRecognitionService', () => {
  it('sends a valid image to the provider and returns normalized proposals only', async () => {
    const provider = {
      recognizeFood: jest.fn().mockResolvedValue({
        items: [{ name: 'Ägg', quantity: 6, unit: 'st', description: null, confidence: 'MEDIUM' }],
      }),
    };
    const service = new FoodRecognitionService(provider);

    await expect(service.analyze(user, file)).resolves.toMatchObject({
      items: [{ name: 'Ägg', quantity: 6, needsReview: true }],
    });
    expect(provider.recognizeFood).toHaveBeenCalledWith(
      { bytes: onePixelPng, mimeType: 'image/png' },
      undefined,
    );
  });

  it('limits repeated recognition requests per authenticated user', async () => {
    const provider = { recognizeFood: jest.fn().mockResolvedValue({ items: [] }) };
    const service = new FoodRecognitionService(provider);
    for (let attempt = 0; attempt < 10; attempt += 1) await service.analyze(user, file);

    await expect(service.analyze(user, file)).rejects.toBeInstanceOf(HttpException);
    expect(provider.recognizeFood).toHaveBeenCalledTimes(10);
  });

  it('does not call the provider for invalid images', async () => {
    const provider = { recognizeFood: jest.fn() };
    const service = new FoodRecognitionService(provider);

    await expect(service.analyze(user, { ...file, mimetype: 'image/jpeg' })).rejects.toThrow();
    expect(provider.recognizeFood).not.toHaveBeenCalled();
  });
});
