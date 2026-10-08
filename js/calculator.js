/* Validation and electrical maths. Everything here works in SI base units. */
(function (global) {
  'use strict';

  const NUMBER_PATTERN = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
  const MAX_INPUT = 1e15;

  function parseValue(raw, label) {
    const text = String(raw).trim();
    if (text === '') return { error: 'Please enter a value for ' + label.toLowerCase() + '.' };
    if (!NUMBER_PATTERN.test(text)) return { error: 'Please enter a valid numerical value.' };
    const value = Number(text);
    if (!isFinite(value)) return { error: 'Please enter a valid numerical value.' };
    if (value <= 0) return { error: label + ' must be greater than 0.' };
    if (value > MAX_INPUT) return { error: label + ' is too large.' };
    return { value };
  }

  // Remove float artifacts such as 4.999999999999999 without rounding inputs.
  const clean = (n) => Number(n.toPrecision(12));

  /**
   * mode: 'voltage' | 'current' | 'resistance' | 'power'
   * known: { voltage?, current?, resistance? } in SI units
   * Returns { values, main, symbolic } or { error }.
   */
  function solve(mode, known) {
    let { voltage: v, current: i, resistance: r } = known;
    let power;
    let symbolic;

    if (mode === 'voltage') { v = i * r; power = i * i * r; symbolic = 'V = I × R'; }
    else if (mode === 'current') { i = v / r; power = v * v / r; symbolic = 'I = V / R'; }
    else if (mode === 'resistance') { r = v / i; power = v * i; symbolic = 'R = V / I'; }
    else if (v !== undefined && i !== undefined) { r = v / i; power = v * i; symbolic = 'P = V × I'; }
    else if (i !== undefined && r !== undefined) { v = i * r; power = i * i * r; symbolic = 'P = I² × R'; }
    else if (v !== undefined && r !== undefined) { i = v / r; power = v * v / r; symbolic = 'P = V² / R'; }
    else return { error: 'Enter at least two values.' };

    const values = { voltage: v, current: i, resistance: r, power };
    for (const key in values) {
      if (!isFinite(values[key]) || values[key] <= 0) {
        return { error: 'Result is out of range. Check your values and units.' };
      }
      values[key] = clean(values[key]);
    }
    return { values, main: mode, symbolic };
  }

  global.Calc = { parseValue, solve };
})(window);
