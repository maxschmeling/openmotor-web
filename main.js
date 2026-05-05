import { loadPyodide } from 'https://cdn.jsdelivr.net/pyodide/v0.27.2/full/pyodide.mjs';

const runBtn = document.getElementById('run');
const statusEl = document.getElementById('status');
const outputEl = document.getElementById('output');

const files = import.meta.glob('./src/openmotor_py/**/*.py', { query: '?raw', import: 'default', eager: true });

let pyodidePromise;

async function ensurePyodide() {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      const pyodide = await loadPyodide();
      await pyodide.loadPackage(['numpy', 'scipy']);
      for (const [path, content] of Object.entries(files)) {
        const rel = path.replace('./src/openmotor_py/', '');
        const full = `/openmotor_py/${rel}`;
        const dir = full.substring(0, full.lastIndexOf('/'));
        pyodide.FS.mkdirTree(dir);
        pyodide.FS.writeFile(full, content);
      }
      await pyodide.runPythonAsync(`
import sys
sys.path.insert(0, '/openmotor_py')
`);
      return pyodide;
    })();
  }
  return pyodidePromise;
}

const script = `
import json
import traceback

result = {}
try:
    import motorlib.motor
    import motorlib.grains
    import motorlib.propellant

    tm = motorlib.motor.Motor()
    tc = motorlib.motor.MotorConfig()

    bg = motorlib.grains.BatesGrain()
    bg.setProperties({
        'diameter': 0.083058,
        'length': 0.1397,
        'coreDiameter': 0.05,
        'inhibitedEnds': 'Neither'
    })
    tm.grains.append(bg)
    bg.simulationSetup(tc)

    tm.nozzle.setProperties({
        'throat': 0.01428,
        'exit': 0.02,
        'efficiency': 0.95,
        'divAngle': 15,
        'convAngle': 45,
        'throatLength': 0.005,
        'slagCoeff': 0,
        'erosionCoeff': 0,
    })

    tm.propellant = motorlib.propellant.Propellant()
    tm.propellant.setProperties({
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

    kn0 = tm.calcKN([0], 0)
    p0 = tm.calcIdealPressure([0], 0)
    result['smoke'] = {
        'kn0': kn0,
        'pressure0': p0,
    }

    sim = tm.runSimulation()
    result['simulation'] = {
        'success': sim.success,
        'alerts': [a.description for a in sim.alerts],
        'burnTime': sim.getBurnTime() if sim.channels['time'].data else None,
        'peakPressure': sim.getMaxPressure() if sim.channels['pressure'].data else None,
        'impulse': sim.getImpulse() if sim.channels['force'].data else None,
        'designation': sim.getDesignation() if sim.channels['force'].data else None,
        'samples': len(sim.channels['time'].data),
    }
except Exception as exc:
    result = {
        'error': str(exc),
        'traceback': traceback.format_exc(),
    }
json.dumps(result)
`;

runBtn.addEventListener('click', async () => {
  runBtn.disabled = true;
  outputEl.textContent = '';
  statusEl.textContent = 'Loading Pyodide and Python deps...';
  try {
    const pyodide = await ensurePyodide();
    statusEl.textContent = 'Running simulation...';
    const raw = await pyodide.runPythonAsync(script);
    const result = JSON.parse(raw);
    outputEl.textContent = JSON.stringify(result, null, 2);
    statusEl.innerHTML = result.error
      ? '<span class="err">Simulation failed.</span>'
      : '<span class="ok">Simulation ran.</span>';
  } catch (err) {
    outputEl.textContent = String(err?.stack || err);
    statusEl.innerHTML = '<span class="err">Pyodide bootstrap failed.</span>';
  } finally {
    runBtn.disabled = false;
  }
});
