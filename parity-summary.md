# Parity comparison summary

Compared desktop openMotor against the browser Pyodide fallback for representative grains.

## Confirmed working

### BATES
- Exact match across tested outputs
- Burn time / peak pressure / impulse matched in the harness

### FMM-style geometry
Tested:
- Star
- Finocyl
- MoonBurner

For these, the browser fallback matches desktop on the geometry metrics tested:
- `wallWeb`
- `faceArea0`
- `perimeter0`

Observed deltas were effectively zero in this harness (floating-point noise only).

## Current blocker for full FMM simulation parity

When extending the harness to run full desktop-vs-browser simulations for FMM grains, the browser fallback path stalled during `runSimulation()` for the tested Star grain case.

That means:
- the geometry/regression-map side now looks healthy
- the next issue is deeper in the simulation loop under browser-fallback conditions
- the likely culprit is an interaction between the fallback distance-map behavior and later simulation-step calculations (mass flux / Mach / pressure evolution), not the contour helper anymore

## Practical conclusion

This is still encouraging:
- Pyodide reuse of openMotor core is viable
- non-FMM grains are working end-to-end
- FMM grain geometry parity looks strong for tested cases

But full FMM simulation parity is **not proven yet**.

## Recommended next step

Instrument the browser-fallback `runSimulation()` loop for one FMM grain and identify where it stops progressing:
- regression increment (`dRegDist`)
- pressure / Kn evolution
- Mach calculation
- burnout termination conditions

That should reveal whether the fallback needs:
1. a numeric guard/fix, or
2. a more faithful distance-map implementation for dynamic simulation.
