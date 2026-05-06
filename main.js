import { defaultMotor, grainTemplates } from './src/lib/openmotor-defaults.js'
import { getPyodide, runMotorSimulation } from './src/lib/openmotor-pyodide.js'

const state = {
  motor: structuredClone(defaultMotor),
  selectedGrain: 0,
  result: null,
  status: 'Booting…',
  running: false,
}

const app = document.getElementById('app')

function num(v) { return Number.isFinite(v) ? v : 0 }
function fmt(v, digits=3) { return v == null ? '—' : Number(v).toFixed(digits) }

function grainFields(grain) {
  return Object.entries(grain.properties).map(([key, value]) => {
    if (typeof value === 'boolean') {
      return `<label class="field"><span>${key}</span><input data-scope="grain" data-key="${key}" type="checkbox" ${value ? 'checked' : ''}></label>`
    }
    if (key === 'inhibitedEnds') {
      return `<label class="field"><span>${key}</span><select data-scope="grain" data-key="${key}">${['Neither','Top','Bottom','Both'].map(opt => `<option ${opt===value?'selected':''}>${opt}</option>`).join('')}</select></label>`
    }
    return `<label class="field"><span>${key}</span><input data-scope="grain" data-key="${key}" type="number" step="any" value="${value}"></label>`
  }).join('')
}

function scalarFields(obj, scope) {
  return Object.entries(obj).map(([key, value]) => {
    if (Array.isArray(value) || typeof value === 'object') return ''
    return `<label class="field"><span>${key}</span><input data-scope="${scope}" data-key="${key}" type="number" step="any" value="${value}"></label>`
  }).join('')
}

