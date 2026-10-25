import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { describe, expect, it, vi } from 'vitest';
import { resolveAnalytics } from '../../src/config/analytics';
import {
  classifyPublication,
  isContentPath,
} from '../../scripts/classify-publication.mjs';

const pages = parse(readFileSync('.github/workflows/pages.yml', 'utf8'));
const quality = parse(readFileSync('.github/workflows/quality.yml', 'utf8'));

describe('production publication boundaries', () => {
  it('automates main-branch publication only after the owner enables Pages', () => {
    expect(pages.on.push.branches).toEqual(['main']);
    expect(pages.on.pull_request).toBeUndefined();
    expect(pages.on.workflow_run).toBeUndefined();
    expect(pages.on.workflow_dispatch.inputs.publish.default).toBe(false);
    expect(pages.jobs.deploy.needs).toBe('build');
    expect(pages.jobs.deploy.if).toContain("github.ref == 'refs/heads/main'");
    expect(pages.jobs.deploy.if).toContain(
      "vars.PAGES_DEPLOY_ENABLED == 'true'",
    );
    expect(pages.jobs.deploy.if).toContain(
      "github.event_name == 'push' || inputs.publish",
    );
  });

  it('activates only the owner-authorized production project and retains a deployment kill switch', () => {
    const env = pages.jobs.build.env;
    expect(env.CLARITY_ENABLED).toBe("${{ vars.CLARITY_ENABLED || 'true' }}");
    expect(env.CLARITY_PROJECT_ID).toBe('z26yinj7ob');
    expect(
      resolveAnalytics({
        CLARITY_ENABLED: 'true',
        CLARITY_PROJECT_ID: env.CLARITY_PROJECT_ID,
      }),
    ).toEqual({ enabled: true, projectId: 'z26yinj7ob' });
    expect(
      resolveAnalytics({
        CLARITY_ENABLED: 'false',
        CLARITY_PROJECT_ID: env.CLARITY_PROJECT_ID,
      }),
    ).toEqual({ enabled: false, projectId: '' });
  });

  it('keeps the Quality workflow offline regardless of production analytics configuration', () => {
    expect(quality.jobs.quality.env.CLARITY_ENABLED).toBe('false');
    expect(quality.jobs.quality.env.CLARITY_PROJECT_ID).toBe('');
  });

  it('runs main validation once in Pages while keeping full PR and branch checks', () => {
    expect(quality.on.push['branches-ignore']).toEqual(['main']);
    expect(quality.on.pull_request).toBeNull();
    expect(quality.on.workflow_dispatch).toBeNull();
    const checkout = pages.jobs.build.steps.find((step: { uses?: string }) =>
      step.uses?.startsWith('actions/checkout@'),
    );
    expect(checkout.with['fetch-depth']).toBe(50);
    const scope = pages.jobs.build.steps.find(
      (step: { id?: string }) => step.id === 'scope',
    );
    expect(scope.run).toBe('node scripts/classify-publication.mjs');
    expect(scope.if).toBeUndefined();
  });

  it('installs both locked Playwright Chromium builds on the pre-provisioned Ubuntu runner without apt', () => {
    for (const job of [pages.jobs.build, quality.jobs.quality]) {
      expect(job['runs-on']).toBe('ubuntu-24.04');
      const install = job.steps.find(
        (step: { name?: string }) => step.name === 'Install Chromium',
      );
      expect(install?.run).toBe('npx playwright install chromium');
      expect(job.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH).toBeUndefined();
      expect(
        job.env.PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS,
      ).toBeUndefined();
    }
  });

  it('always validates content, builds and checks browsers before uploading static output', () => {
    const steps = pages.jobs.build.steps;
    const upload = steps.findIndex((step: { uses?: string }) =>
      step.uses?.startsWith('actions/upload-pages-artifact@'),
    );
    expect(upload).toBeGreaterThan(0);
    const commands = steps
      .slice(0, upload)
      .map((step: { run?: string }) => step.run ?? '')
      .join('\n');
    for (const command of [
      'npm ci',
      'npm run check',
      'npm run lint',
      'npm run format:check',
      'npm run test:unit',
      'npm run test:cms',
      'npm run audit',
      'npm run test:base',
      'npm run build',
      'npm run test:e2e',
      'npm run test:analytics',
      'npm run test:lighthouse',
    ]) {
      expect(commands).toContain(command);
    }
    expect(steps[upload].with.path).toBe('dist');
    expect(steps[upload].if).toBeUndefined(); // Default success() must never become always().
    for (const command of [
      'npm ci',
      'npm run audit',
      'npm run content:check',
      'npm run build',
    ]) {
      expect(
        steps.find((step: { run?: string }) => step.run === command).if,
      ).toBe(undefined);
    }
    const contentBrowser = steps.find((step: { run?: string }) =>
      step.run?.includes('npx playwright test tests/e2e/portfolio.spec.ts'),
    );
    expect(contentBrowser.if).toBe("steps.scope.outputs.mode == 'content'");
    for (const command of [
      'npm run check',
      'npm run lint',
      'npm run format:check',
      'npm run test:unit',
      'npm run test:cms',
      'npm run test:base',
      'npm run test:e2e',
      'npm run test:analytics',
      'npm run test:lighthouse',
    ]) {
      expect(
        steps.find((step: { run?: string }) => step.run === command).if,
      ).toBe("steps.scope.outputs.mode != 'content'");
    }
    const explanation = steps.find(
      (step: { name?: string }) => step.name === 'Explain rejected CMS content',
    );
    expect(explanation.if).toBe(
      "failure() && steps.content.outcome == 'failure'",
    );
    const summary = steps.at(-1);
    expect(summary.if).toBe('always()');
    expect(summary.env.VALIDATION_RESULT).toBe('${{ job.status }}');
  });

  it('limits privileges, pins actions and refuses stale artifacts', () => {
    expect(pages.permissions).toEqual({ contents: 'read' });
    expect(pages.jobs.build.permissions).toEqual({
      contents: 'read',
      actions: 'read',
    });
    expect(pages.jobs.deploy.permissions).toEqual({
      contents: 'read',
      pages: 'write',
      'id-token': 'write',
    });
    expect(pages.concurrency).toEqual({
      group: 'pages-production',
      'cancel-in-progress': true,
    });
    const deploymentSteps = pages.jobs.deploy.steps;
    expect(deploymentSteps[0].run).toContain(
      'ref.object?.sha !== process.env.GITHUB_SHA',
    );
    expect(deploymentSteps[0].run).toContain('/git/ref/heads/main');
    for (const workflow of [pages, quality]) {
      for (const job of Object.values(workflow.jobs) as {
        steps: { uses?: string; with?: Record<string, unknown> }[];
      }[]) {
        for (const step of job.steps) {
          if (step.uses)
            expect(step.uses).toMatch(/^actions\/[a-z-]+@[a-f0-9]{40}$/);
          if (step.uses?.startsWith('actions/checkout@'))
            expect(step.with?.['persist-credentials']).toBe(false);
        }
      }
    }
  });
});

