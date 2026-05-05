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
- A browser fallback now lets FMM-style grains compute regression-derived geometry values without `scikit-fmm`

### Important caveat
The current FMM fallback is **not equivalent to `scikit-fmm`**.

It uses a Euclidean distance transform (`scipy.ndimage.distance_transform_edt`) over the generated grain mask as a browser-compatible approximation for the regression map.

That means:
- it is good enough for viability testing
- it may be good enough for a reduced browser MVP
- it is **not yet validated for parity** with desktop openMotor
- it should not be presented as scientifically equivalent without comparison work

### Not working yet
- `scikit-fmm` is still not available in the current Pyodide environment
- `CustomGrain` still depends on `scikit-image`, which is not currently loaded in the spike
- full parity against desktop openMotor has not been measured
- UI work is intentionally minimal

## Why this matters

This proves the Pyodide path is viable for a meaningful subset of the simulation engine, and that the hardest dependency (`scikit-fmm`) can at least be approximated in-browser well enough to keep exploring.

## Dev

```bash
npm install
npm run dev
```

Then open the local app and click the smoke test button.

## Notes

This repo intentionally focuses on the risky simulation-runtime question first, before investing in real UI work.
