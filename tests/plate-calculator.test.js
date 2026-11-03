const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const PlateCalculator = require('../BenchApp/plate-calculator.js');

test('normalizes selected denominations without inventing unavailable plates', () => {
  assert.deepEqual(PlateCalculator.normalizePlates(['1,25', 2.5, 1.25, 25, 0, -5, '5kg', null, true, NaN, Infinity, 101]), [25, 2.5, 1.25]);
  assert.deepEqual(PlateCalculator.normalizePlates('1,25'), []);
  assert.deepEqual(PlateCalculator.normalizePlates([0.004, 1.234, 1.23]), [1.23]);
});

test('default gym plates round percentage weights to symmetric 2.5 kg steps', () => {
  const seventyFivePercent = PlateCalculator.calculate(95 * 0.75);
  assert.equal(seventyFivePercent.weight, 70);
  assert.equal(seventyFivePercent.exact, false);
  const eightyPercent = PlateCalculator.calculate(95 * 0.8);
  assert.equal(eightyPercent.weight, 75);
  assert.equal(PlateCalculator.calculate(77).weight, 77.5);
  assert.deepEqual(PlateCalculator.calculate(65).plates, [{ weight: 20, count: 1 }, { weight: 2.5, count: 1 }]);
});

test('nearest ties choose the lighter load, including a tie with an empty bar', () => {
  assert.equal(PlateCalculator.calculate(56.25).weight, 55);
  assert.equal(PlateCalculator.calculate(21.25).weight, 20);
  assert.equal(PlateCalculator.calculate(56.2501).weight, 57.5);
});

test('rounding respects the selected bar, not multiples from zero', () => {
  const result = PlateCalculator.calculate(45, { barWeight: 17.5 });
  assert.equal(result.weight, 45);
  assert.equal(result.perSide, 13.75);
  assert.equal(result.exact, true);
  assert.equal(PlateCalculator.calculate(25, { barWeight: 13.3 }).weight, 25.8);
});

test('targets below the bar return an empty bar without negative plates', () => {
  for (const mode of ['nearest', 'floor', 'ceil']) {
    assert.deepEqual(PlateCalculator.calculate(10, { mode }), { weight: 20, perSide: 0, plates: [], exact: false });
  }
  assert.equal(PlateCalculator.calculate(20).exact, true);
});

test('finds real reachable weights when denominations leave holes', () => {
  const options = { plates: [10, 15] };
  assert.equal(PlateCalculator.calculate(31, options).weight, 40);
  assert.equal(PlateCalculator.calculate(45, options).weight, 40);
  assert.equal(PlateCalculator.calculate(39, { ...options, mode: 'floor' }).weight, 20);
  assert.equal(PlateCalculator.calculate(41, { ...options, mode: 'ceil' }).weight, 50);
});

test('minimizes the number of plates even when greedy selection would fail', () => {
  assert.deepEqual(PlateCalculator.calculate(32, { plates: [4, 3] }), {
    weight: 32, perSide: 6, plates: [{ weight: 3, count: 2 }], exact: true
  });
  assert.deepEqual(PlateCalculator.calculate(100).plates, [{ weight: 25, count: 1 }, { weight: 15, count: 1 }]);
});

test('supports custom comma decimal denominations with integer accounting', () => {
  const result = PlateCalculator.calculate('22,4', { plates: ['0,3', '0,2'] });
  assert.equal(result.weight, 22.4);
  assert.equal(result.perSide, 1.2);
  assert.deepEqual(result.plates, [{ weight: 0.3, count: 4 }]);
  assert.equal(result.exact, true);
});

test('a single denomination and an empty inventory remain loadable', () => {
  assert.deepEqual(PlateCalculator.calculate(75, { plates: [25] }), {
    weight: 70, perSide: 25, plates: [{ weight: 25, count: 1 }], exact: false
  });
  assert.equal(PlateCalculator.calculate(75, { plates: [25], mode: 'ceil' }).weight, 120);
  assert.deepEqual(PlateCalculator.calculate(75, { plates: [] }), { weight: 20, perSide: 0, plates: [], exact: false });
});

test('directional modes produce strictly adjacent loads for adjustment buttons', () => {
  assert.equal(PlateCalculator.calculate(70.01, { mode: 'ceil' }).weight, 72.5);
  assert.equal(PlateCalculator.calculate(69.99, { mode: 'floor' }).weight, 67.5);
  assert.equal(PlateCalculator.calculate(70, { mode: 'ceil' }).weight, 70);
  assert.equal(PlateCalculator.calculate(70, { mode: 'floor' }).weight, 70);
  assert.equal(PlateCalculator.calculate(35.8, { plates: [0.01], mode: 'floor' }).weight, 35.8);
  assert.equal(PlateCalculator.calculate(35.8, { plates: [0.01], mode: 'ceil' }).weight, 35.8);
});

test('invalid targets and excessive searches fail clearly instead of freezing', () => {
  for (const target of [NaN, Infinity, '5kg', null, true, '']) {
    assert.throws(() => PlateCalculator.calculate(target), TypeError);
  }
  for (const target of [-1, 10001]) assert.throws(() => PlateCalculator.calculate(target), RangeError);
  assert.throws(() => PlateCalculator.calculate(50, { barWeight: Infinity }), TypeError);
  assert.throws(() => PlateCalculator.calculate(50, { mode: 'other' }), RangeError);
  const manyPlates = Array.from({ length: 100 }, (_, index) => (index + 1) / 100);
  assert.throws(() => PlateCalculator.calculate(10000, { plates: manyPlates }), RangeError);
});

test('all default layouts sum to their displayed total using selected plates only', () => {
  for (let target = 0; target <= 300; target += 0.37) {
    const result = PlateCalculator.calculate(target);
    const side = result.plates.reduce((sum, plate) => sum + plate.weight * plate.count, 0);
    assert.equal(side, result.perSide);
    assert.equal(20 + side * 2, result.weight);
    assert.ok(result.plates.every(plate => PlateCalculator.DEFAULT_PLATES.includes(plate.weight)));
    assert.ok(result.plates.every(plate => Number.isInteger(plate.count) && plate.count > 0));
  }
});

test('exposes the same API as a plain browser script', () => {
  const context = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../BenchApp/plate-calculator.js'), 'utf8'), context);
  assert.equal(context.PlateCalculator.calculate(76).weight, 75);
  assert.equal(context.PlateCalculator.normalizePlates(['1,25'])[0], 1.25);
});
