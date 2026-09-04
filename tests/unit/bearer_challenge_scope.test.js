import assert from 'node:assert/strict';
import { appendBearerScope } from '../../dist/src/lib/bearer-challenge.js';
import { deriveAllowedOrigins, parseAllowedOrigins } from '../../dist/src/lib/origin-allowlist.js';

assert.equal(
  appendBearerScope('Bearer error="invalid_token", resource_metadata="https://mcp.example/.well-known"', ['mcp:access']),
  'Bearer error="invalid_token", resource_metadata="https://mcp.example/.well-known", scope="mcp:access"',
);
assert.equal(appendBearerScope('Bearer error="invalid_token", scope="existing"', ['mcp:access']), 'Bearer error="invalid_token", scope="existing"');
assert.equal(appendBearerScope('Bearer error="invalid_token"', []), 'Bearer error="invalid_token"');
assert.equal(appendBearerScope('Bearer error="invalid_token"', ['read', 'write']), 'Bearer error="invalid_token", scope="read write"');
assert.deepEqual(parseAllowedOrigins('https://allowed.example.com/, http://localhost:3000'), [
  'https://allowed.example.com',
  'http://localhost:3000',
]);
assert.throws(() => parseAllowedOrigins('*'), /Invalid MCP origin/);
assert.deepEqual(deriveAllowedOrigins({
  advertisedUrl: 'https://actual-mcp.example.com/mcp',
  publicHost: 'actual-mcp.example.com',
  publicScheme: 'https',
  port: 3600,
}), [
  'https://actual-mcp.example.com',
]);
console.log('bearer_challenge_scope: all assertions passed');
