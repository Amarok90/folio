import { defineConfig, devices } from '@playwright/test';

export function createE2EConfig(env: NodeJS.ProcessEnv = process.env) {
  const liveURL = env['FOLIO_E2E_URL'];
  if (liveURL !== undefined) {
    let parsed: URL;
    try {
      parsed = new URL(liveURL);
    } catch {
      throw new Error(
        'FOLIO_E2E_URL must be an absolute HTTPS URL ending in /, without credentials, query or fragment.',
      );
    }
    if (
      !liveURL.startsWith('https://') ||
      !liveURL.endsWith('/') ||
      /[\s\\]/.test(liveURL) ||
      parsed.protocol !== 'https:' ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash
    ) {
      throw new Error(
        'FOLIO_E2E_URL must be an absolute HTTPS URL ending in /, without credentials, query or fragment.',
      );
    }
  }
  const basePath = `/${(env['BASE_PATH'] ?? '').replace(/^\/+|\/+$/g, '')}`;
  const previewURL = `http://127.0.0.1:4321${basePath === '/' ? '/' : `${basePath}/`}`;
  const executablePath = env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'];
  const isCI = Boolean(env['CI']);

  return defineConfig({
    testDir: './tests/e2e',
    // The other suite builds isolated CMS fixtures; those are never live-host evidence.
    ...(liveURL ? { testMatch: '**/portfolio.spec.ts' } : {}),
    fullyParallel: true,
    forbidOnly: isCI,
    retries: isCI ? 1 : 0,
    ...(isCI ? { workers: 2 } : {}),
    reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'list',
    use: {
      baseURL: liveURL ?? previewURL,
      trace: 'retain-on-failure',
      screenshot: 'only-on-failure',
    },
    projects: [
      {
        name: 'chromium',
        use: {
          ...devices['Desktop Chrome'],
          ...(executablePath ? { launchOptions: { executablePath } } : {}),
        },
      },
    ],
    ...(!liveURL
      ? {
          webServer: {
            command:
              'npm run preview -- --host 127.0.0.1 --port 4321 --ignore-lock',
            url: previewURL,
            reuseExistingServer: !isCI,
            timeout: 30_000,
          },
        }
      : {}),
  });
}

export default createE2EConfig();
