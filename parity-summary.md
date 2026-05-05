# Parity comparison summary

Compared desktop openMotor against the browser Pyodide fallback for representative grains.

## Current result

### BATES
- Exact match across tested outputs
- Burn time / peak pressure / impulse matched in the harness

### FMM-style grain geometry
Tested:
- Star
- Finocyl
- MoonBurner

For these, the browser fallback now matches desktop on the geometry metrics tested:
- `wallWeb`
- `faceArea0`
- `perimeter0`

Observed deltas were effectively zero in this harness (floating-point noise only).

## What changed

The earlier failures were caused by the pure-Python marching-squares perimeter helper mishandling masked arrays and converting masked values into `NaN` in a way that polluted contour logic.

That path was fixed by explicitly preparing the input array and skipping cells containing `NaN` values.

## Important caveat

This is a strong signal, but it is still not full scientific parity proof.

What has been shown:
- Pyodide reuse of openMotor core is viable
- browser fallback geometry for tested FMM grains can closely match desktop for the sampled metrics
- non-FMM simulation works in-browser

What is still not shown:
- full FMM-grain simulation parity across burn curves and outputs
- parity across all grain families
- behavior for `CustomGrain` / `scikit-image` dependent paths

## Practical conclusion

The browser port is looking much more realistic now.

The next best step is to extend the harness so FMM-grain full simulations are compared end-to-end, not just geometry-derived metrics.
