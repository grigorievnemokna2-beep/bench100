const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const appDirectory = path.join(__dirname, '../BenchApp');
const source = name => fs.readFileSync(path.join(appDirectory, name), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));

function savedData(overrides = {}) {
  return {
    version: 3,
    barWeight: 20,
    weightStep: 0.5,
    trainingDays: ['Вт', 'Чт', 'Вс'],
    cycles: [{
      id: 'cycle-1', name: 'Существующая проходка', maxWeight: 95, programVersion: 1,
      workouts: {
        '1-Пн': {
          exercises: { 0: { completedSets: 1, sets: { 0: { done: true, actualReps: 5, timestamp: '2026-10-25T08:00:00Z' } } } },
          date: '2026-10-25T08:00:00Z', completed: false
        }
      }
    }],
    ...overrides
  };
}

function createApp(data) {
  const storage = new Map(data === undefined ? [] : [['bench100_data', JSON.stringify(data)]]);
  const elements = new Map();
  const effects = { changes: 0, toasts: [], timerStarts: 0 };
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      value: '', textContent: '', innerHTML: '',
      classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
      focus() {}, select() {}
    });
    return elements.get(id);
  }
  const context = vm.createContext({
    console,
    location: { hostname: 'localhost', origin: 'http://localhost:3000' },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    document: {
      addEventListener() {},
      getElementById: element,
      querySelectorAll() { return []; },
      createElement() {
        return {
          textContent: '',
          get innerHTML() { return String(this.textContent).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'); }
        };
      }
    },
    window: {}, navigator: {},
    setTimeout() { return 1; }, clearTimeout() {}, clearInterval() {},
    confirm() { return true; },
    FileReader: class {
      readAsText(file) { this.onload({ target: { result: file.contents } }); }
    }
  });
  vm.runInContext(source('program-data.js'), context);
  vm.runInContext(source('plate-calculator.js'), context);
  vm.runInContext(`${source('garmin-sync.js')}\nthis.garmin = GarminSync;`, context);
  context.garmin.onAppDataChanged = () => { effects.changes++; };
  context.garmin.renderSettingsCard = () => '';
  vm.runInContext(`${source('app.js')}\nthis.app = App;`, context);
  const app = context.app;
  app.showToast = message => effects.toasts.push(message);
  app.renderSets = () => {};
  app.closeModal = () => {};
  app.showCycles = () => {};
  app.resetTimer = () => {};
  app.setTimer = seconds => { effects.timerSeconds = seconds; };
  app.toggleTimer = () => { effects.timerStarts++; };
  app.loadData();
  app.currentCycleId = app.data.cycles[0]?.id || null;
  app.currentWeek = 1;
  app.currentDay = 'Пн';
  app.currentExIndex = 0;
  context.garmin.app = app;
  context.garmin.config = context.garmin.defaultConfig();
  return { app, garmin: context.garmin, elements, element, storage, effects };
}

function firstExercise(app) {
  return app.getCycleProgram().find(week => week.week === 1).days.find(day => day.day === 'Пн').exercises[0];
}

function firstSaved(app) {
  return app.data.cycles[0].workouts['1-Пн'].exercises[0];
}

test('new installs have exactly the seven gym denominations and a 2.5 kg total step', () => {
  const { app, storage } = createApp();
  assert.equal(app.data.version, 4);
  assert.deepEqual(plain(app.data.availablePlates), [25, 20, 15, 10, 5, 2.5, 1.25]);
  assert.equal(app.data.availablePlates.includes(1), false);
  assert.equal(app.data.availablePlates.includes(0.5), false);
  assert.equal(app.roundWeight(76), 75);
  assert.equal(app.getPlateLoad(75.01, 20, 'ceil').weight, 77.5);
  assert.deepEqual(JSON.parse(storage.get('bench100_data')).availablePlates, [25, 20, 15, 10, 5, 2.5, 1.25]);
});

test('legacy migration preserves 71.5 kg actually shown while future plans become loadable', () => {
  const { app, storage } = createApp(savedData());
  const saved = firstSaved(app);
  assert.equal(saved.setWeights[0], 71.5);
  assert.equal(saved.sets[0].weightSnapshot, true);
  assert.equal(saved.sets[0].barWeightSnapshot, 20);
  assert.equal(saved.setWeights[1], undefined);
  assert.equal(app.roundWeight(95 * 0.75, firstExercise(app)), 70);
  assert.equal(app.getExerciseSetData(firstExercise(app), saved, 95).vol, 357.5);
  assert.equal(JSON.parse(storage.get('bench100_data')).cycles[0].workouts['1-Пн'].exercises[0].setWeights[0], 71.5);
  assert.equal(app.data.trainingDays.join(','), 'Вт,Чт,Вс');
});

