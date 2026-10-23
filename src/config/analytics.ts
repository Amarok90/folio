/** Public build configuration, never a runtime query-string or browser override. */
export function resolveAnalytics(env: Record<string, string | undefined>) {
  const projectId = env['CLARITY_PROJECT_ID']?.trim() ?? '';
  const configured =
    env['CLARITY_ENABLED'] === 'true' && /^[a-z0-9]{6,20}$/i.test(projectId);

  return {
    enabled: configured,
    projectId: configured ? projectId : '',
  } as const;
}

export const analytics = resolveAnalytics({
  CLARITY_ENABLED: import.meta.env['CLARITY_ENABLED'],
  CLARITY_PROJECT_ID: import.meta.env['CLARITY_PROJECT_ID'],
});
