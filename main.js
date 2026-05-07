import { defaultMotor, grainTemplates } from './src/lib/openmotor-defaults.js'
import { getPyodide, runMotorSimulation, exportRicYaml, importRicYaml, getGrainPreview } from './src/lib/openmotor-pyodide.js'

const STORAGE_KEY = 'openmotor-web-state-v1'
const allInhibited = ['Neither', 'Top', 'Bottom', 'Both']
const plotOptions = [
  ['force', 'Force'], ['pressure', 'Pressure'], ['kn', 'Kn'], ['mass', 'Mass'], ['massFlow', 'Mass Flow'], ['massFlux', 'Mass Flux'], ['exitPressure', 'Exit Pressure'], ['dThroat', 'Throat Change']
]
const num = (v) => Number.isFinite(v) ? v : 0
const fmt = (v, digits=3) => v == null ? '—' : Number(v).toFixed(digits)
const titleCase = (key) => key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())
const clone = (obj) => structuredClone(obj)

function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { motor: clone(defaultMotor), selectedPlots: ['force', 'pressure', 'kn'] }
    const parsed = JSON.parse(raw)
    return { motor: parsed?.motor || clone(defaultMotor), selectedPlots: parsed?.selectedPlots || ['force', 'pressure', 'kn'] }
  } catch {
    return { motor: clone(defaultMotor), selectedPlots: ['force', 'pressure', 'kn'] }
  }
}

const saved = loadSavedState()
const state = { motor: saved.motor, selectedPlots: saved.selectedPlots, selectedGrain: 0, result: null, grainPreview: null, previewLayer: 0, status: 'Booting…', running: false, previewing: false, fileName: 'untitled.ric', history: [], future: [] }
const app = document.getElementById('app')

function pushHistory() { state.history.push(clone(state.motor)); if (state.history.length > 100) state.history.shift(); state.future = [] }
function persistState() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ motor: state.motor, selectedPlots: state.selectedPlots })) } catch {} }
function commitMotorChange(mutator) { pushHistory(); mutator(); state.grainPreview = null; persistState() }
function undo() { if (!state.history.length) return; state.future.push(clone(state.motor)); state.motor = state.history.pop(); state.selectedGrain = Math.min(state.selectedGrain, Math.max(0, state.motor.grains.length - 1)); state.grainPreview = null; state.status = 'Undo.'; persistState(); render() }
function redo() { if (!state.future.length) return; state.history.push(clone(state.motor)); state.motor = state.future.pop(); state.selectedGrain = Math.min(state.selectedGrain, Math.max(0, state.motor.grains.length - 1)); state.grainPreview = null; state.status = 'Redo.'; persistState(); render() }

function grainFields(grain) { return Object.entries(grain.properties).map(([key, value]) => typeof value === 'boolean' ? `<label class="field"><span>${titleCase(key)}</span><input data-scope="grain" data-key="${key}" type="checkbox" ${value ? 'checked' : ''}></label>` : key === 'inhibitedEnds' ? `<label class="field"><span>${titleCase(key)}</span><select data-scope="grain" data-key="${key}">${allInhibited.map(opt => `<option ${opt===value?'selected':''}>${opt}</option>`).join('')}</select></label>` : `<label class="field"><span>${titleCase(key)}</span><input data-scope="grain" data-key="${key}" type="number" step="any" value="${value}"></label>`).join('') }
function scalarFields(obj, scope, textKeys = []) { return Object.entries(obj).map(([key, value]) => Array.isArray(value) || typeof value === 'object' ? '' : `<label class="field"><span>${titleCase(key)}</span><input data-scope="${scope}" data-key="${key}" type="${textKeys.includes(key) || typeof value === 'string' ? 'text' : 'number'}" ${typeof value === 'number' ? 'step="any"' : ''} value="${value}"></label>`).join('') }

