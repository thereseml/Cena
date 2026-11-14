import type { FoodRecognitionResult } from '@cena/contracts';
import { File } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';
import { analyzeFoodPhoto } from '../features/food-recognition/food-recognition-api';
import { apiRequest } from '../lib/api';

jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation((uri: string) => ({ uri, type: 'image/jpeg' })),
}));
jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));
jest.mock('../lib/api', () => ({ apiRequest: jest.fn() }));

const fileMock = jest.mocked(File);
const expoFetchMock = jest.mocked(expoFetch);
const apiRequestMock = jest.mocked(apiRequest);
const NativeFormData = global.FormData;

class MockFormData {
  append = jest.fn();
}

describe('food recognition photo transport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.FormData = MockFormData as unknown as typeof FormData;
    apiRequestMock.mockResolvedValue({ items: [] } as FoodRecognitionResult);
  });

  afterAll(() => {
    global.FormData = NativeFormData;
  });

  it('wraps the optimized URI in an Expo File and uses expo/fetch for multipart upload', async () => {
    const signal = new AbortController().signal;
    await expect(
      analyzeFoodPhoto({ uri: 'file:///cache/cena-photo.jpg' }, signal),
    ).resolves.toEqual({ items: [] });

    expect(fileMock).toHaveBeenCalledWith('file:///cache/cena-photo.jpg');
    const request = apiRequestMock.mock.calls[0];
    expect(request[0]).toBe('food-recognition/analyze');
    expect(request[1]).toMatchObject({ method: 'POST', signal });
    expect(request[1]?.body).toBeInstanceOf(MockFormData);
    expect((request[1]?.body as unknown as MockFormData).append).toHaveBeenCalledWith(
      'image',
      expect.objectContaining({ uri: 'file:///cache/cena-photo.jpg' }),
    );
    expect(request[2]).toBe(expoFetchMock);
  });
});
