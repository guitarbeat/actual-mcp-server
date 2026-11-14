/**
 * Credential fields for the single `api.init` chokepoint in `apiLogin.ts`.
 *
 * Actual 26+ reads `sessionToken` and ignores the older `token` field. An empty
 * password is omitted when a session token is present so init does not take the
 * password login path. With no session token the password is always passed,
 * including `''`, which is upstream's no-credential init.
 */
export function actualApiCredentialFields(
  password: string | undefined,
  sessionToken: string | undefined,
): { password?: string; sessionToken?: string } {
  const token = sessionToken?.trim() || undefined;
  if (token && !password) return { sessionToken: token };
  const fields: { password?: string; sessionToken?: string } = { password: password ?? '' };
  if (token) fields.sessionToken = token;
  return fields;
}
