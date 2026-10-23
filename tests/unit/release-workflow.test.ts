import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

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

  it('keeps Clarity inactive in both CI and production regardless of repository variables', () => {
    for (const job of [pages.jobs.build, quality.jobs.quality]) {
      expect(job.env.CLARITY_ENABLED).toBe('false');
      expect(job.env.CLARITY_PROJECT_ID).toBe('');
    }
  });

  it('uploads only static output after all required validation and browser gates', () => {
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
  });

  it('limits privileges, pins actions and refuses stale artifacts', () => {
    expect(pages.permissions).toEqual({ contents: 'read' });
    expect(pages.jobs.build.permissions).toEqual({ contents: 'read' });
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
