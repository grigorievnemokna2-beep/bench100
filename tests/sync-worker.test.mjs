import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../sync-worker/worker.js';

class FakeKV {
  constructor() { this.data = new Map(); }
  async put(key, value) { this.data.set(key, String(value)); }
  async get(key, type) {
    const value = this.data.get(key);
    if (value === undefined) return null;
    return type === 'json' ? JSON.parse(value) : value;
  }
  async delete(key) { this.data.delete(key); }
}

const env = { SYNC: new FakeKV() };
const base = 'https://sync.example/api/v1';

async function call(path, options = {}) {
  const response = await worker.fetch(new Request(`${base}${path}`, options), env);
  const body = await response.json();
  return { response, body };
}

test('production worker completes a watch sync round-trip', async () => {
  const created = await call('/accounts', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"name":"Sergey"}'
  });
  assert.equal(created.response.status, 201);
  const accountHeaders = {
    Authorization: `Bearer ${created.body.accountToken}`,
    'Content-Type': 'application/json'
  };
  const pairing = await call('/pairing', { method: 'POST', headers: accountHeaders, body: '{}' });
  assert.match(pairing.body.code, /^\d{6}$/);
  const paired = await call('/devices/pair', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: pairing.body.code })
  });
  assert.equal(paired.response.status, 201);
  const deviceHeaders = {
    Authorization: `Bearer ${paired.body.deviceToken}`,
    'Content-Type': 'application/json'
  };
  const workout = { v: 1, id: 'cycle:1:Пн', title: 'Неделя 1', ex: [] };
  assert.equal((await call('/workouts/current', {
    method: 'PUT', headers: accountHeaders, body: JSON.stringify(workout)
  })).response.status, 200);
  assert.equal((await call('/devices/workout', { headers: deviceHeaders })).body.workout.id, workout.id);
  assert.equal((await call('/devices/results', {
    method: 'POST', headers: deviceHeaders, body: JSON.stringify({ workoutId: workout.id, sets: [] })
  })).response.status, 201);
  assert.equal((await call('/results?after=0', { headers: accountHeaders })).body.results.length, 1);
  assert.equal((await call('/accounts', { method: 'DELETE', headers: accountHeaders })).response.status, 200);
  assert.equal((await call('/status', { headers: accountHeaders })).response.status, 401);
});

test('production worker supports watch-generated pairing codes', async () => {
  const created = await call('/accounts', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"name":"Reverse pairing"}'
  });
  const accountHeaders = {
    Authorization: `Bearer ${created.body.accountToken}`,
    'Content-Type': 'application/json'
  };
  const pairing = await call('/devices/pairing', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"name":"Garmin Venu 2 Plus"}'
  });
  assert.equal(pairing.response.status, 201);
  const pending = await call('/devices/pairing/status', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: pairing.body.code, pairingToken: pairing.body.pairingToken })
  });
  assert.equal(pending.response.status, 202);
  assert.equal((await call('/pairing/claim', {
    method: 'POST', headers: accountHeaders, body: JSON.stringify({ code: pairing.body.code })
  })).response.status, 200);
  const paired = await call('/devices/pairing/status', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: pairing.body.code, pairingToken: pairing.body.pairingToken })
  });
  assert.equal(paired.response.status, 200);
  assert.ok(paired.body.deviceToken);
  assert.equal((await call('/accounts', { method: 'DELETE', headers: accountHeaders })).response.status, 200);
});
