import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const requiredMajor = Number(readFileSync(join(root, '.nvmrc'), 'utf8').trim());

/** @param {string} binary */
function nodeVersion(binary) {
  const result = spawnSync(binary, ['--version'], {
    encoding: 'utf8',
    timeout: 5000,
  });
  return result.status === 0 ? result.stdout.trim() : undefined;
}

/**
 * Read installed runtimes only. No shell profiles, downloads, or installation.
 * @param {{ env?: NodeJS.ProcessEnv; currentNode?: string; homeDirectory?: string }} options
 */
export function findSupportedNode({
  env = process.env,
  currentNode = process.execPath,
  homeDirectory = homedir(),
} = {}) {
  const supports = (/** @type {string | undefined} */ version) =>
    Boolean(version?.match(new RegExp(`^v${requiredMajor}\\.\\d+\\.\\d+$`)));
  if (env.FOLIO_NODE) {
    if (!isAbsolute(env.FOLIO_NODE) || !supports(nodeVersion(env.FOLIO_NODE))) {
      throw new Error(
        `FOLIO_NODE must be an absolute path to a supported Node.js ${requiredMajor} binary.`,
      );
    }
    return env.FOLIO_NODE;
  }
  if (supports(nodeVersion(currentNode))) return currentNode;

  const nvmVersions = join(
    env.NVM_DIR || join(homeDirectory, '.nvm'),
    'versions/node',
  );
  const installed = existsSync(nvmVersions)
    ? readdirSync(nvmVersions)
        .filter((version) => supports(version))
        .sort((left, right) =>
          right.localeCompare(left, 'en', { numeric: true }),
        )
        .map((version) => join(nvmVersions, version, 'bin/node'))
    : [];
  const candidates = [
    ...installed,
    `/opt/homebrew/opt/node@${requiredMajor}/bin/node`,
    `/usr/local/opt/node@${requiredMajor}/bin/node`,
  ];
  const selected = candidates.find((binary) => supports(nodeVersion(binary)));
  if (selected) return selected;
  throw new Error(
    `FOLIO needs Node.js ${requiredMajor} from .nvmrc. Current Node: ${nodeVersion(currentNode) ?? 'unavailable'}. Run "nvm install && nvm use", or set FOLIO_NODE=/absolute/path/to/node. No runtime was installed automatically.`,
  );
}

/** @param {string} node @param {NodeJS.ProcessEnv} source */
export function localEnvironment(node, source = process.env) {
  return {
    ...source,
    PATH: `${dirname(node)}${process.platform === 'win32' ? ';' : ':'}${source.PATH ?? ''}`,
    ASTRO_TELEMETRY_DISABLED: '1',
    SITE_URL: 'https://amarok90.github.io',
    BASE_PATH: '/folio/',
    SITE_INDEXABLE: 'false',
    CLARITY_ENABLED: 'false',
    CLARITY_PROJECT_ID: '',
  };
}

/** @param {string | undefined} action */
export function runLocalWorkflow(action) {
  if (!['run', 'check', 'build', 'preview'].includes(action ?? '')) {
    throw new Error(
      'Use make folio.run, folio.check, folio.build, or folio.preview.',
    );
  }
  const node = findSupportedNode();
  const env = localEnvironment(node);
  // A quality check must test its own production preview, never reuse a dev server.
  if (action === 'check') env.CI = 'true';
  if (!existsSync(join(root, 'node_modules/astro/package.json'))) {
    throw new Error('Dependencies are missing. Run "nvm use && npm ci" first.');
  }
  const port = process.env.FOLIO_PORT ?? '4321';
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
    throw new Error('FOLIO_PORT must be an integer between 1 and 65535.');
  }
  console.log(
    `FOLIO: ${action} · Node ${nodeVersion(node)} · Clarity disabled`,
  );

  // Astro 7 may auto-background when an agent is detected; this flag keeps both servers attached.
  const serverArguments = [
    '--',
    '--host',
    '127.0.0.1',
    '--port',
    port,
    '--ignore-lock',
  ];
  const workflows = {
    run: [['dev', ...serverArguments]],
    check: [['validate']],
    build: [['build']],
    preview: [['build'], ['preview', ...serverArguments]],
  };
  if (action === 'run' || action === 'preview') {
    console.log(`Local URL: http://127.0.0.1:${port}/folio/ (Ctrl+C to stop)`);
  }
  for (const task of workflows[action]) {
    const result = spawnSync('npm', ['run', ...task], {
      cwd: root,
      env,
      stdio: 'inherit',
    });
    if (result.error)
      throw new Error(`Cannot run npm: ${result.error.message}`);
    if (result.status !== 0) {
      return result.status ?? (result.signal === 'SIGINT' ? 130 : 1);
    }
  }
  return 0;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    process.exitCode = runLocalWorkflow(process.argv[2]);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
