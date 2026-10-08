# Ohm's Law Calculator

Calculate voltage, current, resistance and power. Pure HTML, CSS and JavaScript — no build step, no dependencies.

Live: https://kennenthhartono.github.io/ohms-law-calculator/

## Deploy to GitHub Pages
1. Push this folder to a repository named `ohms-law-calculator`.
2. Settings → Pages → Deploy from branch → `main` / root.

## Structure
- `index.html` — page markup
- `css/style.css` — styling
- `js/units.js` — unit tables, SI conversion, result formatting
- `js/calculator.js` — validation, Ohm's law and power maths
- `js/app.js` — DOM, presets, reset, copy

## Notes
All maths runs in SI base units; only final results are rounded for display. Open `index.html` directly or serve with any static server.
