/** Resolve a file from `web/public` for both Vite dev and Django-served builds. */
export function publicUrl(assetPath: string): string {
  const base = import.meta.env.BASE_URL || '/'
  const clean = assetPath.replace(/^\//, '')
  return `${base}${clean}`
}
