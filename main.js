import { defaultMotor, grainTemplates } from './src/lib/openmotor-defaults.js'
import { getPyodide, runMotorSimulation, exportRicYaml, importRicYaml, getGrainPreview } from './src/lib/openmotor-pyodide.js'

const state = { motor: structuredClone(defaultMotor), selectedGrain: 0, result: null, grainPreview: null, status: 'Booting…', running: false, previewing: false, fileName: 'untitled.ric' }
const app = document.getElementById('app')
const allInhibited = ['Neither', 'Top', 'Bottom', 'Both']
const num = (v) => Number.isFinite(v) ? v : 0
const fmt = (v, digits=3) => v == null ? '—' : Number(v).toFixed(digits)
const titleCase = (key) => key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())

function grainFields(grain) { return Object.entries(grain.properties).map(([key, value]) => typeof value === 'boolean' ? `<label class="field"><span>${titleCase(key)}</span><input data-scope="grain" data-key="${key}" type="checkbox" ${value ? 'checked' : ''}></label>` : key === 'inhibitedEnds' ? `<label class="field"><span>${titleCase(key)}</span><select data-scope="grain" data-key="${key}">${allInhibited.map(opt => `<option ${opt===value?'selected':''}>${opt}</option>`).join('')}</select></label>` : `<label class="field"><span>${titleCase(key)}</span><input data-scope="grain" data-key="${key}" type="number" step="any" value="${value}"></label>`).join('') }
function scalarFields(obj, scope, textKeys = []) { return Object.entries(obj).map(([key, value]) => Array.isArray(value) || typeof value === 'object' ? '' : `<label class="field"><span>${titleCase(key)}</span><input data-scope="${scope}" data-key="${key}" type="${textKeys.includes(key) || typeof value === 'string' ? 'text' : 'number'}" ${typeof value === 'number' ? 'step="any"' : ''} value="${value}"></label>`).join('') }

function renderPreview() {
  if (state.grainPreview?.error) return `<pre class="error">${state.grainPreview.error}\n\n${state.grainPreview.traceback || ''}</pre>`
  if (!state.grainPreview?.faceImage?.length) return `<p class="muted">No preview yet.</p>`
  const size = 260
  const data = state.grainPreview.faceImage
  const rows = data.length, cols = data[0]?.length || 0
  const cell = Math.max(1, Math.floor(size / Math.max(rows, cols)))
  let rects = ''
  for (let y = 0; y < rows; y += 2) {
    for (let x = 0; x < cols; x += 2) {
      const v = data[y][x]
      let fill = '#0f172a'
      if (v === -1) fill = '#020617'
      else if (v === 0) fill = '#e2e8f0'
      else fill = '#38bdf8'
      rects += `<rect x="${x/2}" y="${y/2}" width="1" height="1" fill="${fill}" />`
    }
  }
  return `<div class="preview-meta"><span>Type: ${state.grainPreview.grainType}</span><span>Wall web: ${fmt(state.grainPreview.wallWeb)}</span></div><svg viewBox="0 0 ${Math.ceil(cols/2)} ${Math.ceil(rows/2)}" class="grain-preview">${rects}</svg>`
}