test('migration never rewrites explicit actual weights or changes unfinished sets', () => {
  const data = savedData();
  const saved = data.cycles[0].workouts['1-Пн'].exercises[0];
  saved.setWeights = { 0: 63, 2: 72 };
  saved.sets[1] = { done: false };
  saved.sets[2] = { done: true, actualReps: 4, barWeightSnapshot: 15 };
  const { app } = createApp(data);
  assert.deepEqual(plain(firstSaved(app).setWeights), { 0: 63, 2: 72 });
  assert.equal(firstSaved(app).sets[0].weightSnapshot, undefined);
  assert.equal(firstSaved(app).sets[2].barWeightSnapshot, 15);
});

test('old backups missing inventory are repaired even if their version is already four', () => {
  const { app } = createApp(savedData({ version: 4 }));
  assert.equal(firstSaved(app).setWeights[0], 71.5);
  assert.equal(app.data.availablePlates.length, 7);
  assert.equal(app.roundWeight(71.25), 70);
});

test('inventory, bar and cycle maximum changes keep completed facts stable', () => {
  for (const action of ['plates', 'bar', 'max']) {
    const data = savedData({ version: 4, availablePlates: [25, 20, 15, 10, 5, 2.5, 1.25] });
    const { app, element } = createApp(data);
    if (action === 'plates') app.togglePlate(0.5);
    if (action === 'bar') app.saveBarWeightSetting('19');
    if (action === 'max') {
      element('modal-max-input').value = '100';
      app.saveNewMax();
    }
    assert.equal(firstSaved(app).setWeights[0], 70, action);
    assert.equal(firstSaved(app).sets[0].barWeightSnapshot, 20, action);
    const future = app.roundWeight(app.getCycle().maxWeight * 0.75, firstExercise(app));
    assert.equal(future, action === 'plates' ? 71 : action === 'bar' ? 71.5 : 75, action);
    assert.equal(app.getExerciseSetData(firstExercise(app), firstSaved(app), app.getCycle().maxWeight).vol, 350, action);
  }
});

test('custom plate input accepts a decimal comma and cannot remove the final denomination', () => {
  const { app, element, effects } = createApp(savedData({ version: 4, availablePlates: [1.25] }));
  app.togglePlate(1.25);
  assert.deepEqual(plain(app.data.availablePlates), [1.25]);
  assert.match(effects.toasts.at(-1), /хотя бы один/);
  element('settings-custom-plate').value = '0,5';
  app.addPlate();
  assert.deepEqual(plain(app.data.availablePlates), [1.25, 0.5]);
  assert.equal(firstSaved(app).setWeights[0], 70);
});

test('checking a percent set snapshots its displayed weight and bar immediately', () => {
  const data = savedData({ version: 4, availablePlates: [25, 20, 15, 10, 5, 2.5, 1.25] });
  data.cycles[0].workouts = {};
  const { app, effects, storage } = createApp(data);
  app.toggleSet(0);
  assert.equal(firstSaved(app).sets[0].done, true);
  assert.equal(firstSaved(app).setWeights[0], 70);
  assert.equal(firstSaved(app).sets[0].barWeightSnapshot, 20);
  assert.equal(firstSaved(app).sets[0].weightSnapshot, true);
  assert.equal(effects.timerStarts, 1);
  assert.equal(effects.timerSeconds, 180);
  app.toggleSet(0);
  app.toggleSet(0);
  assert.equal(firstSaved(app).setWeights[0], 70);
  assert.equal(firstSaved(app).sets[0].done, true);
  assert.equal(JSON.parse(storage.get('bench100_data')).cycles[0].workouts['1-Пн'].exercises[0].setWeights[0], 70);
});

test('entering actual repetitions auto-completes and freezes the percent weight', () => {
  const data = savedData({ version: 4, availablePlates: [25, 20, 15, 10, 5, 2.5, 1.25] });
  data.cycles[0].workouts = {};
  const { app, element } = createApp(data);
  app._repsSetIdx = 0;
  app._repsIsSuperset = false;
  element('modal-reps-input').value = '6';
  app.saveReps();
  assert.equal(firstSaved(app).sets[0].actualReps, 6);
  assert.equal(firstSaved(app).sets[0].done, true);
  assert.equal(firstSaved(app).completedSets, 1);
  assert.equal(firstSaved(app).setWeights[0], 70);
  app.saveBarWeightSetting('19');
  assert.equal(firstSaved(app).setWeights[0], 70);
  assert.equal(firstSaved(app).sets[0].barWeightSnapshot, 20);
});

test('a failed attempt with zero reps keeps an explicit historical correction without a timestamp', () => {
  const { app, element } = createApp(savedData());
  app._repsSetIdx = 1;
  app._repsIsSuperset = false;
  element('modal-reps-input').value = '0';
  app.saveReps();
  assert.equal(firstSaved(app).sets[1].actualReps, 0);
  assert.equal(firstSaved(app).sets[1].timestamp, undefined);
  assert.equal(firstSaved(app).setWeights[1], 70);
  app.saveSetWeight(1, 63, false);
  assert.equal(firstSaved(app).setWeights[1], 63);
});

