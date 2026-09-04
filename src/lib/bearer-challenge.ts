/** Add the RFC 6750/MCP scope parameter without changing other challenge data. */
export function appendBearerScope(header: string, scopes: readonly string[]): string {
  if (!header || scopes.length === 0 || /(?:^|,\s*)scope="/i.test(header)) return header;
  const scope = scopes.join(' ').replaceAll('\\', '\\\\').replaceAll('"', '\\"');
  return `${header}, scope="${scope}"`;
}
