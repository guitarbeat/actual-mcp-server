// Regression coverage for the fork's session-token authentication contract.
// The credential helper is the single seam, and initApiLoggedIn is the only
// api.init chokepoint. A token-only login omits password and never logs the token.

process.env.ACTUAL_SERVER_URL = 'http://localhost:5006';
process.env.ACTUAL_BUDGET_SYNC_ID = 'sync-session-token-test';
process.env.ACTUAL_PASSWORD = '';
process.env.ACTUAL_SESSION_TOKEN = 'sentinel-session-token-DO-NOT-LEAK';
process.env.ACTUAL_API_VERBOSE = 'false';

import assert from 'node:assert/strict';

const { actualApiCredentialFields } = await import('../../dist/src/lib/actual-init-config.js');
const { initApiLoggedIn } = await import('../../dist/src/lib/apiLogin.js');
const apiMod = await import('@actual-app/api');
const api = apiMod.default ?? apiMod;

assert.deepEqual(actualApiCredentialFields('', process.env.ACTUAL_SESSION_TOKEN), {
  sessionToken: process.env.ACTUAL_SESSION_TOKEN,
});
assert.deepEqual(actualApiCredentialFields('pw', ''), { password: 'pw' });
assert.deepEqual(actualApiCredentialFields('pw', 'tok'), { password: 'pw', sessionToken: 'tok' });
assert.deepEqual(actualApiCredentialFields('', ''), { password: '' });

const originalInit = api.init;
const capturedLogs = [];
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

let initOptions;
api.init = async (options) => {
  initOptions = options;
  return { send: async () => 'ok' };
};
console.log = (...args) => capturedLogs.push(args.join(' '));
console.info = (...args) => capturedLogs.push(args.join(' '));
console.warn = (...args) => capturedLogs.push(args.join(' '));
console.error = (...args) => capturedLogs.push(args.join(' '));

try {
  await initApiLoggedIn('/tmp/actual-session-token-test', {
    serverUrl: 'http://localhost:5006',
    password: '',
  }, 'session-token regression');
} finally {
  api.init = originalInit;
  Object.assign(console, originalConsole);
}

assert.equal(initOptions?.sessionToken, process.env.ACTUAL_SESSION_TOKEN);
assert.equal(Object.hasOwn(initOptions ?? {}, 'password'), false);
assert.equal(initOptions?.verbose, false);
assert.equal(capturedLogs.join('\n').includes(process.env.ACTUAL_SESSION_TOKEN), false);

console.log('actual_session_token: all assertions passed');
