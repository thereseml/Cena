jest.mock('dotenv/config', () => ({}));
jest.mock('prisma/config', () => ({ defineConfig: jest.fn((config: unknown) => config) }));

const LOCAL_URL = 'postgresql://postgres@127.0.0.1:55439/cena_recipes_test';
const REMOTE_URL = 'postgresql://prisma-guard@example.invalid/cena_guard_test';

function loadConfig(): { datasource: { url: string } } {
  let config: { datasource: { url: string } } | undefined;
  jest.isolateModules(() => {
    config = jest.requireActual<{ default: { datasource: { url: string } } }>(
      '../prisma.config',
    ).default;
  });
  if (!config) throw new Error('Config was not loaded');
  return config;
}

describe('Prisma local-only configuration guard (offline)', () => {
  const original = {
    PRISMA_LOCAL_ONLY: process.env.PRISMA_LOCAL_ONLY,
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_DATABASE_URL: process.env.DIRECT_DATABASE_URL,
  };

  beforeEach(() => {
    process.env.PRISMA_LOCAL_ONLY = '1';
    process.env.DATABASE_URL = LOCAL_URL;
    delete process.env.DIRECT_DATABASE_URL;
    jest.clearAllMocks();
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    jest.restoreAllMocks();
  });

  it('refuses a remote direct URL despite a local runtime URL before passing configuration to Prisma', () => {
    process.env.DIRECT_DATABASE_URL = REMOTE_URL;
    const defineConfig = jest.fn((config: unknown) => config);
    jest.doMock('prisma/config', () => ({ defineConfig }));
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(loadConfig).toThrow(
      'Local-only Prisma command refused a non-loopback database target. Set both database URLs explicitly.',
    );
    expect(defineConfig).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('refuses a remote runtime fallback when the direct URL is absent', () => {
    process.env.DATABASE_URL = REMOTE_URL;
    expect(loadConfig).toThrow('Local-only Prisma command refused a non-loopback database target');
  });

  it.each(['localhost', '127.0.0.1', '[::1]'])(
    'accepts explicit loopback URLs using %s without connecting',
    (host) => {
      const directUrl = `postgresql://postgres@${host}:55439/cena_recipes_test`;
      process.env.DIRECT_DATABASE_URL = directUrl;
      expect(loadConfig().datasource.url).toBe(directUrl);
    },
  );

  it('uses the explicit local runtime URL when no direct URL is configured', () => {
    expect(loadConfig().datasource.url).toBe(LOCAL_URL);
  });
});
