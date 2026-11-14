export interface FoodImageInput {
  bytes: Buffer;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface FoodRecognitionProvider {
  recognizeFood(image: FoodImageInput, signal?: AbortSignal): Promise<unknown>;
}
