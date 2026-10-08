/* Unit tables, SI conversion and readable result formatting. */
(function (global) {
  'use strict';

  const UNITS = {
    voltage:    { 'µV': 1e-6, 'mV': 1e-3, 'V': 1, 'kV': 1e3 },
    current:    { 'µA': 1e-6, 'mA': 1e-3, 'A': 1, 'kA': 1e3 },
    resistance: { 'mΩ': 1e-3, 'Ω': 1, 'kΩ': 1e3, 'MΩ': 1e6, 'GΩ': 1e9 },
    power:      { 'µW': 1e-6, 'mW': 1e-3, 'W': 1, 'kW': 1e3, 'MW': 1e6 }
  };
  const BASE = { voltage: 'V', current: 'A', resistance: 'Ω', power: 'W' };

  function toBase(value, unit, quantity) {
    return value * UNITS[quantity][unit];
  }

  // Up to 4 significant digits, no float artifacts, no exponent notation.
  function trimNumber(n) {
    return Number(n.toPrecision(4)).toLocaleString('en-US', {
      maximumFractionDigits: 6,
      useGrouping: false
    });
  }

  function format(value, quantity) {
    const base = BASE[quantity];
    if (typeof value !== 'number' || !isFinite(value)) {
      return { number: '—', unit: base, text: '—' };
    }
    if (value === 0) return { number: '0', unit: base, text: '0 ' + base };

    const rounded = Number(value.toPrecision(4)); // so 999.96 mA becomes 1 A
    const entries = Object.entries(UNITS[quantity]).sort((a, b) => a[1] - b[1]);
    let chosen = entries[0];
    entries.forEach((entry) => {
      if (Math.abs(rounded) / entry[1] >= 1 - 1e-9) chosen = entry;
    });
    const number = trimNumber(rounded / chosen[1]);
    return { number, unit: chosen[0], text: number + ' ' + chosen[0] };
  }

  global.Units = { UNITS, BASE, toBase, format };
})(window);
