// Локальный сервер Bench 100 + API синхронизации Garmin.
// Запуск: node server.js
// Приложение: http://localhost:3000
// API:         http://localhost:3000/api/v1

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.BENCH100_PORT || 3000);
const HOST = process.env.BENCH100_HOST || '0.0.0.0';
const DIR = __dirname;
const STORE_PATH = process.env.BENCH100_STORE_PATH || path.join(DIR, '.bench100-sync-data.json');
const MAX_BODY_BYTES = 256 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav'
};

function emptyStore() {
  return { version: 1, accounts: {}, auth: {}, devices: {}, pairings: {} };
}

function loadStore() {
  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    return Object.assign(emptyStore(), parsed);
  } catch (_) {
    return emptyStore();
  }
}

let store = loadStore();

function persistStore() {
  const tempPath = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(store, null, 2), 'utf8');
  fs.renameSync(tempPath, STORE_PATH);
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function json(res, status, payload) {
  const body = status === 204 ? '' : JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Payload too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch (_) {
        reject(Object.assign(new Error('Invalid JSON'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function bearer(req) {
  const match = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : '';
}

function accountFromRequest(req, kind) {
  const hash = tokenHash(bearer(req));
  const accountId = kind === 'device' ? store.devices[hash] : store.auth[hash];
  return accountId && store.accounts[accountId] ? store.accounts[accountId] : null;
}

function makePairCode() {
  let code;
  do {
    code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  } while (store.pairings[code]);
  return code;
}

function trimStore() {
  const now = Date.now();
  Object.entries(store.pairings).forEach(([code, pairing]) => {
    if (!pairing || pairing.expiresAt <= now) delete store.pairings[code];
  });
  Object.values(store.accounts).forEach(account => {
    if (Array.isArray(account.results) && account.results.length > 100) {
      account.results = account.results.slice(-100);
    }
  });
}

async function handleApi(req, res, pathname, searchParams) {
  if (req.method === 'OPTIONS') {
    json(res, 204, {});
    return;
  }

  if (req.method === 'GET' && pathname === '/api/v1/health') {
    json(res, 200, { ok: true, service: 'bench100-sync', version: 1 });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/v1/accounts') {
    const body = await readJson(req);
    const accountId = crypto.randomUUID();
    const accountToken = randomToken();
    const authHash = tokenHash(accountToken);
    store.accounts[accountId] = {
      id: accountId,
      authHash,
      name: String(body.name || 'Bench 100').slice(0, 80),
      createdAt: Date.now(),
      workout: null,
      workoutUpdatedAt: null,
      readiness: null,
      results: []
    };
    store.auth[authHash] = accountId;
    persistStore();
    json(res, 201, { accountId, accountToken });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/v1/pairing') {
    const account = accountFromRequest(req, 'account');
    if (!account) return json(res, 401, { error: 'unauthorized' });
    trimStore();
    const code = makePairCode();
    const expiresAt = Date.now() + 15 * 60 * 1000;
    store.pairings[code] = { accountId: account.id, expiresAt };
    persistStore();
    json(res, 201, { code, expiresAt });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/v1/devices/pair') {
    const body = await readJson(req);
    trimStore();
    const code = String(body.code || '').replace(/\D/g, '').slice(0, 6);
    const pairing = store.pairings[code];
    if (!pairing || pairing.expiresAt <= Date.now()) {
      return json(res, 404, { error: 'pairing_code_invalid' });
    }
    const deviceToken = randomToken();
    const deviceTokenHash = tokenHash(deviceToken);
    store.devices[deviceTokenHash] = pairing.accountId;
    const account = store.accounts[pairing.accountId];
    account.device = {
      name: String(body.name || 'Garmin Venu 2 Plus').slice(0, 80),
      pairedAt: Date.now(),
      lastSeenAt: Date.now(),
      tokenHash: deviceTokenHash
    };
    delete store.pairings[code];
    persistStore();
    json(res, 201, { deviceToken, accountId: pairing.accountId });
    return;
  }

  if (req.method === 'PUT' && pathname === '/api/v1/workouts/current') {
    const account = accountFromRequest(req, 'account');
    if (!account) return json(res, 401, { error: 'unauthorized' });
    const body = await readJson(req);
    if (!body || body.v !== 1 || !body.id || !Array.isArray(body.ex)) {
      return json(res, 400, { error: 'invalid_workout' });
    }
    account.workout = body;
    account.workoutUpdatedAt = Date.now();
    persistStore();
    json(res, 200, { ok: true, updatedAt: account.workoutUpdatedAt });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/v1/devices/workout') {
    const account = accountFromRequest(req, 'device');
    if (!account) return json(res, 401, { error: 'unauthorized' });
    if (account.device) account.device.lastSeenAt = Date.now();
    persistStore();
    json(res, 200, {
      workout: account.workout,
      updatedAt: account.workoutUpdatedAt,
      serverTime: Date.now()
    });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/v1/devices/readiness') {
    const account = accountFromRequest(req, 'device');
    if (!account) return json(res, 401, { error: 'unauthorized' });
    const body = await readJson(req);
    account.readiness = Object.assign({}, body, { receivedAt: Date.now() });
    if (account.device) account.device.lastSeenAt = Date.now();
    persistStore();
    json(res, 201, { ok: true });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/v1/devices/results') {
    const account = accountFromRequest(req, 'device');
    if (!account) return json(res, 401, { error: 'unauthorized' });
    const body = await readJson(req);
    if (!body || !body.workoutId || !Array.isArray(body.sets)) {
      return json(res, 400, { error: 'invalid_result' });
    }
    const resultId = crypto.randomUUID();
    account.results = account.results || [];
    account.results.push({ id: resultId, receivedAt: Date.now(), payload: body });
    if (body.readiness) account.readiness = Object.assign({}, body.readiness, { receivedAt: Date.now() });
    if (account.device) account.device.lastSeenAt = Date.now();
    trimStore();
    persistStore();
    json(res, 201, { ok: true, resultId });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/v1/results') {
    const account = accountFromRequest(req, 'account');
    if (!account) return json(res, 401, { error: 'unauthorized' });
    const after = Number(searchParams.get('after') || 0);
    const results = (account.results || []).filter(item => item.receivedAt > after);
    json(res, 200, { results, serverTime: Date.now() });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/v1/status') {
    const account = accountFromRequest(req, 'account');
    if (!account) return json(res, 401, { error: 'unauthorized' });
    json(res, 200, {
      connected: true,
      device: account.device || null,
      workout: account.workout ? {
        id: account.workout.id,
        title: account.workout.title,
        updatedAt: account.workoutUpdatedAt
      } : null,
      readiness: account.readiness || null,
      serverTime: Date.now()
    });
    return;
  }

  if (req.method === 'DELETE' && pathname === '/api/v1/accounts') {
    const account = accountFromRequest(req, 'account');
    if (!account) return json(res, 401, { error: 'unauthorized' });
    if (account.authHash) delete store.auth[account.authHash];
    if (account.device && account.device.tokenHash) delete store.devices[account.device.tokenHash];
    Object.entries(store.pairings).forEach(([code, pairing]) => {
      if (pairing.accountId === account.id) delete store.pairings[code];
    });
    delete store.accounts[account.id];
    persistStore();
    json(res, 200, { ok: true });
    return;
  }

  json(res, 404, { error: 'not_found' });
}

function serveStatic(req, res, pathname) {
  const decoded = decodeURIComponent(pathname);
  const requested = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const filePath = path.resolve(DIR, requested);
  const root = path.resolve(DIR);
  if (!filePath.startsWith(`${root}${path.sep}`) && filePath !== path.join(root, 'index.html')) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url.pathname, url.searchParams);
    } else {
      serveStatic(req, res, url.pathname);
    }
  } catch (error) {
    if (!res.headersSent) json(res, error.status || 500, { error: error.message || 'server_error' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Bench 100: http://localhost:${PORT}`);
  console.log(`Garmin API: http://localhost:${PORT}/api/v1`);
});

module.exports = { server, handleApi };
