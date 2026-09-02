const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Cache-Control': 'no-store'
};

function reply(payload, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(payload), {
    status,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, CORS)
  });
}

function randomToken(bytes = 32) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  let binary = '';
  data.forEach(value => { binary += String.fromCharCode(value); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hashToken(token) {
  const bytes = new TextEncoder().encode(String(token || ''));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(value => value.toString(16).padStart(2, '0')).join('');
}

function bearer(request) {
  const match = String(request.headers.get('Authorization') || '').match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : '';
}

async function readJson(request) {
  const length = Number(request.headers.get('Content-Length') || 0);
  if (length > 256 * 1024) throw Object.assign(new Error('Payload too large'), { status: 413 });
  try {
    return await request.json();
  } catch (_) {
    throw Object.assign(new Error('Invalid JSON'), { status: 400 });
  }
}

async function saveAccount(env, account) {
  await env.SYNC.put(`account:${account.id}`, JSON.stringify(account));
}

async function authenticatedAccount(request, env, type) {
  const token = bearer(request);
  if (!token) return null;
  const hash = await hashToken(token);
  const accountId = await env.SYNC.get(`${type === 'device' ? 'device' : 'auth'}:${hash}`);
  if (!accountId) return null;
  return env.SYNC.get(`account:${accountId}`, 'json');
}

function sixDigitCode() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(bytes[0] % 1000000).padStart(6, '0');
}

async function handle(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (method === 'OPTIONS') return reply({}, 204);
  if (method === 'GET' && path === '/api/v1/health') {
    return reply({ ok: true, service: 'bench100-sync', version: 1 });
  }

  if (method === 'POST' && path === '/api/v1/accounts') {
    const body = await readJson(request);
    const accountId = crypto.randomUUID();
    const accountToken = randomToken();
    const authHash = await hashToken(accountToken);
    const account = {
      id: accountId,
      authHash,
      name: String(body.name || 'Bench 100').slice(0, 80),
      createdAt: Date.now(),
      workout: null,
      workoutUpdatedAt: null,
      readiness: null,
      results: []
    };
    await Promise.all([
      saveAccount(env, account),
      env.SYNC.put(`auth:${authHash}`, accountId)
    ]);
    return reply({ accountId, accountToken }, 201);
  }

  if (method === 'POST' && path === '/api/v1/pairing') {
    const account = await authenticatedAccount(request, env, 'account');
    if (!account) return reply({ error: 'unauthorized' }, 401);
    let code = sixDigitCode();
    for (let i = 0; i < 4 && await env.SYNC.get(`pair:${code}`); i++) code = sixDigitCode();
    const expiresAt = Date.now() + 15 * 60 * 1000;
    await env.SYNC.put(`pair:${code}`, JSON.stringify({ accountId: account.id, expiresAt }), {
      expirationTtl: 15 * 60
    });
    return reply({ code, expiresAt }, 201);
  }

  // USB-installed Connect IQ apps are not configurable through Garmin Connect.
  // Let the watch create a short code instead, then let the authenticated PWA
  // claim it. A separate secret proves that the polling watch owns the code.
  if (method === 'POST' && path === '/api/v1/devices/pairing') {
    const body = await readJson(request);
    let code = sixDigitCode();
    for (let i = 0; i < 6 && (
      await env.SYNC.get(`pair:${code}`) || await env.SYNC.get(`watchpair:${code}`)
    ); i++) code = sixDigitCode();
    const pairingToken = randomToken();
    const expiresAt = Date.now() + 15 * 60 * 1000;
    await env.SYNC.put(`watchpair:${code}`, JSON.stringify({
      tokenHash: await hashToken(pairingToken),
      name: String(body.name || 'Garmin Venu 2 Plus').slice(0, 80),
      expiresAt,
      accountId: null,
      deviceToken: null
    }), { expirationTtl: 15 * 60 });
    return reply({ code, pairingToken, expiresAt }, 201);
  }

  if (method === 'POST' && path === '/api/v1/pairing/claim') {
    const account = await authenticatedAccount(request, env, 'account');
    if (!account) return reply({ error: 'unauthorized' }, 401);
    const body = await readJson(request);
    const code = String(body.code || '').replace(/\D/g, '').slice(0, 6);
    const pairing = await env.SYNC.get(`watchpair:${code}`, 'json');
    if (!pairing || pairing.expiresAt <= Date.now()) return reply({ error: 'pairing_code_invalid' }, 404);
    if (pairing.accountId) return reply({ error: 'pairing_code_claimed' }, 409);
    const deviceToken = randomToken();
    const deviceTokenHash = await hashToken(deviceToken);
    pairing.accountId = account.id;
    pairing.deviceToken = deviceToken;
    account.device = {
      name: pairing.name,
      pairedAt: Date.now(),
      lastSeenAt: Date.now(),
      tokenHash: deviceTokenHash
    };
    const ttl = Math.max(60, Math.ceil((pairing.expiresAt - Date.now()) / 1000));
    await Promise.all([
      saveAccount(env, account),
      env.SYNC.put(`device:${deviceTokenHash}`, account.id),
      env.SYNC.put(`watchpair:${code}`, JSON.stringify(pairing), { expirationTtl: ttl })
    ]);
    return reply({ ok: true, device: { name: pairing.name } });
  }

  if (method === 'POST' && path === '/api/v1/devices/pairing/status') {
    const body = await readJson(request);
    const code = String(body.code || '').replace(/\D/g, '').slice(0, 6);
    const pairing = await env.SYNC.get(`watchpair:${code}`, 'json');
    const suppliedHash = await hashToken(body.pairingToken || '');
    if (!pairing || pairing.expiresAt <= Date.now() || pairing.tokenHash !== suppliedHash) {
      return reply({ error: 'pairing_code_invalid' }, 404);
    }
    if (!pairing.accountId || !pairing.deviceToken) return reply({ pending: true }, 202);
    await env.SYNC.delete(`watchpair:${code}`);
    return reply({ deviceToken: pairing.deviceToken, accountId: pairing.accountId });
  }

  if (method === 'POST' && path === '/api/v1/devices/pair') {
    const body = await readJson(request);
    const code = String(body.code || '').replace(/\D/g, '').slice(0, 6);
    const pairing = await env.SYNC.get(`pair:${code}`, 'json');
    if (!pairing || pairing.expiresAt <= Date.now()) return reply({ error: 'pairing_code_invalid' }, 404);
    const account = await env.SYNC.get(`account:${pairing.accountId}`, 'json');
    if (!account) return reply({ error: 'pairing_code_invalid' }, 404);
    const deviceToken = randomToken();
    const deviceTokenHash = await hashToken(deviceToken);
    account.device = {
      name: String(body.name || 'Garmin Venu 2 Plus').slice(0, 80),
      pairedAt: Date.now(),
      lastSeenAt: Date.now(),
      tokenHash: deviceTokenHash
    };
    await Promise.all([
      saveAccount(env, account),
      env.SYNC.put(`device:${deviceTokenHash}`, account.id),
      env.SYNC.delete(`pair:${code}`)
    ]);
    return reply({ deviceToken, accountId: account.id }, 201);
  }

  if (method === 'PUT' && path === '/api/v1/workouts/current') {
    const account = await authenticatedAccount(request, env, 'account');
    if (!account) return reply({ error: 'unauthorized' }, 401);
    const body = await readJson(request);
    if (!body || body.v !== 1 || !body.id || !Array.isArray(body.ex)) {
      return reply({ error: 'invalid_workout' }, 400);
    }
    account.workout = body;
    account.workoutUpdatedAt = Date.now();
    await saveAccount(env, account);
    return reply({ ok: true, updatedAt: account.workoutUpdatedAt });
  }

  if (method === 'GET' && path === '/api/v1/devices/workout') {
    const account = await authenticatedAccount(request, env, 'device');
    if (!account) return reply({ error: 'unauthorized' }, 401);
    if (account.device) account.device.lastSeenAt = Date.now();
    await saveAccount(env, account);
    return reply({ workout: account.workout, updatedAt: account.workoutUpdatedAt, serverTime: Date.now() });
  }

  if (method === 'POST' && path === '/api/v1/devices/readiness') {
    const account = await authenticatedAccount(request, env, 'device');
    if (!account) return reply({ error: 'unauthorized' }, 401);
    const body = await readJson(request);
    account.readiness = Object.assign({}, body, { receivedAt: Date.now() });
    if (account.device) account.device.lastSeenAt = Date.now();
    await saveAccount(env, account);
    return reply({ ok: true }, 201);
  }

  if (method === 'POST' && path === '/api/v1/devices/results') {
    const account = await authenticatedAccount(request, env, 'device');
    if (!account) return reply({ error: 'unauthorized' }, 401);
    const body = await readJson(request);
    if (!body || !body.workoutId || !Array.isArray(body.sets)) {
      return reply({ error: 'invalid_result' }, 400);
    }
    const resultId = crypto.randomUUID();
    account.results = account.results || [];
    account.results.push({ id: resultId, receivedAt: Date.now(), payload: body });
    account.results = account.results.slice(-100);
    if (body.readiness) account.readiness = Object.assign({}, body.readiness, { receivedAt: Date.now() });
    if (account.device) account.device.lastSeenAt = Date.now();
    await saveAccount(env, account);
    return reply({ ok: true, resultId }, 201);
  }

  if (method === 'GET' && path === '/api/v1/results') {
    const account = await authenticatedAccount(request, env, 'account');
    if (!account) return reply({ error: 'unauthorized' }, 401);
    const after = Number(url.searchParams.get('after') || 0);
    return reply({
      results: (account.results || []).filter(item => item.receivedAt > after),
      serverTime: Date.now()
    });
  }

  if (method === 'GET' && path === '/api/v1/status') {
    const account = await authenticatedAccount(request, env, 'account');
    if (!account) return reply({ error: 'unauthorized' }, 401);
    return reply({
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
  }

  if (method === 'DELETE' && path === '/api/v1/accounts') {
    const account = await authenticatedAccount(request, env, 'account');
    if (!account) return reply({ error: 'unauthorized' }, 401);
    const removals = [env.SYNC.delete(`account:${account.id}`)];
    if (account.authHash) removals.push(env.SYNC.delete(`auth:${account.authHash}`));
    if (account.device && account.device.tokenHash) removals.push(env.SYNC.delete(`device:${account.device.tokenHash}`));
    await Promise.all(removals);
    return reply({ ok: true });
  }

  return reply({ error: 'not_found' }, 404);
}

export default {
  async fetch(request, env) {
    try {
      return await handle(request, env);
    } catch (error) {
      return reply({ error: error.message || 'server_error' }, error.status || 500);
    }
  }
};
