import { loadPyodide } from 'https://cdn.jsdelivr.net/pyodide/v0.27.2/full/pyodide.mjs'
const files = import.meta.glob('../openmotor_py/**/*.py', { query: '?raw', import: 'default', eager: true })
let pyodidePromise

export async function getPyodide() {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      const pyodide = await loadPyodide()
      await pyodide.loadPackage(['numpy', 'scipy'])
      for (const [path, content] of Object.entries(files)) {
        const rel = path.replace('../openmotor_py/', '')
        const full = `/openmotor_py/${rel}`
        pyodide.FS.mkdirTree(full.substring(0, full.lastIndexOf('/')))
        pyodide.FS.writeFile(full, content)
      }
      await pyodide.runPythonAsync(`import sys\nsys.path.insert(0, '/openmotor_py')`)
      return pyodide
    })()
  }
  return pyodidePromise
}

async function runPythonJson(script, globals = {}) {
  const pyodide = await getPyodide()
  for (const [key, value] of Object.entries(globals)) {
    pyodide.globals.set(key, typeof value === 'string' ? value : JSON.stringify(value))
  }
  const raw = await pyodide.runPythonAsync(script)
  return JSON.parse(raw)
}

export function runMotorSimulation(motor) {
  return runPythonJson(`
import json, traceback
result = {}
try:
    import motorlib.motor
    m = motorlib.motor.Motor(json.loads(motor_input_json))
    sim = m.runSimulation()
    channels = {}
    for name, channel in sim.channels.items():
        try:
            channels[name] = channel.getData()
        except Exception:
            channels[name] = channel.data
    result = {
        'success': sim.success,
        'alerts': [{'level': a.level.name, 'type': a.type.name, 'description': a.description, 'location': a.location} for a in sim.alerts],
        'stats': {
            'designation': sim.getDesignation() if sim.channels['force'].data else None,
            'impulse': sim.getImpulse() if sim.channels['force'].data else None,
            'isp': sim.getISP() if sim.channels['force'].data else None,
            'burnTime': sim.getBurnTime() if sim.channels['time'].data else None,
            'volumeLoading': sim.getVolumeLoading(),
            'avgPressure': sim.getAveragePressure() if sim.channels['pressure'].data else None,
            'peakPressure': sim.getMaxPressure() if sim.channels['pressure'].data else None,
            'initialKn': sim.getInitialKN() if sim.channels['kn'].data else None,
            'peakKn': sim.getPeakKN() if sim.channels['kn'].data else None,
            'propellantMass': sim.getPropellantMass() if sim.channels['mass'].data else None,
            'portRatio': sim.getPortRatio(),
            'peakMassFlux': sim.getPeakMassFlux(),
            'deliveredThrustCoeff': sim.getAdjustedThrustCoefficient() if sim.channels['force'].data else None
        },
        'channels': channels
    }
except Exception as exc:
    result = {'error': str(exc), 'traceback': traceback.format_exc()}
json.dumps(result)
`, { motor_input_json: motor })
}

export function exportRicYaml(motor) {
  return runPythonJson(`
import json, traceback
result = {}
try:
    import yaml
    result = {'yaml': yaml.safe_dump(json.loads(motor_input_json), sort_keys=False)}
except Exception as exc:
    result = {'error': str(exc), 'traceback': traceback.format_exc()}
json.dumps(result)
`, { motor_input_json: motor })
}

export function importRicYaml(yamlText) {
  return runPythonJson(`
import json, traceback
result = {}
try:
    import yaml
    data = yaml.safe_load(input_yaml)
    result = {'motor': data}
except Exception as exc:
    result = {'error': str(exc), 'traceback': traceback.format_exc()}
json.dumps(result)
`, { input_yaml: yamlText })
}

export function getGrainPreview(motor, grainIndex) {
  return runPythonJson(`
import json, traceback
result = {}
try:
    import motorlib.motor
    m = motorlib.motor.Motor(json.loads(motor_input_json))
    grain_index = int(grain_index_json)
    grain = m.grains[grain_index]
    grain.simulationSetup(m.config)
    masked, regression_map, contours, contour_lengths = grain.getRegressionData(m.config.getProperty('mapDim'), 12, True)
    face = masked.filled(-1).tolist() if masked is not None and hasattr(masked, 'filled') else []
    clean_contours = []
    for layer in contours:
        layer_out = []
        for contour in layer:
            layer_out.append([[float(p[0]), float(p[1])] for p in contour])
        clean_contours.append(layer_out)
    result = {
        'grainType': grain.geomName,
        'faceImage': face,
        'contours': clean_contours,
        'contourLengths': {str(k): v for k, v in contour_lengths.items()},
        'wallWeb': getattr(grain, 'wallWeb', None),
    }
except Exception as exc:
    result = {'error': str(exc), 'traceback': traceback.format_exc()}
json.dumps(result)
`, { motor_input_json: motor, grain_index_json: String(grainIndex) })
}