function renderPreview() {
  if (state.grainPreview?.error) return `<pre class="error">${state.grainPreview.error}\n\n${state.grainPreview.traceback || ''}</pre>`
  if (!state.grainPreview?.faceImage?.length) return `<p class="muted">No preview yet.</p>`
  const data = state.grainPreview.faceImage
  const rows = data.length, cols = data[0]?.length || 0
  let rects = ''
  for (let y = 0; y < rows; y += 2) for (let x = 0; x < cols; x += 2) { const v = data[y][x]; let fill = '#0f172a'; if (v === -1) fill = '#020617'; else if (v === 0) fill = '#e2e8f0'; else fill = '#38bdf8'; rects += `<rect x="${x/2}" y="${y/2}" width="1" height="1" fill="${fill}" />` }
  const layers = state.grainPreview.contours || []
  const activeLayers = layers.slice(0, state.previewLayer + 1)
  const polylines = activeLayers.flatMap((layer, idx) => layer.map(contour => `<polyline fill="none" stroke="hsl(${200 - idx * 10} 90% 65%)" stroke-width="0.9" points="${contour.map(([x, y]) => `${x/2},${y/2}`).join(' ')}" opacity="0.95" />`)).join('')
  const maxLayer = Math.max(0, layers.length - 1)
  return `<div class="preview-meta"><span>Type: ${state.grainPreview.grainType}</span><span>Wall web: ${fmt(state.grainPreview.wallWeb)}</span></div><label class="field"><span>Regression layer ${state.previewLayer + 1} / ${layers.length || 1}</span><input id="preview-layer" type="range" min="0" max="${maxLayer}" value="${Math.min(state.previewLayer, maxLayer)}" step="1"></label><svg viewBox="0 0 ${Math.ceil(cols/2)} ${Math.ceil(rows/2)}" class="grain-preview">${rects}${polylines}</svg>`
}

