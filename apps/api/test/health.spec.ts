import { HealthController } from '../src/health.controller';

describe('HealthController', () => {
  it('returns a healthy response', () => {
    expect(new HealthController().status()).toEqual({ status: 'ok' });
  });
});