function render() {
  const grain = state.motor.grains[state.selectedGrain]
  const stats = state.result?.stats || {}
  app.innerHTML = `
    <div class="shell">
      <header class="topbar">
        <div><h1>openMotor Web</h1><p class="muted">${state.fileName} · ${state.status}</p></div>
        <div class="actions row wrap"><button id="new-motor">New</button><button id="open-ric">Open .ric</button><button id="save-ric">Save .ric</button><button id="preview-grain" ${state.previewing ? 'disabled' : ''}>${state.previewing ? 'Loading preview…' : 'Preview grain'}</button><button id="run-sim" ${state.running ? 'disabled' : ''}>${state.running ? 'Running…' : 'Run simulation'}</button><input id="ric-file-input" type="file" accept=".ric,.yaml,.yml,text/yaml" hidden /></div>
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
          <section class="panel hero"><h2>Results</h2><p class="muted">Aiming toward desktop openMotor: stats, alerts, preview, plots.</p></section>
          <section class="stats-grid">${[['Designation', stats.designation], ['Impulse (Ns)', fmt(stats.impulse)], ['ISP (s)', fmt(stats.isp)], ['Burn time (s)', fmt(stats.burnTime)], ['Volume loading (%)', fmt(stats.volumeLoading)], ['Avg pressure (Pa)', fmt(stats.avgPressure, 0)], ['Peak pressure (Pa)', fmt(stats.peakPressure, 0)], ['Initial Kn', fmt(stats.initialKn)], ['Peak Kn', fmt(stats.peakKn)], ['Propellant mass (kg)', fmt(stats.propellantMass)]].map(([k,v]) => `<div class="stat"><span>${k}</span><strong>${v ?? '—'}</strong></div>`).join('')}</section>
          <section class="panel results-layout"><div><h3>Alerts</h3>${state.result?.error ? `<pre class="error">${state.result.error}\n\n${state.result.traceback || ''}</pre>` : ''}<ul class="alerts">${(state.result?.alerts || []).map(a => `<li><strong>${a.level}</strong> ${a.type}: ${a.description}${a.location ? ` <span class="muted">(${a.location})</span>` : ''}</li>`).join('') || '<li class="muted">No alerts</li>'}</ul></div><div><h3>Grain preview</h3>${renderPreview()}</div></section>
          <section class="panel"><h3>Plots</h3>${renderChart('force', 'Force', state.result?.channels?.time, state.result?.channels?.force)}${renderChart('pressure', 'Pressure', state.result?.channels?.time, state.result?.channels?.pressure)}${renderChart('kn', 'Kn', state.result?.channels?.time, state.result?.channels?.kn)}</section>
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
async function loadRic(file) { const text = await file.text(); state.status = 'Importing .ric…'; render(); const imported = await importRicYaml(text); if (imported.error) { state.result = imported; state.status = 'Import failed.' } else { state.motor = imported.motor; state.fileName = file.name || 'imported.ric'; state.selectedGrain = 0; state.result = null; state.grainPreview = null; state.status = 'Imported .ric file.' } render() }
async function loadPreview() { state.previewing = true; state.status = 'Generating grain preview…'; render(); try { state.grainPreview = await getGrainPreview(state.motor, state.selectedGrain); state.status = state.grainPreview.error ? 'Preview failed.' : 'Preview ready.' } catch (err) { state.grainPreview = { error: String(err?.stack || err) }; state.status = 'Preview failed.' } finally { state.previewing = false; render() } }

function bindEvents() {
  document.querySelectorAll('[data-grain-index]').forEach(el => el.onclick = () => { state.selectedGrain = Number(el.dataset.grainIndex); state.grainPreview = null; render() })
  document.getElementById('new-motor').onclick = () => { state.motor = structuredClone(defaultMotor); state.selectedGrain = 0; state.result = null; state.grainPreview = null; state.fileName = 'untitled.ric'; state.status = 'Reset.'; render() }
  document.getElementById('open-ric').onclick = () => document.getElementById('ric-file-input').click()
  document.getElementById('ric-file-input').onchange = async (e) => { const file = e.target.files?.[0]; if (file) await loadRic(file); e.target.value = '' }
  document.getElementById('save-ric').onclick = saveRic
  document.getElementById('preview-grain').onclick = loadPreview
  document.getElementById('add-grain').onclick = () => { const type = document.getElementById('add-grain-type').value; state.motor.grains.push({ type, properties: structuredClone(grainTemplates[type]) }); state.selectedGrain = state.motor.grains.length - 1; state.grainPreview = null; render() }
  document.getElementById('dup-grain').onclick = () => { const g = state.motor.grains[state.selectedGrain]; state.motor.grains.splice(state.selectedGrain + 1, 0, structuredClone(g)); state.selectedGrain++; state.grainPreview = null; render() }
  document.getElementById('del-grain').onclick = () => { state.motor.grains.splice(state.selectedGrain, 1); state.selectedGrain = Math.max(0, state.selectedGrain - 1); state.grainPreview = null; render() }
  document.getElementById('run-sim').onclick = async () => { state.running = true; state.status = 'Running simulation in Pyodide…'; render(); try { state.result = await runMotorSimulation(state.motor); state.status = state.result.error ? 'Simulation failed.' : 'Simulation complete.' } catch (err) { state.result = { error: String(err?.stack || err) }; state.status = 'Simulation bootstrap failed.' } finally { state.running = false; render() } }
  document.querySelectorAll('input[data-scope], select[data-scope]').forEach(el => { el.onchange = (e) => { const { scope, key } = e.target.dataset; let value; if (e.target.type === 'checkbox') value = e.target.checked; else if (e.target.type === 'number') value = num(parseFloat(e.target.value)); else value = e.target.value; if (scope === 'grain') state.motor.grains[state.selectedGrain].properties[key] = value; else if (scope === 'nozzle') state.motor.nozzle[key] = value; else if (scope === 'propellant') state.motor.propellant[key] = value; else if (scope === 'tab') state.motor.propellant.tabs[0][key] = value; else if (scope === 'config') state.motor.config[key] = value; state.grainPreview = null } })
}

async function boot() { render(); try { await getPyodide(); state.status = 'Pyodide ready.' } catch { state.status = 'Pyodide failed to load.' } render() }
boot()
