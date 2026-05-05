# openmotor-web

Pyodide spike for running openMotor simulation code entirely in the browser.

## Goal

Prove that we can reuse the existing Python simulation core from `reilleya/openMotor` in a static web app with no backend.

## Current status

### Working
- Browser-only app via Vite
- Pyodide loads in-browser
- Reused `motorlib` and `mathlib` Python code vendored from openMotor
- `numpy` and `scipy` load in Pyodide
- A real BATES motor simulation runs in-browser and returns results

### Not working yet
- `scikit-fmm` is not available in the current Pyodide environment
- FMM-based grains are therefore not available yet:
  - Finocyl
  - MoonBurner
  - Star
  - XCore
  - CGrain
  - DGrain
  - RodTube
  - Conical
  - Custom
- The original Cython perimeter helper was replaced with a pure Python fallback for the browser spike

## Why this matters

This proves the Pyodide path is viable for at least part of the simulation engine. The next technical question is whether we can:

1. get `scikit-fmm` working in Pyodide,
2. replace it with another browser-compatible implementation, or
3. temporarily ship a reduced browser MVP that supports non-FMM grains first.

## Dev

```bash
npm install
npm run dev
```

Then open the local app and click the smoke test button.

## Notes

This repo intentionally focuses on the risky simulation-runtime question first, before investing in real UI work.
