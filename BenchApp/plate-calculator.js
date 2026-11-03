// Symmetric barbell loading by available denominations (each denomination is a pair).
// The number of pairs is unrestricted; quantities can be added separately if needed.
(function (root, factory) {
  const calculator = factory();
  if (typeof module === 'object' && module.exports) module.exports = calculator;
  else root.PlateCalculator = calculator;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DEFAULT_PLATES = Object.freeze([25, 20, 15, 10, 5, 2.5, 1.25]);
  const MAX_WEIGHT = 10000;
  const MAX_SEARCH_STEPS = 20000000;

  function numeric(value) {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string' || !value.trim()) return NaN;
    return Number(value.trim().replace(',', '.'));
  }

  function normalizePlates(values) {
    if (!Array.isArray(values)) return [];
    const cents = values.map(numeric)
      .filter(value => Number.isFinite(value) && value > 0 && value <= 100)
      .map(value => Math.round(value * 100))
      .filter(value => value > 0);
    return [...new Set(cents)].sort((a, b) => b - a).map(value => value / 100);
  }

  function gcd(a, b) {
    while (b) {
      const remainder = a % b;
      a = b;
      b = remainder;
    }
    return a;
  }

  /**
   * Return a loadable total and the minimum-count plate combination on ONE side.
   * nearest chooses the lower total on a tie; floor/ceil select a directional total.
   * All totals are at least the bar weight. Invalid values or unreasonable searches
   * throw instead of blocking the browser (total/bar limit: 10,000 kg).
   */
  function calculate(targetWeight, options = {}) {
    const target = numeric(targetWeight);
    const bar = numeric(options.barWeight === undefined ? 20 : options.barWeight);
    const mode = options.mode === undefined ? 'nearest' : options.mode;
    if (!Number.isFinite(target) || !Number.isFinite(bar)) {
      throw new TypeError('Вес штанги и грифа должен быть конечным числом.');
    }
    if (target < 0 || bar < 0 || target > MAX_WEIGHT || bar > MAX_WEIGHT) {
      throw new RangeError('Вес должен находиться в диапазоне от 0 до 10000 кг.');
    }
    if (!['nearest', 'floor', 'ceil'].includes(mode)) {
      throw new RangeError('Неизвестный способ округления веса.');
    }

    const barCents = Math.round(bar * 100);
    const denominations = normalizePlates(options.plates === undefined ? DEFAULT_PLATES : options.plates);
    const result = (sideCents, breakdown) => {
      const weight = (barCents + sideCents * 2) / 100;
      return {
        weight,
        perSide: sideCents / 100,
        plates: breakdown,
        exact: Math.abs(weight - target) < 1e-9
      };
    };
    if (target * 100 <= barCents || !denominations.length) return result(0, []);

    const plateCents = denominations.map(weight => Math.round(weight * 100));
    const scale = plateCents.reduce(gcd);
    const units = plateCents.map(value => value / scale);
    const rawDesired = (target * 100 - barCents) / (2 * scale);
    // Decimal arithmetic may put an exactly loadable target just below an integer.
    const desired = Math.abs(rawDesired - Math.round(rawDesired)) < 1e-9
      ? Math.round(rawDesired) : rawDesired;
    const smallest = units[units.length - 1];
    // Repeating the smallest plate guarantees one reachable upper candidate.
    const limit = mode === 'floor' ? Math.floor(desired) : Math.ceil(desired / smallest) * smallest;
    const usable = units.filter(value => value <= limit);
    if (limit * Math.max(usable.length, 1) > MAX_SEARCH_STEPS) {
      throw new RangeError('Слишком большой диапазон расчёта блинов.');
    }

    const counts = new Int32Array(limit + 1);
    const last = new Int32Array(limit + 1);
    counts.fill(-1);
    last.fill(-1);
    counts[0] = 0;
    for (let amount = 1; amount <= limit; amount++) {
      for (const coin of usable) {
        if (coin <= amount && counts[amount - coin] >= 0) {
          const nextCount = counts[amount - coin] + 1;
          if (counts[amount] < 0 || nextCount < counts[amount]) {
            counts[amount] = nextCount;
            last[amount] = coin;
          }
        }
      }
    }

    let lower = Math.min(Math.floor(desired), limit);
    while (lower > 0 && counts[lower] < 0) lower--;
    let selected = lower;
    if (mode !== 'floor') {
      let upper = Math.ceil(desired);
      while (upper < limit && counts[upper] < 0) upper++;
      if (mode === 'ceil' || upper - desired < desired - lower - 1e-9) selected = upper;
    }

    const byUnit = new Map();
    for (let remaining = selected; remaining > 0;) {
      const coin = last[remaining];
      byUnit.set(coin, (byUnit.get(coin) || 0) + 1);
      remaining -= coin;
    }
    const breakdown = units.filter(coin => byUnit.has(coin))
      .map(coin => ({ weight: coin * scale / 100, count: byUnit.get(coin) }));
    return result(selected * scale, breakdown);
  }

  return Object.freeze({ DEFAULT_PLATES, normalizePlates, calculate });
});
