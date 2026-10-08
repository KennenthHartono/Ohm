/* DOM, UI state, presets, reset and copy. */
(function () {
  'use strict';
  const { Units, Calc } = window;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  const QUANTITIES = ['voltage', 'current', 'resistance'];
  const LABEL = { voltage: 'Voltage', current: 'Current', resistance: 'Resistance', power: 'Power' };
  const LETTER = { voltage: 'V', current: 'I', resistance: 'R', power: 'P' };
  const DEFAULT_UNIT = { voltage: 'V', current: 'A', resistance: 'Ω' };

  const PRESETS = {
    led:      { mode: 'current',    voltage: ['5', 'V'],   resistance: ['220', 'Ω'] },
    esp32:    { mode: 'resistance', voltage: ['3.3', 'V'], current: ['80', 'mA'] },
    motor:    { mode: 'power',      voltage: ['12', 'V'],  current: ['2', 'A'] },
    resistor: { mode: 'voltage',    resistance: ['1', 'kΩ'], current: ['10', 'mA'] }
  };

  let mode = 'voltage';
  let lastResult = null;

  const form = $('#calc-form');
  const formError = $('#form-error');
  const output = $('#output');

  // Fill every unit <select> from the unit tables.
  QUANTITIES.forEach((q) => {
    const select = $('#unit-' + q);
    Object.keys(Units.UNITS[q]).forEach((unit) => select.add(new Option(unit, unit)));
    select.value = DEFAULT_UNIT[q];
  });

  function showError(q, message) {
    const el = q ? $('#err-' + q) : formError;
    el.textContent = message;
    if (q) $('#in-' + q).setAttribute('aria-invalid', 'true');
  }

  function clearErrors() {
    $$('.error').forEach((el) => { el.textContent = ''; });
    $$('input[type="text"]').forEach((el) => el.removeAttribute('aria-invalid'));
  }

  function applyMode() {
    QUANTITIES.forEach((q) => {
      const input = $('#in-' + q);
      const isOutput = q === mode;
      input.disabled = isOutput;
      input.closest('.field').classList.toggle('is-output', isOutput);
      input.placeholder = isOutput ? 'calculated' : 'enter value';
      if (isOutput) input.value = '';
    });
    $('#mode-hint').textContent = mode === 'power'
      ? 'Enter any two values. Power is calculated from them.'
      : 'Enter the two known values.';
    $$('[data-eq]').forEach((el) => el.classList.toggle('active', el.dataset.eq === mode));
    $$('[data-letter]').forEach((el) => el.classList.toggle('target', el.dataset.letter === LETTER[mode]));
    $('#mode-' + mode).checked = true;
  }

  function readInputs() {
    clearErrors();
    const known = {};
    let valid = true;
    QUANTITIES.filter((q) => q !== mode).forEach((q) => {
      const raw = $('#in-' + q).value;
      if (mode === 'power' && raw.trim() === '') return;
      const parsed = Calc.parseValue(raw, LABEL[q]);
      if (parsed.error) { showError(q, parsed.error); valid = false; return; }
      known[q] = Units.toBase(parsed.value, $('#unit-' + q).value, q);
    });
    if (valid && mode === 'power' && Object.keys(known).length < 2) {
      showError(null, 'Enter at least two values.');
      valid = false;
    }
    return valid ? known : null;
  }

  const fmt = (value, q) => Units.format(value, q);

  function buildSubstitution(result, known) {
    const f = (q) => fmt(known[q], q).text;
    const v = result.values;
    switch (result.symbolic) {
      case 'V = I × R': return 'V = ' + f('current') + ' × ' + f('resistance');
      case 'I = V / R': return 'I = ' + f('voltage') + ' / ' + f('resistance');
      case 'R = V / I': return 'R = ' + f('voltage') + ' / ' + f('current');
      case 'P = V × I': return 'P = ' + fmt(v.voltage, 'voltage').text + ' × ' + fmt(v.current, 'current').text;
      case 'P = I² × R': return 'P = (' + fmt(v.current, 'current').text + ')² × ' + fmt(v.resistance, 'resistance').text;
      default: return 'P = (' + fmt(v.voltage, 'voltage').text + ')² / ' + fmt(v.resistance, 'resistance').text;
    }
  }

  function render(result, known) {
    const v = result.values;
    const shown = {
      voltage: fmt(v.voltage, 'voltage'), current: fmt(v.current, 'current'),
      resistance: fmt(v.resistance, 'resistance'), power: fmt(v.power, 'power')
    };
    const main = shown[result.main];
    $('#main-label').textContent = LABEL[result.main];
    $('#main-value').textContent = main.text;
    Object.keys(shown).forEach((q) => { $('#stat-' + q).textContent = shown[q].text; });

    $('#formula-lines').textContent =
      result.symbolic + '\n' + buildSubstitution(result, known) + '\n' + LETTER[result.main] + ' = ' + main.text;

    $('#c-i').textContent = 'I = ' + shown.current.text;
    $('#c-r').textContent = 'R = ' + shown.resistance.text;
    $('#c-v').textContent = 'V = ' + shown.voltage.text;
    $('#c-p').textContent = 'P = ' + shown.power.text;
    $('#dissipation-value').textContent = 'Calculated: ' + shown.power.text;

    output.classList.remove('is-empty', 'flash');
    void output.offsetWidth; // restart the animation
    output.classList.add('flash');

    lastResult = {
      text: "Ohm's Law Calculation\n\nVoltage: " + shown.voltage.text + '\nCurrent: ' + shown.current.text +
        '\nResistance: ' + shown.resistance.text + '\nPower: ' + shown.power.text + '\n\nFormula:\n' + result.symbolic
    };
    $('#copy-btn').disabled = false;
  }

  function clearOutput() {
    lastResult = null;
    output.classList.add('is-empty');
    $('#copy-btn').disabled = true;
    $('#copy-status').textContent = '';
    $('#formula-lines').textContent = '';
    $('#main-label').textContent = LABEL[mode];
    $('#main-value').textContent = '—';
    QUANTITIES.concat('power').forEach((q) => { $('#stat-' + q).textContent = '—'; });
    $('#c-i').textContent = 'I = —';
    $('#c-r').textContent = 'R = —';
    $('#c-v').textContent = 'V = —';
    $('#c-p').textContent = 'P = —';
    $('#dissipation-value').textContent = 'Calculated: —';
  }

  function calculate() {
    $('#copy-status').textContent = '';
    const known = readInputs();
    if (!known) { clearOutput(); return; }
    const result = Calc.solve(mode, known);
    if (result.error) { showError(null, result.error); clearOutput(); return; }
    render(result, known);
  }

  function setMode(next) {
    mode = next;
    applyMode();
    clearErrors();
    clearOutput();
  }

  function applyPreset(name) {
    const preset = PRESETS[name];
    mode = preset.mode;
    QUANTITIES.forEach((q) => {
      const entry = preset[q];
      $('#in-' + q).value = entry ? entry[0] : '';
      $('#unit-' + q).value = entry ? entry[1] : DEFAULT_UNIT[q];
    });
    applyMode();
    calculate();
  }

  function reset() {
    form.reset();
    QUANTITIES.forEach((q) => { $('#unit-' + q).value = DEFAULT_UNIT[q]; });
    mode = 'voltage';
    applyMode();
    clearErrors();
    clearOutput();
  }

  async function copyResult() {
    if (!lastResult) return;
    const status = $('#copy-status');
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(lastResult.text);
      } else {
        const area = document.createElement('textarea');
        area.value = lastResult.text;
        area.setAttribute('readonly', '');
        area.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand('copy');
        area.remove();
        if (!ok) throw new Error('copy failed');
      }
      status.textContent = 'Result copied.';
    } catch (err) {
      status.textContent = 'Copy is not available in this browser. Select the result text and copy it manually.';
    }
  }

  $$('input[name="mode"]').forEach((radio) => radio.addEventListener('change', () => setMode(radio.value)));
  form.addEventListener('submit', (event) => { event.preventDefault(); calculate(); });
  $('#reset-btn').addEventListener('click', reset);
  $('#copy-btn').addEventListener('click', copyResult);
  $$('[data-preset]').forEach((btn) => btn.addEventListener('click', () => applyPreset(btn.dataset.preset)));

  reset();
})();
