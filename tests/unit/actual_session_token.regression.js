// Regression coverage for the fork's session-token authentication contract.
// The public initializer is the single seam used by every Actual API init path.

process.env.ACTUAL_SERVER_URL = 'http://localhost:5006';
process.env.ACTUAL_BUDGET_SYNC_ID = 'sync-session-token-test';
process.env.ACTUAL_PASSWORD = '';
process.env.ACTUAL_SESSION_TOKEN = 'sentinel-session-token-DO-NOT-LEAK';

import api from '@actual-app/api';

const { initializeActualApi } = await import('../../dist/src/lib/actual-init-config.js');

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
};
console.log = (...args) => capturedLogs.push(args.join(' '));
console.info = (...args) => capturedLogs.push(args.join(' '));
console.warn = (...args) => capturedLogs.push(args.join(' '));
console.error = (...args) => capturedLogs.push(args.join(' '));

try {
  await initializeActualApi('/tmp/actual-session-token-test', 'http://localhost:5006');
} finally {
  api.init = originalInit;
  Object.assign(console, originalConsole);
}

if (initOptions?.sessionToken !== process.env.ACTUAL_SESSION_TOKEN) {
  throw new Error('Actual API init did not receive ACTUAL_SESSION_TOKEN as sessionToken');
}
if (Object.hasOwn(initOptions ?? {}, 'password')) {
  throw new Error('Token-only Actual API init must omit password');
}
if (capturedLogs.join('\n').includes(process.env.ACTUAL_SESSION_TOKEN)) {
  throw new Error('Actual session token leaked to log output');
}

console.log('actual_session_token: all assertions passed');
