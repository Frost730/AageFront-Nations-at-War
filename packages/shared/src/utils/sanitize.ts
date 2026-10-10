/**
 * Privacy & Security Sanitization Utilities
 */

/**
 * Escapes HTML entities to prevent Cross-Site Scripting (XSS) when rendering in DOM
 */
export function escapeHtml(str: string | undefined | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitizes input strings by stripping dangerous control characters, HTML tags,
 * and enforcing maximum length.
 */
export function sanitizeText(input: string | undefined | null, maxLength: number = 24): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>&"'/`\\]/g, '') // Strip HTML and quote characters
    .replace(/[\r\n\t\x00-\x1F\x7F]/g, '') // Strip control characters
    .trim()
    .slice(0, maxLength);
}