describe('content publication certification boundary', () => {
  const sha = 'a'.repeat(40);
  const baseline = {
    conclusion: 'success',
    status: 'completed',
    event: 'push',
    head_branch: 'main',
    head_sha: sha,
    path: '.github/workflows/pages.yml',
  };
  const request = () =>
    vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ workflow_runs: [baseline] })),
      );
  const options = () => ({
    event: 'push',
    ref: 'refs/heads/main',
    repository: 'Amarok90/folio',
    token: 'isolated-test-token',
    request: request(),
    git: vi.fn<(args: string[]) => string>((args) =>
      args[0] === 'diff' ? 'src/content/skills.json\0' : '',
    ),
  });

  it.each([
    'src/data/profile.json',
    'src/content/skills.json',
    'src/assets/owner/portrait.JpEg',
    'src/assets/new-image.avif',
    'public/documents/updated-cv.PDF',
  ])('allows governed content and supported uploads: %s', (path) => {
    expect(isContentPath(path)).toBe(true);
  });

  it.each([
    'src/data/new-authority.json',
    'src/lib/content.ts',
    'src/assets/fonts/signature.woff2',
    'src/assets/code.js',
    'src/assets/icon.svg',
    'src/assets/../lib/content.ts',
    'public/documents/invoice.html',
    '.github/workflows/pages.yml',
    '.pages.yml',
    'package-lock.json',
  ])('requires full validation outside the content allowlist: %s', (path) => {
    expect(isContentPath(path)).toBe(false);
  });

  it('compares the complete tree against a successful push build and verifies ancestry', async () => {
    const input = options();
    expect((await classifyPublication(input)).mode).toBe('content');
    expect(input.request.mock.calls[0]?.[0]).toContain(
      'event=push&status=success',
    );
    expect(input.git.mock.calls).toEqual([
      [['merge-base', '--is-ancestor', sha, 'HEAD']],
      [['diff', '--name-only', '--no-renames', '-z', sha, 'HEAD', '--']],
    ]);
  });

  it('cannot bypass failed code changes with a later content-only save', async () => {
    const input = options();
    input.git.mockImplementation((args) =>
      args[0] === 'diff' ? 'src/lib/content.ts\0src/content/skills.json\0' : '',
    );
    expect((await classifyPublication(input)).mode).toBe('full');
  });

  it('requires full validation when no changes can establish a content update', async () => {
    const input = options();
    input.git.mockReturnValue('');
    expect((await classifyPublication(input)).mode).toBe('full');
  });

  it('classifies deleted files too, leaving missing media to mandatory content validation', async () => {
    const input = options();
    input.git.mockImplementation((args) =>
      args[0] === 'diff' ? 'src/assets/deleted-portrait.png\0' : '',
    );
    expect((await classifyPublication(input)).mode).toBe('content');
    input.git.mockImplementation((args) =>
      args[0] === 'diff' ? 'src/components/DeletedComponent.astro\0' : '',
    );
    expect((await classifyPublication(input)).mode).toBe('full');
  });

  it.each([
    { event: 'workflow_dispatch' },
    { ref: 'refs/heads/unrelated' },
    { token: '' },
    { repository: '' },
  ])('keeps uncertain or manual scope full: %j', async (override) => {
    const input = { ...options(), ...override };
    expect((await classifyPublication(input)).mode).toBe('full');
    expect(input.request).not.toHaveBeenCalled();
  });

  it('fails closed on API errors, absent or malformed baseline, or broken history', async () => {
    for (const response of [
      new Response('', { status: 403 }),
      new Response('{}'),
      new Response('invalid-json'),
      new Response(
        JSON.stringify({
          workflow_runs: [{ ...baseline, conclusion: 'failure' }],
        }),
      ),
      new Response(
        JSON.stringify({ workflow_runs: [{ ...baseline, head_sha: '--bad' }] }),
      ),
    ]) {
      const input = options();
      input.request.mockResolvedValue(response);
      expect((await classifyPublication(input)).mode).toBe('full');
      expect(input.git).not.toHaveBeenCalled();
    }
    const input = options();
    input.git.mockImplementation(() => {
      throw new Error(
        'History missing or successful build is not an ancestor.',
      );
    });
    expect((await classifyPublication(input)).mode).toBe('full');
    const networkFailure = options();
    networkFailure.request.mockRejectedValue(
      new Error('Connection unavailable.'),
    );
    expect((await classifyPublication(networkFailure)).mode).toBe('full');
    expect(networkFailure.git).not.toHaveBeenCalled();
  });
});