function render() {
  const grain = state.motor.grains[state.selectedGrain]
  const stats = state.result?.stats || {}
  app.innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <div class="panel">
          <h2>Motor</h2>
          <div class="actions row">
            <button id="new-motor">New</button>
            <button id="run-sim" ${state.running ? 'disabled' : ''}>${state.running ? 'Running…' : 'Run simulation'}</button>
          </div>
          <p class="muted">${state.status}</p>
        </div>

        <div class="panel">
          <h3>Grains</h3>
          <div class="grain-list">
            ${state.motor.grains.map((g, i) => `<button class="grain-item ${i===state.selectedGrain?'active':''}" data-grain-index="${i}">${g.type}</button>`).join('')}
          </div>
          <div class="row">
            <select id="add-grain-type">${Object.keys(grainTemplates).map(t => `<option>${t}</option>`).join('')}</select>
            <button id="add-grain">Add</button>
          </div>
          <div class="row">
            <button id="dup-grain">Duplicate</button>
            <button id="del-grain" ${state.motor.grains.length <= 1 ? 'disabled' : ''}>Delete</button>
          </div>
        </div>

        <div class="panel">
          <h3>Selected grain</h3>
          <div class="fields">${grainFields(grain)}</div>
        </div>

        <div class="panel">
          <h3>Nozzle</h3>
          <div class="fields">${scalarFields(state.motor.nozzle, 'nozzle')}</div>
        </div>

        <div class="panel">
          <h3>Propellant</h3>
          <div class="fields">
            <label class="field"><span>name</span><input data-scope="propellant" data-key="name" type="text" value="${state.motor.propellant.name}"></label>
            <label class="field"><span>density</span><input data-scope="propellant" data-key="density" type="number" step="any" value="${state.motor.propellant.density}"></label>
          </div>
          <h4>Burn rate tab</h4>
          <div class="fields">${scalarFields(state.motor.propellant.tabs[0], 'tab')}</div>
        </div>

        <div class="panel">
          <h3>Simulation config</h3>
          <div class="fields">${scalarFields(state.motor.config, 'config')}</div>
        </div>
      </aside>

      <main class="main">
        <div class="panel hero">
          <h1>openMotor Web</h1>
          <p>Web replacement workbench: edit motor geometry, run the reused Python simulation core in-browser, inspect results.</p>
        </div>

        <div class="stats-grid">
          ${[
            ['Designation', stats.designation],
            ['Impulse (Ns)', fmt(stats.impulse)],
            ['Burn time (s)', fmt(stats.burnTime)],
            ['Peak pressure (Pa)', fmt(stats.peakPressure, 0)],
            ['Average pressure (Pa)', fmt(stats.avgPressure, 0)],
            ['Initial Kn', fmt(stats.initialKn)],
            ['Peak Kn', fmt(stats.peakKn)],
            ['Propellant mass (kg)', fmt(stats.propellantMass)],
            ['Port/throat ratio', fmt(stats.portRatio)],
            ['Peak mass flux', fmt(stats.peakMassFlux)],
          ].map(([k,v]) => `<div class="stat"><span>${k}</span><strong>${v ?? '—'}</strong></div>`).join('')}
        </div>

        <div class="panel">
          <h3>Alerts</h3>
          ${state.result?.error ? `<pre class="error">${state.result.error}\n\n${state.result.traceback || ''}</pre>` : ''}
          <ul class="alerts">${(state.result?.alerts || []).map(a => `<li><strong>${a.level}</strong> ${a.type}: ${a.description}${a.location ? ` <span class="muted">(${a.location})</span>` : ''}</li>`).join('') || '<li class="muted">No alerts</li>'}</ul>
        </div>

        <div class="panel">
          <h3>Time-series</h3>
          ${renderChart('force', 'Force', state.result?.channels?.time, state.result?.channels?.force)}
          ${renderChart('pressure', 'Pressure', state.result?.channels?.time, state.result?.channels?.pressure)}
          ${renderChart('kn', 'Kn', state.result?.channels?.time, state.result?.channels?.kn)}
        </div>
      </main>
    </div>
  `
  bindEvents()
}

function renderChart(id, title, xs, ys) {
  if (!xs || !ys || !xs.length || !ys.length) return `<div class="chart-wrap"><h4>${title}</h4><p class="muted">No data yet.</p></div>`
  const w = 700, h = 180, p = 24
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const dx = maxX - minX || 1
  const dy = maxY - minY || 1
  const pts = xs.map((x, i) => {
    const px = p + ((x - minX) / dx) * (w - p * 2)
    const py = h - p - ((ys[i] - minY) / dy) * (h - p * 2)
    return `${px},${py}`
  }).join(' ')
  return `<div class="chart-wrap"><h4>${title}</h4><svg viewBox="0 0 ${w} ${h}" class="chart"><polyline fill="none" stroke="#60a5fa" stroke-width="2" points="${pts}" /></svg></div>`
}

function bindEvents() {
  document.querySelectorAll('[data-grain-index]').forEach(el => el.onclick = () => { state.selectedGrain = Number(el.dataset.grainIndex); render() })
  document.getElementById('new-motor').onclick = () => { state.motor = structuredClone(defaultMotor); state.selectedGrain = 0; state.result = null; state.status = 'Reset.'; render() }
  document.getElementById('add-grain').onclick = () => {
    const type = document.getElementById('add-grain-type').value
    state.motor.grains.push({ type, properties: structuredClone(grainTemplates[type]) })
    state.selectedGrain = state.motor.grains.length - 1
    render()
  }
  document.getElementById('dup-grain').onclick = () => {
    const g = state.motor.grains[state.selectedGrain]
    state.motor.grains.splice(state.selectedGrain + 1, 0, structuredClone(g))
    state.selectedGrain++
    render()
  }
  document.getElementById('del-grain').onclick = () => {
    state.motor.grains.splice(state.selectedGrain, 1)
    state.selectedGrain = Math.max(0, state.selectedGrain - 1)
    render()
  }
  document.getElementById('run-sim').onclick = async () => {
    state.running = true; state.status = 'Running simulation in Pyodide…'; render()
    try {
      state.result = await runMotorSimulation(state.motor)
      state.status = state.result.error ? 'Simulation failed.' : 'Simulation complete.'
    } catch (err) {
      state.result = { error: String(err?.stack || err) }
      state.status = 'Simulation bootstrap failed.'
    } finally {
      state.running = false; render()
    }
  }
  document.querySelectorAll('input[data-scope], select[data-scope]').forEach(el => {
    el.onchange = (e) => {
      const { scope, key } = e.target.dataset
      let value
      if (e.target.type === 'checkbox') value = e.target.checked
      else if (e.target.type === 'number') value = num(parseFloat(e.target.value))
      else value = e.target.value
      if (scope === 'grain') state.motor.grains[state.selectedGrain].properties[key] = value
      else if (scope === 'nozzle') state.motor.nozzle[key] = value
      else if (scope === 'propellant') state.motor.propellant[key] = value
      else if (scope === 'tab') state.motor.propellant.tabs[0][key] = value
      else if (scope === 'config') state.motor.config[key] = value
    }
  })
}

async function boot() {
  render()
  try { await getPyodide(); state.status = 'Pyodide ready.' } catch (e) { state.status = 'Pyodide failed to load.' }
  render()
}
boot()