test('dumbbell and cable percentages keep their own step and never show barbell plates', () => {
  const { app } = createApp();
  for (const name of ['Жим гантелей лёжа', 'Сгибание в нижнем блоке', 'Жим в тренажере', 'Махи в кроссовере']) {
    const exercise = { name, segments: [{ percent: 75, reps: 5, sets: 1 }] };
    assert.equal(app.isBarbellExercise(exercise), false, name);
    assert.equal(app.roundWeight(71.25, exercise), 71.5, name);
    assert.equal(app.roundWeight(9.6, exercise), 9.5, name);
    const html = app.renderPercentSets(exercise, null, 95);
    assert.match(html, /71\.5 кг/);
    assert.doesNotMatch(html, /set-plate-hint|Пустой гриф|на сторону/);
  }
});

test('barbell plus and minus use adjacent reachable loads while cable buttons stay at 0.5 kg', () => {
  const data = savedData({ version: 4, availablePlates: [15, 10] });
  data.cycles[0].workouts = {
    '1-Пн': { exercises: { 3: { weight: 40, sets: {}, setWeights: { 0: 40 } } } },
    '1-Ср': { exercises: { 2: { weight: 12.5, sets: {}, setWeights: { 0: 12.5 } } } }
  };
  const { app } = createApp(data);
  app.currentExIndex = 3;
  app.quickAdjustWeight(0, 0.5, false);
  assert.equal(app.getCycle().workouts['1-Пн'].exercises[3].setWeights[0], 50);
  app.quickAdjustWeight(0, -0.5, false);
  assert.equal(app.getCycle().workouts['1-Пн'].exercises[3].setWeights[0], 40);
  app.currentDay = 'Ср';
  app.currentExIndex = 2;
  app.quickAdjustWeight(0, 0.5, false);
  assert.equal(app.getCycle().workouts['1-Ср'].exercises[2].setWeights[0], 13);
  app.quickAdjustWeight(0, -0.5, false);
  assert.equal(app.getCycle().workouts['1-Ср'].exercises[2].setWeights[0], 12.5);
});

test('historical manual corrections remain exact even if no current plate combination fits', () => {
  const { app } = createApp(savedData());
  app.saveSetWeight(0, 63, false);
  assert.equal(firstSaved(app).setWeights[0], 63);
  assert.equal(firstSaved(app).sets[0].weightSnapshot, undefined);
  assert.equal(firstSaved(app).sets[0].barWeightSnapshot, 20);
  app.saveBarWeightSetting('19');
  assert.equal(firstSaved(app).setWeights[0], 63);
});

test('backup import applies legacy migration and keeps extra data intact', () => {
  const { app } = createApp();
  const legacy = savedData();
  legacy.cycles[0].notes = { '1-Пн': 'Историческая заметка' };
  legacy.cycles[0].workouts['1-Пн'].garmin = { avgHr: 120, calories: 400 };
  const event = { target: { value: 'backup.json', files: [{ contents: JSON.stringify(legacy) }] } };
  app.handleImport(event);
  app.currentCycleId = 'cycle-1';
  assert.equal(app.data.version, 4);
  assert.equal(firstSaved(app).setWeights[0], 71.5);
  assert.equal(app.data.availablePlates.length, 7);
  assert.equal(app.getCycle().notes['1-Пн'], 'Историческая заметка');
  assert.deepEqual(plain(app.getCycle().workouts['1-Пн'].garmin), { avgHr: 120, calories: 400 });
  assert.equal(event.target.value, '');
});

test('Garmin receives the same future calculation, preserved actual weights and unchanged cable weights', () => {
  const { app, garmin } = createApp(savedData());
  const cycle = app.getCycle();
  const exercise = firstExercise(app);
  const normalized = garmin.normalizeExercise(exercise, firstSaved(app), cycle, 0, false);
  assert.equal(normalized.s[0].w, 71.5);
  assert.equal(normalized.s[0].c, 1);
  assert.equal(normalized.s[1].w, 70);
  const dumbbell = { name: 'Жим гантелей', segments: [{ percent: 75, reps: 5, sets: 1 }] };
  assert.equal(garmin.normalizeExercise(dumbbell, null, cycle, 0, false).s[0].w, 71.5);
  const cable = { name: 'Сгибание в нижнем блоке', isIndividual: true, reps: 12, sets: 2 };
  const cableData = { sets: {}, setWeights: { 0: 12.5, 1: 13 } };
  assert.deepEqual(plain(garmin.normalizeExercise(cable, cableData, cycle, 0, false).s).map(set => set.w), [12.5, 13]);
});
