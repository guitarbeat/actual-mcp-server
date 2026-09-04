/**
 * Origin allowlist handling for Streamable HTTP.
 *
 * MCP clients may omit Origin entirely (stdio and non-browser HTTP clients do
 * this), but whenever a client sends one we must reject origins that are not
 * explicitly trusted. Values are normalized to URL origins so paths, query
 * strings, wildcards, and credentials can never accidentally become part of
 * the trust decision.
 */

function normalizeOrigin(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'null') {
    throw new Error(`Invalid MCP origin "${value}"; use an http(s) origin, not a wildcard or null`);
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`Invalid MCP origin "${value}"; expected an http(s) origin such as https://mcp.example.com`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Invalid MCP origin "${value}"; only http and https are supported`);
  }
  if (parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error(`Invalid MCP origin "${value}"; origins must not include credentials, paths, queries, or fragments`);
  }
  return parsed.origin;
}

export function parseAllowedOrigins(raw: string | undefined): string[] {
  const values = (raw ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return [...new Set(values.map(normalizeOrigin))];
}

function addOrigin(target: string[], value: string | undefined): void {
  if (!value) return;
  try {
    const normalized = normalizeOrigin(value);
    if (!target.includes(normalized)) target.push(normalized);
  } catch {
    // Derived values come from operator-facing host/scheme settings. If one is
    // malformed, omit it and let the explicit/fallback origins keep startup
    // deterministic; explicit MCP_ALLOWED_ORIGINS remains fail-fast above.
  }
}

export interface DerivedOriginOptions {
  advertisedUrl?: string;
  publicHost?: string;
  publicScheme: string;
  port: number;
}

/**
 * Build a useful default when MCP_ALLOWED_ORIGINS is not set.
 *
 * A configured public host is preferred for reverse-proxy deployments. The
 * advertised URL is also retained because local/test deployments often pass a
 * complete URL directly. Loopback origins are included only when no public host
 * is configured; absence of Origin remains valid for non-browser clients.
 */
export function deriveAllowedOrigins(options: DerivedOriginOptions): string[] {
  const origins: string[] = [];
  addOrigin(origins, options.advertisedUrl);

  const scheme = options.publicScheme === 'https' ? 'https' : 'http';
  if (options.publicHost) {
    addOrigin(origins, `${scheme}://${options.publicHost}`);
  }

  if (!options.publicHost) {
    const portSuffix = options.port > 0 ? `:${options.port}` : '';
    addOrigin(origins, `${scheme}://localhost${portSuffix}`);
    addOrigin(origins, `${scheme}://127.0.0.1${portSuffix}`);
  }

  // A non-empty fallback is important for an ephemeral-port test server and
  // for a host that cannot be resolved during startup. It does not permit a
  // remote origin; it only keeps localhost development usable.
  if (origins.length === 0) addOrigin(origins, `${scheme}://localhost`);
  return origins;
}

export function isAllowedOrigin(origin: string, allowedOrigins: readonly string[]): boolean {
  return allowedOrigins.includes(origin);
}
