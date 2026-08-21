/** Returns whether a value is a runtime-supported IANA timezone identifier. */
export function isSupportedIanaTimezone(timezone: string): boolean {
  if (!timezone || !timezone.includes('/')) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}
