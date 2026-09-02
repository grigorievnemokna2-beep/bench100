const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

global.location = { hostname: 'localhost', origin: 'http://localhost:3000' };
global.localStorage = {
  values: new Map(),
  getItem(key) { return this.values.get(key) || null; },
  setItem(key, value) { this.values.set(key, value); }
};
global.document = {
  createElement() { return { textContent: '', get innerHTML() { return this.textContent; } }; }
};

const GarminSync = require('../BenchApp/garmin-sync.js');

test('normalizes a Bench 100 day for the watch and merges the result back', () => {
  const cycle = { id: 'cycle-1', name: 'Проходка', maxWeight: 90, workouts: {} };
  const program = [{
    week: 1,
    days: [{
      day: 'Пн',
      exercises: [
        { name: 'Жим', isBase: true, segments: [{ percent: 75, reps: 5, sets: 2 }] },
        { name: 'Бицепс', isIndividual: true, reps: 10, sets: 2 }
      ]
    }]
  }];
  const app = {
    data: { cycles: [cycle] },
    currentCycleId: cycle.id,
    currentWeek: 1,
    currentDay: 'Пн',
    getCycle() { return cycle; },
    getCycleProgram() { return program; },
    roundWeight(value) { return Math.round(value * 2) / 2; },
    saveData() { this.saved = true; }
  };

  GarminSync.app = app;
  GarminSync.config = GarminSync.defaultConfig();
  const payload = GarminSync.buildCurrentWorkout();
  assert.equal(payload.id, 'cycle-1:1:Пн');
  assert.equal(payload.ex.length, 2);
  assert.equal(payload.ex[0].s[0].w, 67.5);
  assert.equal(payload.ex[0].s[0].d, 180);

  const applied = GarminSync.applyResult({
    workoutId: payload.id,
    startedAt: 1788330000,
    finishedAt: 1788333600,
    duration: 3600,
    complete: true,
    rpe: 8,
    avgHr: 112,
    maxHr: 151,
    sets: [
      { x: 0, u: 0, i: 0, w: 67.5, r: 5, at: 1788330100 },
      { x: 1, u: 0, i: 0, w: 20, r: 10, at: 1788330200 }
    ]
  });

  assert.equal(applied, true);
  assert.equal(cycle.workouts['1-Пн'].exercises[0].sets[0].done, true);
  assert.equal(cycle.workouts['1-Пн'].exercises[1].setWeights[0], 20);
  assert.equal(cycle.workouts['1-Пн'].garmin.avgHr, 112);
  assert.equal(cycle.workouts['1-Пн'].completed, true);
  assert.equal(app.saved, true);
});

test('readiness score combines Body Battery and inverse stress', () => {
  assert.equal(GarminSync.readinessScore({ bodyBattery: 80, stress: 20 }), 80);
  assert.equal(GarminSync.readinessLabel(80).text, 'Высокая');
  assert.equal(GarminSync.readinessLabel(30).text, 'Низкая');
});

test('every current program day fits the watch storage and transfer budget', () => {
  const source = fs.readFileSync(path.join(__dirname, '../BenchApp/program-data.js'), 'utf8');
  const context = {};
  vm.runInNewContext(`${source}\nthis.currentProgram = PROGRAM_POWERLIFTING;`, context);
  const cycle = { id: 'size-test', name: 'Размер', maxWeight: 100, workouts: {}, programVersion: 3 };
  const app = {
    data: { cycles: [cycle] }, currentCycleId: cycle.id, currentWeek: 1, currentDay: 'Пн',
    getCycle() { return cycle; }, getCycleProgram() { return context.currentProgram; },
    roundWeight(value) { return Math.round(value * 2) / 2; }, saveData() {}
  };
  GarminSync.app = app;
  let largest = 0;
  context.currentProgram.forEach(week => week.days.forEach(day => {
    app.currentWeek = week.week;
    app.currentDay = day.day;
    const bytes = Buffer.byteLength(JSON.stringify(GarminSync.buildCurrentWorkout()), 'utf8');
    largest = Math.max(largest, bytes);
  }));
  assert.ok(largest < 24 * 1024, `largest workout payload is ${largest} bytes`);
});
