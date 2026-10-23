import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  findSupportedNode,
  localEnvironment,
  runLocalWorkflow,
} from '../../scripts/local-workflow.mjs';

const directories: string[] = [];
function temporaryHome() {
  const directory = mkdtempSync(join(tmpdir(), 'folio-runtime-'));
  directories.push(directory);
  return directory;
}
function nodeStub(path: string, version: string) {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, `#!/bin/sh\nprintf '${version}\\n'\n`, { mode: 0o755 });
  return path;
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('local runtime resolution', () => {
  it('keeps an already supported current Node without depending on a version manager', () => {
    const home = temporaryHome();
    const current = nodeStub(join(home, 'current/node'), 'v24.0.0');
    expect(
      findSupportedNode({ currentNode: current, homeDirectory: home, env: {} }),
    ).toBe(current);
  });

  it('finds the newest installed stable nvm Node 24 when the shell still uses Node 22', () => {
    const home = temporaryHome();
    const current = nodeStub(join(home, 'current/node'), 'v22.18.0');
    nodeStub(join(home, '.nvm/versions/node/v24.9.0/bin/node'), 'v24.9.0');
    const latest = nodeStub(
      join(home, '.nvm/versions/node/v24.19.0/bin/node'),
      'v24.19.0',
    );
    nodeStub(join(home, '.nvm/versions/node/v25.0.0/bin/node'), 'v25.0.0');
    expect(
      findSupportedNode({ currentNode: current, homeDirectory: home, env: {} }),
    ).toBe(latest);
  });

  it('honors an explicit compatible runtime and rejects an incompatible override', () => {
    const home = temporaryHome();
    const supported = nodeStub(join(home, 'node24/node'), 'v24.19.0');
    const unsupported = nodeStub(join(home, 'node22/node'), 'v22.18.0');
    expect(findSupportedNode({ env: { FOLIO_NODE: supported } })).toBe(
      supported,
    );
    expect(() =>
      findSupportedNode({ env: { FOLIO_NODE: unsupported } }),
    ).toThrow('FOLIO_NODE');
    expect(() => findSupportedNode({ env: { FOLIO_NODE: 'node' } })).toThrow(
      'absolute path',
    );
  });
});

describe('local workflow boundaries', () => {
  it('overrides inherited launch and analytics flags while using the selected runtime for npm', () => {
    const environment = localEnvironment('/installed/node24/bin/node', {
      PATH: '/system/bin',
      SITE_URL: 'https://wrong.example',
      BASE_PATH: '/',
      SITE_INDEXABLE: 'true',
      CLARITY_ENABLED: 'true',
      CLARITY_PROJECT_ID: 'private-id',
    });
    expect(environment.PATH).toBe('/installed/node24/bin:/system/bin');
    expect(environment.SITE_URL).toBe('https://amarok90.github.io');
    expect(environment.BASE_PATH).toBe('/folio/');
    expect(environment.SITE_INDEXABLE).toBe('false');
    expect(environment.CLARITY_ENABLED).toBe('false');
    expect(environment.CLARITY_PROJECT_ID).toBe('');
  });

  it('launches only foreground loopback servers and builds before previewing', () => {
    const home = temporaryHome();
    const node = nodeStub(join(home, 'bin/node'), 'v24.19.0');
    const capture = join(home, 'commands');
    writeFileSync(
      join(home, 'bin/npm'),
      '#!/bin/sh\nprintf "COMMAND\\n" >> "$FOLIO_TEST_CAPTURE"\nprintf "%s\\n" "$@" >> "$FOLIO_TEST_CAPTURE"\n',
      { mode: 0o755 },
    );
    vi.stubEnv('FOLIO_NODE', node);
    vi.stubEnv('FOLIO_TEST_CAPTURE', capture);
    vi.stubEnv('FOLIO_PORT', '5189');
    vi.spyOn(console, 'log').mockImplementation(() => {});

    expect(runLocalWorkflow('run')).toBe(0);
    expect(readFileSync(capture, 'utf8')).toContain(
      'dev\n--\n--host\n127.0.0.1\n--port\n5189\n--ignore-lock',
    );
    writeFileSync(capture, '');
    expect(runLocalWorkflow('preview')).toBe(0);
    const preview = readFileSync(capture, 'utf8');
    expect(preview.indexOf('build')).toBeLessThan(preview.indexOf('preview'));
    expect(preview).toContain('--ignore-lock');
  });
});
