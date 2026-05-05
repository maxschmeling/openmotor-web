# Parity comparison summary

Compared desktop openMotor against the browser Pyodide fallback for representative grains.

## Result snapshot

### BATES
- Exact match across tested outputs
- Burn time / peak pressure / impulse all matched in this harness

### Star / Finocyl / MoonBurner
- `wallWeb` matched
- `faceArea0` matched
- simulation currently fails in the browser fallback path with `KeyError('a')`
- perimeter probing also surfaced `NaN` behavior in the pure-Python perimeter fallback when masked arrays are involved

## Interpretation

This is encouraging but incomplete.

The distance-transform fallback is good enough to preserve some initial geometry metrics, but it is **not yet robust enough** to drive full FMM-grain simulation parity.

The immediate issue appears to be in the regression/perimeter path for masked arrays, not in the overall Pyodide strategy itself.

## Practical conclusion

- Pyodide reuse of openMotor core: **viable**
- Non-FMM grains: **working**
- FMM-grain browser fallback: **promising but not simulation-safe yet**
- Next work: fix masked-array / contour / perimeter behavior and re-run comparisons
