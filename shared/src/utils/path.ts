/**
 * Path expansion utilities
 */

/**
 * Expand ~ and environment variables in a path
 * @param p - Path to expand
 * @returns Expanded path
 */
export function expandPath(p: string): string {
  // Replace ~ with home directory
  // Replace environment variables like $VAR
  return p
    .replace(/^~/, process.env.HOME || '')
    .replace(/\$(\w+)/g, (_, name) => process.env[name] || '');
}
