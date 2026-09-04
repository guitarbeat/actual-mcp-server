import config from '../config.js';
import api from '@actual-app/api';

/**
 * Options for `@actual-app/api` init.
 *
 * Actual 26+ reads `sessionToken`. Empty passwords are omitted so a token-only
 * deployment does not attempt the password login path.
 */
export function actualApiInitOptions(
  dataDir: string,
  serverURL: string,
  password?: string,
): Record<string, unknown> {
  const sessionToken = config.ACTUAL_SESSION_TOKEN || undefined;
  return {
    dataDir,
    serverURL,
    ...(password ? { password } : {}),
    ...(sessionToken ? { sessionToken } : {}),
  };
}

/** Initialize Actual through the fork's single credential-normalization seam. */
export async function initializeActualApi(
  dataDir: string,
  serverURL: string,
  password?: string,
): Promise<void> {
  await (api.init as unknown as (options: Record<string, unknown>) => Promise<void>)(
    actualApiInitOptions(dataDir, serverURL, password),
  );
}
