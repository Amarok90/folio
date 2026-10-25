import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const contentFiles = new Set([
  'src/data/profile.json',
  'src/data/interface.json',
  'src/data/media.json',
  'src/content/professional-highlights.json',
  'src/content/expertise.json',
  'src/content/skills.json',
  'src/content/case-studies.json',
  'src/content/experience.json',
  'src/content/education.json',
  'src/content/languages.json',
]);

export function isContentPath(path) {
  return (
    contentFiles.has(path) ||
    /^src\/assets\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.(?:png|jpe?g|webp|avif)$/i.test(
      path,
    ) ||
    /^public\/documents\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.pdf$/i.test(path)
  );
}

/** Compare with a successful build, never merely the previous (possibly broken) push. */
export async function classifyPublication({
  event,
  ref,
  repository,
  token,
  apiURL = 'https://api.github.com',
  request = globalThis.fetch,
  git = (args) => execFileSync('git', args, { encoding: 'utf8' }),
}) {
  const full = (reason) => ({ mode: 'full', reason });
  if (event !== 'push' || ref !== 'refs/heads/main')
    return full('Manual and non-production runs require complete validation.');
  if (!token || !/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i.test(repository ?? ''))
    return full('A trusted successful-build baseline is unavailable.');
  try {
    const response = await request(
      `${apiURL}/repos/${repository}/actions/workflows/pages.yml/runs?branch=main&event=push&status=success&per_page=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        signal: globalThis.AbortSignal.timeout(10_000),
      },
    );
    if (!response.ok) return full('Successful-build lookup was unavailable.');
    const result = await response.json();
    const baseline = result.workflow_runs?.[0];
    if (
      baseline?.conclusion !== 'success' ||
      baseline.status !== 'completed' ||
      baseline.event !== 'push' ||
      baseline.head_branch !== 'main' ||
      baseline.path !== '.github/workflows/pages.yml' ||
      !/^[a-f0-9]{40}$/.test(baseline.head_sha ?? '')
    )
      return full('No verified production-build baseline was found.');
    git(['merge-base', '--is-ancestor', baseline.head_sha, 'HEAD']);
    const paths = git([
      'diff',
      '--name-only',
      '--no-renames',
      '-z',
      baseline.head_sha,
      'HEAD',
      '--',
    ])
      .split('\0')
      .filter(Boolean);
    if (paths.length === 0 || !paths.every(isContentPath))
      return full('Source or configuration differs from the successful build.');
    return {
      mode: 'content',
      reason:
        'Only canonical content and media differ from the successful build.',
    };
  } catch {
    // An API, ancestry, history or parsing uncertainty must retain every gate.
    return full('The successful-build comparison could not be established.');
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const result = await classifyPublication({
    event: process.env.GITHUB_EVENT_NAME,
    ref: process.env.GITHUB_REF,
    repository: process.env.GITHUB_REPOSITORY,
    token: process.env.GH_TOKEN,
    apiURL: process.env.GITHUB_API_URL,
  });
  console.log(`Publication validation: ${result.mode}. ${result.reason}`);
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `## Validation scope: ${result.mode}\n\n${result.reason}\n\n`,
    );
  if (!process.env.GITHUB_OUTPUT)
    throw new Error('GITHUB_OUTPUT is required to select CI validation scope.');
  appendFileSync(process.env.GITHUB_OUTPUT, `mode=${result.mode}\n`);
}
