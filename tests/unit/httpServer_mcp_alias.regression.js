// Regression coverage for the fork's authenticated /mcp compatibility alias.
// Exercises the public HTTP transport with the same requests on a configured
// custom route and on /mcp.

process.env.ACTUAL_SERVER_URL = 'http://localhost:5006';
process.env.ACTUAL_BUDGET_SYNC_ID = 'sync-mcp-alias-test';
process.env.ACTUAL_PASSWORD = 'stub-password-for-unit-test';
process.env.MCP_SSE_AUTHORIZATION = 'mcp-alias-bearer-token';
process.env.AUTH_PROVIDER = 'none';

const { startHttpServer } = await import('../../dist/src/server/httpServer.js');
const { connectionPool } = await import('../../dist/src/lib/ActualConnectionPool.js');

const original = {
  getConnection: connectionPool.getConnection,
  touch: connectionPool.touch,
  shutdownConnection: connectionPool.shutdownConnection,
  shutdownAll: connectionPool.shutdownAll,
};
connectionPool.getConnection = async () => {};
connectionPool.touch = () => true;
connectionPool.shutdownConnection = async () => {};
connectionPool.shutdownAll = async () => {};

const auth = { authorization: `Bearer ${process.env.MCP_SSE_AUTHORIZATION}` };
const initializeBody = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'mcp-alias-regression', version: '1.0.0' },
  },
};

const { listener, cleanup } = await startHttpServer(
  {}, 0, '/custom-mcp', {}, ['actual_budgets_list'],
  'Actual MCP test server', 'test instructions', {}, '0.19.3', '127.0.0.1',
);
await new Promise((resolve) => listener.listening ? resolve() : listener.once('listening', resolve));
const address = listener.address();
const base = `http://127.0.0.1:${address.port}`;

async function exercise(path) {
  const unauthorized = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify(initializeBody),
  });
  if (unauthorized.status !== 401) {
    throw new Error(`${path}: unauthenticated initialize returned ${unauthorized.status}, expected 401`);
  }

  const initialized = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify(initializeBody),
  });
  if (initialized.status !== 200) {
    throw new Error(`${path}: authenticated initialize returned ${initialized.status}`);
  }
  const sessionId = initialized.headers.get('mcp-session-id');
  if (!sessionId) throw new Error(`${path}: initialize did not return mcp-session-id`);

  const listed = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: {
      ...auth,
      'mcp-session-id': sessionId,
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }),
  });
  if (listed.status !== 200) throw new Error(`${path}: authenticated session POST returned ${listed.status}`);

  const sse = await fetch(`${base}${path}`, {
    headers: { ...auth, 'mcp-session-id': sessionId, accept: 'text/event-stream' },
  });
  if (sse.status !== 200 || !sse.headers.get('content-type')?.includes('text/event-stream')) {
    throw new Error(`${path}: authenticated SSE GET was not accepted`);
  }
  await sse.body?.cancel();
}

try {
  await exercise('/custom-mcp');
  await exercise('/mcp');
  console.log('httpServer_mcp_alias: all assertions passed');
} finally {
  listener.close();
  await cleanup();
  process.removeListener('SIGTERM', cleanup);
  process.removeListener('SIGINT', cleanup);
  Object.assign(connectionPool, original);
}