function renderPlotSelector() {
  return `<div class="plot-selectors">${['plot-a','plot-b','plot-c'].map((id, idx) => `<label class="field"><span>Plot ${idx + 1}</span><select data-plot-index="${idx}" id="${id}">${plotOptions.map(([value, label]) => `<option value="${value}" ${state.selectedPlots[idx] === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label>`).join('')}</div>`
}

function render() {
  const grain = state.motor.grains[state.selectedGrain]
  const stats = state.result?.stats || {}
  app.innerHTML = `
    <div class="shell">
      <header class="topbar">
        <div><h1>openMotor Web</h1><p class="muted">${state.fileName} · ${state.status} · autosaved locally</p></div>
        <div class="actions row wrap"><button id="new-motor">New</button><button id="undo" ${state.history.length ? '' : 'disabled'}>Undo</button><button id="redo" ${state.future.length ? '' : 'disabled'}>Redo</button><button id="open-ric">Open .ric</button><button id="save-ric">Save .ric</button><button id="preview-grain" ${state.previewing ? 'disabled' : ''}>${state.previewing ? 'Loading preview…' : 'Preview grain'}</button><button id="run-sim" ${state.running ? 'disabled' : ''}>${state.running ? 'Running…' : 'Run simulation'}</button><input id="ric-file-input" type="file" accept=".ric,.yaml,.yml,text/yaml" hidden /></div>
      </header>
      <div class="content">
        <aside class="sidebar">
          <div class="panel"><h2>Motor editor</h2><p class="muted">Configure grains, nozzle, propellant, and simulation settings.</p></div>
          <div class="panel"><h3>Grains</h3><div class="grain-list">${state.motor.grains.map((g, i) => `<button class="grain-item ${i===state.selectedGrain?'active':''}" data-grain-index="${i}">${i + 1}. ${g.type}</button>`).join('')}</div><div class="row wrap"><select id="add-grain-type">${Object.keys(grainTemplates).map(t => `<option>${t}</option>`).join('')}</select><button id="add-grain">Add</button><button id="dup-grain">Duplicate</button><button id="del-grain" ${state.motor.grains.length <= 1 ? 'disabled' : ''}>Delete</button></div></div>
          <div class="panel"><h3>Selected grain</h3><div class="fields">${grainFields(grain)}</div></div>
          <div class="panel"><h3>Nozzle</h3><div class="fields">${scalarFields(state.motor.nozzle, 'nozzle')}</div></div>
          <div class="panel"><h3>Propellant</h3><div class="fields">${scalarFields(state.motor.propellant, 'propellant', ['name'])}</div><h4>Burn rate tab</h4><div class="fields">${scalarFields(state.motor.propellant.tabs[0], 'tab')}</div></div>
          <div class="panel"><h3>Simulation config</h3><div class="fields">${scalarFields(state.motor.config, 'config')}</div></div>
        </aside>
        <main class="main">
          <section class="panel hero"><h2>Results</h2><p class="muted">Aiming toward desktop openMotor: stats, alerts, preview, and configurable plots.</p></section>
          <section class="stats-grid">${[['Designation', stats.designation], ['Impulse (Ns)', fmt(stats.impulse)], ['ISP (s)', fmt(stats.isp)], ['Burn time (s)', fmt(stats.burnTime)], ['Volume loading (%)', fmt(stats.volumeLoading)], ['Avg pressure (Pa)', fmt(stats.avgPressure, 0)], ['Peak pressure (Pa)', fmt(stats.peakPressure, 0)], ['Initial Kn', fmt(stats.initialKn)], ['Peak Kn', fmt(stats.peakKn)], ['Propellant mass (kg)', fmt(stats.propellantMass)]].map(([k,v]) => `<div class="stat"><span>${k}</span><strong>${v ?? '—'}</strong></div>`).join('')}</section>
          <section class="panel results-layout"><div><h3>Alerts</h3>${state.result?.error ? `<pre class="error">${state.result.error}\n\n${state.result.traceback || ''}</pre>` : ''}<ul class="alerts">${(state.result?.alerts || []).map(a => `<li><strong>${a.level}</strong> ${a.type}: ${a.description}${a.location ? ` <span class="muted">(${a.location})</span>` : ''}</li>`).join('') || '<li class="muted">No alerts</li>'}</ul></div><div><h3>Grain regression preview</h3>${renderPreview()}</div></section>
          <section class="panel"><div class="row wrap between"><h3>Plots</h3></div>${renderPlotSelector()}${state.selectedPlots.map((channel) => renderChart(channel, plotOptions.find(([v]) => v === channel)?.[1] || channel, state.result?.channels?.time, state.result?.channels?.[channel])).join('')}</section>
        </main>
      </div>
    </div>`
  bindEvents()
}

function renderChart(id, title, xs, ys) {
  if (!xs || !ys || !xs.length || !ys.length) return `<div class="chart-wrap"><h4>${title}</h4><p class="muted">No data yet.</p></div>`
  const w = 900, h = 220, p = 28, minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys), dx = maxX - minX || 1, dy = maxY - minY || 1
  const pts = xs.map((x, i) => `${p + ((x - minX) / dx) * (w - p * 2)},${h - p - ((ys[i] - minY) / dy) * (h - p * 2)}`).join(' ')
  return `<div class="chart-wrap"><h4>${title}</h4><svg viewBox="0 0 ${w} ${h}" class="chart"><polyline fill="none" stroke="#60a5fa" stroke-width="2" points="${pts}" /></svg></div>`
}

async function saveRic() { state.status = 'Exporting .ric…'; render(); const exported = await exportRicYaml(state.motor); if (exported.error) { state.result = exported; state.status = 'Export failed.'; render(); return } const blob = new Blob([exported.yaml], { type: 'application/x-yaml' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = state.fileName || 'motor.ric'; a.click(); URL.revokeObjectURL(url); state.status = 'Saved .ric file.'; render() }
async function loadRic(file) { const text = await file.text(); state.status = 'Importing .ric…'; render(); const imported = await importRicYaml(text); if (imported.error) { state.result = imported; state.status = 'Import failed.' } else { pushHistory(); state.motor = imported.motor; state.fileName = file.name || 'imported.ric'; state.selectedGrain = 0; state.result = null; state.grainPreview = null; state.status = 'Imported .ric file.'; persistState() } render() }
async function loadPreview() { state.previewing = true; state.status = 'Generating grain preview…'; render(); try { state.grainPreview = await getGrainPreview(state.motor, state.selectedGrain); state.previewLayer = Math.max(0, (state.grainPreview.contours?.length || 1) - 1); state.status = state.grainPreview.error ? 'Preview failed.' : 'Preview ready.' } catch (err) { state.grainPreview = { error: String(err?.stack || err) }; state.status = 'Preview failed.' } finally { state.previewing = false; render() } }

function bindEvents() {
  document.querySelectorAll('[data-grain-index]').forEach(el => el.onclick = () => { state.selectedGrain = Number(el.dataset.grainIndex); state.grainPreview = null; render() })
  document.getElementById('new-motor').onclick = () => { pushHistory(); state.motor = clone(defaultMotor); state.selectedGrain = 0; state.result = null; state.grainPreview = null; state.fileName = 'untitled.ric'; state.status = 'Reset.'; persistState(); render() }
  document.getElementById('undo').onclick = undo
  document.getElementById('redo').onclick = redo
  document.getElementById('open-ric').onclick = () => document.getElementById('ric-file-input').click()
  document.getElementById('ric-file-input').onchange = async (e) => { const file = e.target.files?.[0]; if (file) await loadRic(file); e.target.value = '' }
  document.getElementById('save-ric').onclick = saveRic
  document.getElementById('preview-grain').onclick = loadPreview
  document.getElementById('add-grain').onclick = () => { const type = document.getElementById('add-grain-type').value; commitMotorChange(() => { state.motor.grains.push({ type, properties: clone(grainTemplates[type]) }); state.selectedGrain = state.motor.grains.length - 1 }); render() }
  document.getElementById('dup-grain').onclick = () => { commitMotorChange(() => { const g = state.motor.grains[state.selectedGrain]; state.motor.grains.splice(state.selectedGrain + 1, 0, clone(g)); state.selectedGrain++ }); render() }
  document.getElementById('del-grain').onclick = () => { commitMotorChange(() => { state.motor.grains.splice(state.selectedGrain, 1); state.selectedGrain = Math.max(0, state.selectedGrain - 1) }); render() }
  document.getElementById('run-sim').onclick = async () => { state.running = true; state.status = 'Running simulation in Pyodide…'; render(); try { state.result = await runMotorSimulation(state.motor); state.status = state.result.error ? 'Simulation failed.' : 'Simulation complete.' } catch (err) { state.result = { error: String(err?.stack || err) }; state.status = 'Simulation bootstrap failed.' } finally { state.running = false; render() } }
  document.getElementById('preview-layer')?.addEventListener('input', (e) => { state.previewLayer = Number(e.target.value); render() })
  document.querySelectorAll('[data-plot-index]').forEach(el => el.onchange = (e) => { state.selectedPlots[Number(e.target.dataset.plotIndex)] = e.target.value; persistState(); render() })
  document.querySelectorAll('input[data-scope], select[data-scope]').forEach(el => {
    el.onchange = (e) => {
      const { scope, key } = e.target.dataset
      if (scope == null) return
      let value
      if (e.target.type === 'checkbox') value = e.target.checked
      else if (e.target.type === 'number') value = num(parseFloat(e.target.value))
      else value = e.target.value
      commitMotorChange(() => {
        if (scope === 'grain') state.motor.grains[state.selectedGrain].properties[key] = value
        else if (scope === 'nozzle') state.motor.nozzle[key] = value
        else if (scope === 'propellant') state.motor.propellant[key] = value
        else if (scope === 'tab') state.motor.propellant.tabs[0][key] = value
        else if (scope === 'config') state.motor.config[key] = value
      })
    }
  })
}

async function boot() { render(); try { await getPyodide(); state.status = 'Pyodide ready.' } catch { state.status = 'Pyodide failed to load.' } persistState(); render() }
boot()
