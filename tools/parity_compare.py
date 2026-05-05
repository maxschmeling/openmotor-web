import json
import sys
import types
from pathlib import Path

OPENMOTOR_SRC = Path('/tmp/openmotor-src')
OPENMOTOR_WEB = Path('/tmp/openmotor-web/src/openmotor_py')
TOOLS_DIR = Path('/tmp/openmotor-web/tools')


def unload_modules(prefixes=('motorlib', 'mathlib', 'motor_desktop')):
    for key in list(sys.modules.keys()):
        if any(key == p or key.startswith(p + '.') for p in prefixes):
            del sys.modules[key]


def load_desktop_env():
    sys.path.insert(0, str(TOOLS_DIR))
    sys.path.insert(0, str(OPENMOTOR_SRC))
    import importlib
    motor_mod = importlib.import_module('motor_desktop')
    prop_mod = importlib.import_module('motorlib.propellant')
    from desktop_grains.bates import BatesGrain
    from desktop_grains.star import StarGrain
    from desktop_grains.finocyl import Finocyl
    from desktop_grains.moonBurner import MoonBurner
    grains_mod = types.SimpleNamespace(
        BatesGrain=BatesGrain,
        StarGrain=StarGrain,
        Finocyl=Finocyl,
        MoonBurner=MoonBurner,
    )
    return motor_mod, prop_mod, grains_mod


def load_web_env():
    sys.path.insert(0, str(OPENMOTOR_WEB))
    import importlib
    motor_mod = importlib.import_module('motorlib.motor')
    prop_mod = importlib.import_module('motorlib.propellant')
    grains_mod = importlib.import_module('motorlib.grains')
    return motor_mod, prop_mod, grains_mod


def make_motor(motor_mod, prop_mod, grains_mod, grain_name, grain_props):
    m = motor_mod.Motor()
    g = getattr(grains_mod, grain_name)()
    g.setProperties(grain_props)
    m.grains.append(g)
    m.nozzle.setProperties({
        'throat': 0.01428,
        'exit': 0.02,
        'efficiency': 0.95,
        'divAngle': 15,
        'convAngle': 45,
        'throatLength': 0.005,
        'slagCoeff': 0,
        'erosionCoeff': 0,
    })
    m.propellant = prop_mod.Propellant()
    m.propellant.setProperties({
        'name': 'KNSU',
        'density': 1890,
        'tabs': [{
            'minPressure': 0,
            'maxPressure': 6895000,
            'a': 0.000101,
            'n': 0.319,
            't': 1720,
            'm': 41.98,
            'k': 1.133
        }]
    })
    return m, g


def run_probe(motor_mod, prop_mod, grains_mod, grain_name, grain_props):
    print(f"start {grain_name}", file=sys.stderr, flush=True)
    m, g = make_motor(motor_mod, prop_mod, grains_mod, grain_name, grain_props)
    config = motor_mod.MotorConfig()
    config.setProperties({'mapDim': 401})
    print(f"setup {grain_name}", file=sys.stderr, flush=True)
    g.simulationSetup(config)
    print(f"setup-done {grain_name}", file=sys.stderr, flush=True)
    sim = None
    sim_error = None
    print(f"sim {grain_name}", file=sys.stderr, flush=True)
    try:
        sim = m.runSimulation()
    except Exception as exc:
        sim_error = repr(exc)
    out = {
        'wallWeb': float(g.wallWeb) if getattr(g, 'wallWeb', None) is not None else None,
        'faceArea0': float(g.getFaceArea(0)) if hasattr(g, 'getFaceArea') else None,
        'perimeter0': float(g.getCorePerimeter(0)) if hasattr(g, 'getCorePerimeter') else None,
        'simError': sim_error,
        'kn0': float(m.calcKN([0], 0)),
        'pressure0': float(m.calcIdealPressure([0], 0)),
    }
    print(f"sim-done {grain_name} err={sim_error}", file=sys.stderr, flush=True)
    if sim is not None:
        out['sim'] = {
            'success': bool(sim.success),
            'burnTime': float(sim.getBurnTime()) if sim.channels['time'].data else None,
            'peakPressure': float(sim.getMaxPressure()) if sim.channels['pressure'].data else None,
            'impulse': float(sim.getImpulse()) if sim.channels['force'].data else None,
            'designation': sim.getDesignation() if sim.channels['force'].data else None,
            'samples': len(sim.channels['time'].data),
        }
    return out


def pct(a, b):
    if a is None or b is None:
        return None
    if a == 0 and b == 0:
        return 0.0
    if a == 0:
        return None
    return ((b - a) / a) * 100.0


def compare_case(label, grain_name, grain_props):
    unload_modules()
    desktop = run_probe(*load_desktop_env(), grain_name, grain_props)
    unload_modules()
    browser = run_probe(*load_web_env(), grain_name, grain_props)
    comp = {
        'label': label,
        'grain': grain_name,
        'desktop': desktop,
        'browserFallback': browser,
        'deltaPct': {
            'wallWeb': pct(desktop['wallWeb'], browser['wallWeb']),
            'faceArea0': pct(desktop['faceArea0'], browser['faceArea0']),
            'perimeter0': pct(desktop['perimeter0'], browser['perimeter0']),
        }
    }
    if 'sim' in desktop and 'sim' in browser:
        comp['deltaPct']['burnTime'] = pct(desktop['sim']['burnTime'], browser['sim']['burnTime'])
        comp['deltaPct']['peakPressure'] = pct(desktop['sim']['peakPressure'], browser['sim']['peakPressure'])
        comp['deltaPct']['impulse'] = pct(desktop['sim']['impulse'], browser['sim']['impulse'])
    return comp


cases = [
    ('Star 6-point', 'StarGrain', {
        'diameter': 0.05,
        'length': 0.1,
        'numPoints': 6,
        'pointLength': 0.015,
        'pointWidth': 0.01,
        'inhibitedEnds': 'Both'
    }),
]

print(json.dumps([compare_case(*case) for case in cases], indent=2))
