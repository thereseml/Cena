import { BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import {
  normalizeFoodRecognition,
  validateFoodImage,
} from '../src/food-recognition/food-recognition-validation';

const onePixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/cWQAAAAASUVORK5CYII=',
  'base64',
);

describe('validateFoodImage', () => {
  it('accepts a PNG based on its bytes and dimensions, not only its MIME header', () => {
    expect(
      validateFoodImage({
        buffer: onePixelPng,
        size: onePixelPng.byteLength,
        mimetype: 'image/png',
      }),
    ).toMatchObject({ mimeType: 'image/png' });
  });

  it('rejects missing, oversized, mismatched, and malformed files', () => {
    expect(() => validateFoodImage(undefined)).toThrow(BadRequestException);
    expect(() =>
      validateFoodImage({ buffer: onePixelPng, size: 6 * 1024 * 1024, mimetype: 'image/png' }),
    ).toThrow(BadRequestException);
    expect(() =>
      validateFoodImage({ buffer: onePixelPng, size: onePixelPng.length, mimetype: 'image/jpeg' }),
    ).toThrow(BadRequestException);
    expect(() =>
      validateFoodImage({ buffer: Buffer.from('not an image'), size: 12, mimetype: 'image/png' }),
    ).toThrow(BadRequestException);
  });

  it('rejects images above the pixel limit even when the file itself is small', () => {
    const highResolutionHeader = Buffer.from(onePixelPng);
    highResolutionHeader.writeUInt32BE(5000, 16);
    highResolutionHeader.writeUInt32BE(5000, 20);
    expect(() =>
      validateFoodImage({
        buffer: highResolutionHeader,
        size: highResolutionHeader.length,
        mimetype: 'image/png',
      }),
    ).toThrow(BadRequestException);
  });
});

describe('normalizeFoodRecognition', () => {
  it('normalizes multiple items, nulls unsupported quantities, and removes exact duplicates', () => {
    const result = normalizeFoodRecognition({
      items: [
        { name: ' Tomater ', quantity: 3, unit: 'st', description: null, confidence: 'HIGH' },
        { name: 'Tomater', quantity: 3, unit: 'st', description: null, confidence: 'HIGH' },
        { name: 'Mjölk', quantity: -1, unit: 'cups', description: ' Arla ', confidence: 'MAYBE' },
        { name: 'Krydda', quantity: 1e-7, unit: 'g', description: null, confidence: 'HIGH' },
      ],
    });

    expect(result.items).toHaveLength(3);
    expect(result.items[0]).toMatchObject({
      name: 'Tomater',
      quantity: 3,
      unit: 'st',
      confidence: 'HIGH',
      needsReview: true,
    });
    expect(result.items[1]).toMatchObject({
      name: 'Mjölk',
      quantity: null,
      unit: null,
      description: 'Arla',
      confidence: 'LOW',
      needsReview: true,
    });
    expect(result.items[2]).toMatchObject({ name: 'Krydda', quantity: null, unit: 'g' });
  });

  it('returns an empty result when no visible food was found', () => {
    expect(normalizeFoodRecognition({ items: [] })).toEqual({ items: [] });
  });

  it('rejects malformed or unbounded provider responses', () => {
    expect(() => normalizeFoodRecognition('not json')).toThrow(UnprocessableEntityException);
    expect(() => normalizeFoodRecognition({ items: Array(31).fill({ name: 'Mat' }) })).toThrow(
      UnprocessableEntityException,
    );
  });
});
