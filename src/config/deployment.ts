/** One authority for host and path configuration; never guess a production domain. */
export function resolveDeployment(env: Record<string, string | undefined>) {
  const rawBase = env['BASE_PATH'] ?? '/';
  if (!/^\/(?:[A-Za-z0-9_-]+\/?)?$/.test(rawBase)) {
    throw new Error(
      'BASE_PATH must be / or a single GitHub Pages repository path.',
    );
  }
  const base = rawBase === '/' ? '/' : `${rawBase.replace(/\/$/, '')}/`;
  const rawSite = env['SITE_URL'];
  if (!rawSite) return { site: undefined, base };
  const url = new URL(rawSite);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  ) {
    throw new Error(
      'SITE_URL must be an HTTPS origin, without a path, credentials, query or fragment. Use BASE_PATH for project paths.',
    );
  }
  return { site: url.origin, base };
}

/** Indexing is a separate, explicit launch switch; never infer it from a hostname. */
export function resolveIndexability(
  env: Record<string, string | undefined>,
): boolean {
  const value = env['SITE_INDEXABLE'];
  if (value !== undefined && value !== 'true' && value !== 'false') {
    throw new Error('SITE_INDEXABLE must be true or false.');
  }
  if (value !== 'true') return false;
  if (!resolveDeployment(env).site) {
    throw new Error('Indexable output requires an explicit HTTPS SITE_URL.');
  }
  return true;
}
