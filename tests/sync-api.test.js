const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const port = 32000 + Math.floor(Math.random() * 1000);
const storePath = path.join(os.tmpdir(), `bench100-sync-${process.pid}.json`);
process.env.BENCH100_PORT = String(port);
process.env.BENCH100_HOST = '127.0.0.1';
process.env.BENCH100_STORE_PATH = storePath;
const { server } = require('../BenchApp/server.js');
const base = `http://127.0.0.1:${port}/api/v1`;

async function jsonRequest(pathname, options = {}) {
  const response = await fetch(`${base}${pathname}`, options);
  const body = await response.json();
  assert.ok(response.ok, JSON.stringify(body));
  return body;
}

test('account, pairing, workout, readiness and result round-trip', async () => {
  if (!server.listening) await new Promise(resolve => server.once('listening', resolve));
  const account = await jsonRequest('/accounts', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"name":"Test"}'
  });
  const accountHeaders = { Authorization: `Bearer ${account.accountToken}`, 'Content-Type': 'application/json' };
  const pairing = await jsonRequest('/pairing', { method: 'POST', headers: accountHeaders, body: '{}' });
  assert.match(pairing.code, /^\d{6}$/);
  const device = await jsonRequest('/devices/pair', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: pairing.code })
  });
  const deviceHeaders = { Authorization: `Bearer ${device.deviceToken}`, 'Content-Type': 'application/json' };
  const workout = { v: 1, id: 'cycle-1:1:Пн', title: 'Неделя 1', ex: [{ x: 0, u: 0, n: 'Жим', b: 1, s: [{ i: 0, w: 70, r: 5, d: 180, c: 0 }] }] };
  await jsonRequest('/workouts/current', { method: 'PUT', headers: accountHeaders, body: JSON.stringify(workout) });
  const downloaded = await jsonRequest('/devices/workout', { headers: deviceHeaders });
  assert.equal(downloaded.workout.id, workout.id);
  await jsonRequest('/devices/readiness', {
    method: 'POST', headers: deviceHeaders, body: JSON.stringify({ bodyBattery: 82, stress: 18, score: 82 })
  });
  await jsonRequest('/devices/results', {
    method: 'POST', headers: deviceHeaders, body: JSON.stringify({ workoutId: workout.id, sets: [{ x: 0, u: 0, i: 0, w: 70, r: 5 }] })
  });
  const results = await jsonRequest('/results?after=0', { headers: accountHeaders });
  const status = await jsonRequest('/status', { headers: accountHeaders });
  assert.equal(results.results.length, 1);
  assert.equal(status.readiness.bodyBattery, 82);
  assert.equal(status.device.name, 'Garmin Venu 2 Plus');
  await jsonRequest('/accounts', { method: 'DELETE', headers: accountHeaders });
  const afterDelete = await fetch(`${base}/status`, { headers: accountHeaders });
  assert.equal(afterDelete.status, 401);
});

test.after(async () => {
  await new Promise(resolve => server.close(resolve));
  if (fs.existsSync(storePath)) fs.unlinkSync(storePath);
  if (fs.existsSync(`${storePath}.tmp`)) fs.unlinkSync(`${storePath}.tmp`);
});
