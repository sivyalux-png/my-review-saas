export function resolveBusinessName(
  settingsBusinessName: string | null | undefined,
  profileBusinessName: string | null | undefined,
): string | null {
  return settingsBusinessName?.trim() || profileBusinessName?.trim() || null;
}
