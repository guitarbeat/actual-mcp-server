// Streamable HTTP Origin validation and RFC 6750 scope challenge coverage.

import assert from 'node:assert/strict';

process.env.ACTUAL_SERVER_URL = 'http://localhost:5006';
process.env.ACTUAL_BUDGET_SYNC_ID = 'origin-validation-test';
process.env.ACTUAL_PASSWORD = 'stub-password-for-unit-test';
process.env.AUTH_PROVIDER = 'none';
process.env.MCP_SSE_AUTHORIZATION = 'origin-test-token';
process.env.MCP_ALLOWED_ORIGINS = 'https://allowed.example.com';

const { startHttpServer } = await import('../../dist/src/server/httpServer.js');

const { listener, cleanup } = await startHttpServer(
  {}, 0, '/custom-mcp', {}, [], 'Origin test server', 'test instructions', {}, '0.19.3', '127.0.0.1',
);

try {
  if (!listener.listening) await new Promise((resolve, reject) => {
    listener.once('listening', resolve);
    listener.once('error', reject);
  });
  const { port } = listener.address();
  const url = `http://127.0.0.1:${port}/mcp`;
  const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} });

  const rejected = await fetch(url, {
    method: 'POST',
    headers: { Origin: 'https://evil.example.com', 'content-type': 'application/json' },
    body,
  });
  assert.equal(rejected.status, 403, 'unlisted Origin must be rejected before authentication');
  assert.match(await rejected.text(), /invalid_origin/);

  const rejectedSse = await fetch(url, {
    headers: { Origin: 'https://evil.example.com', Accept: 'text/event-stream' },
  });
  assert.equal(rejectedSse.status, 403, 'unlisted Origin must be rejected on GET/SSE too');

  const accepted = await fetch(url, {
    method: 'POST',
    headers: {
      Origin: 'https://allowed.example.com',
      Authorization: 'Bearer origin-test-token',
      'content-type': 'application/json',
    },
    body,
  });
  assert.equal(accepted.status, 200, 'listed Origin must pass the origin guard');

  const omitted = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });
  assert.equal(omitted.status, 401, 'requests without Origin remain valid and reach auth');
} finally {
  await new Promise((resolve) => listener.close(resolve));
  process.removeListener('SIGTERM', cleanup);
  process.removeListener('SIGINT', cleanup);
}

console.log('httpServer_origin_validation: all assertions passed');
