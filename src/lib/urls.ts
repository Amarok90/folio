/** Local paths only. External links must go through their validated content schema. */
export function withBasePath(path: string, base: string): string {
  if (
    !path.startsWith('/') ||
    path.startsWith('//') ||
    /[\\?#]/.test(path) ||
    path.split('/').some((part) => part === '..' || part === '.')
  ) {
    throw new Error(
      'Expected an absolute local asset/page path without traversal, query or fragment.',
    );
  }
  return `${base.replace(/\/$/, '')}${path}`;
}

export function canonicalURL(
  path: string,
  origin: URL | undefined,
  base: string,
): string | undefined {
  return origin ? new URL(withBasePath(path, base), origin).href : undefined;
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
