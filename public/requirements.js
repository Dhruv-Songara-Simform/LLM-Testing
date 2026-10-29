// Requirement-based evaluation UI (docs/FUTURE_ENHANCEMENTS.md #1 and #2): the requirements
// checklist in the configuration panel, the 📋 Requirements results page, history/comparison
// lines, CSV/JSON exports and the requirements PDF report.
// deepeval.html only calls this file through reqHook(), which catches errors, so a bug here
// can never break an existing view. Nothing here changes the Quality Metrics page.
(function () {
  const STATUS = {
    'Pass': { label: '✅ Pass', color: '#2e7d32', bg: '#e8f5e9', border: '#4caf50' },
    'Fail': { label: '❌ Fail', color: '#c62828', bg: '#ffebee', border: '#f44336' },
    'Not tested': { label: '⚪ Not tested', color: '#616161', bg: '#f5f5f5', border: '#bdbdbd' },
    'Not measured': { label: '⚠️ Not measured', color: '#8d6e63', bg: '#efebe9', border: '#bcaaa4' },
  };
  const VERDICT = {
    'met': { short: 'met', color: '#2e7d32', bg: '#e8f5e9' },
    'partially met': { short: 'partial', color: '#e65100', bg: '#fff3e0' },
    'violated': { short: 'violated', color: '#c62828', bg: '#ffebee' },
    'not applicable': { short: 'n/a', color: '#9e9e9e', bg: '#fafafa' },
    'not measured': { short: '—', color: '#8d6e63', bg: '#efebe9' },
  };
  const UNCHECKED_KEY = 'deepeval.requirements.unchecked';

  const state = {
    config: { enabled: false },
    library: [],
    unchecked: new Set(),
    charts: [],
    previewTimer: null,
  };

  // --- small helpers ---

  const esc = (text) => String(text ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const pct = (v) => (typeof v === 'number' ? `${Math.round(v * 100)}%` : '—');
  const $ = (id) => document.getElementById(id);
  const passBar = () => state.config.thresholds?.pass ?? 0.75;
  const status = (s) => STATUS[s] || STATUS['Not measured'];
  const verdict = (v) => VERDICT[v] || VERDICT['not measured'];
  const md = (text) => (typeof renderMarkdown === 'function' ? renderMarkdown(text) : esc(text));
  const notify = (message, type) => (typeof showStatus === 'function' ? showStatus(message, type) : console.log(message));
  const plain = (text) => String(text || '').replace(/```[\s\S]*?```/g, '[code]').replace(/[*_`#>]+/g, '').replace(/\s+/g, ' ').trim();
  const clip = (text, n) => (text.length > n ? `${text.slice(0, n - 1)}…` : text);

  function loadUnchecked() {
    try {
      state.unchecked = new Set(JSON.parse(localStorage.getItem(UNCHECKED_KEY) || '[]'));
    } catch {
      state.unchecked = new Set();
    }
  }

  function saveUnchecked() {
    try {
      localStorage.setItem(UNCHECKED_KEY, JSON.stringify([...state.unchecked]));
    } catch { /* per-browser convenience only */ }
  }

  function injectStyles() {
    if ($('rq-styles')) return;
    const style = document.createElement('style');
    style.id = 'rq-styles';
    style.textContent = `
      .rq-panel { border-top: 2px solid #e0e0e0; margin-top: 20px; padding-top: 20px; }
      .rq-panel h3 { color: #333; font-size: 14px; margin-bottom: 8px; font-weight: 700; }
      .rq-help { font-size: 12px; color: #666; margin: 0 0 10px; line-height: 1.5; }
      .rq-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
      .rq-row button { flex: 1; min-width: 120px; }
      .rq-btn-light { background: #eef1fb !important; color: #3949ab !important; border: 1px solid #c5cae9 !important; }
      .rq-preview { font-size: 12px; margin-top: 8px; line-height: 1.5; }
      .rq-rejected { color: #c62828; background: #ffebee; border-radius: 4px; padding: 4px 8px; margin-top: 4px; }
      .rq-list { list-style: none; margin: 0; padding: 0; max-height: 260px; overflow-y: auto; }
      .rq-item { display: flex; gap: 8px; align-items: flex-start; padding: 8px; border-bottom: 1px solid #eee; font-size: 13px; }
      .rq-item:last-child { border-bottom: none; }
      .rq-item.off { opacity: 0.55; }
      .rq-item input { margin-top: 3px; width: auto; }
      .rq-item .rq-text { flex: 1; line-height: 1.4; word-break: break-word; }
      .rq-id { font-weight: 700; color: #3949ab; margin-right: 4px; white-space: nowrap; }
      .rq-remove { background: none !important; color: #999 !important; border: none !important; padding: 0 4px !important; width: auto !important; flex: none !important; font-size: 14px; cursor: pointer; }
      .rq-remove:hover { color: #c62828 !important; }
      .rq-box { background: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 6px; padding: 10px; margin-top: 10px; }
      .rq-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 11px; color: #777; font-weight: 600; text-transform: uppercase; margin-bottom: 6px; }
      .rq-head a { color: #3949ab; cursor: pointer; text-transform: none; margin-left: 8px; }
      .rq-note { font-size: 12px; color: #666; margin-top: 8px; line-height: 1.5; }
      .rq-warn { font-size: 12px; color: #8d6e00; background: #fff8e1; border: 1px solid #ffe082; border-radius: 4px; padding: 6px 8px; margin-top: 8px; line-height: 1.5; }
      .rq-banner { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; padding: 14px 18px; border-radius: 8px; font-weight: 700; margin-bottom: 8px; }
      .rq-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin: 16px 0; }
      .rq-kpi { background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 12px; text-align: center; }
      .rq-kpi .v { font-size: 22px; font-weight: 700; color: #333; }
      .rq-kpi .l { font-size: 12px; color: #777; margin-top: 2px; }
      .rq-card .quality-metric-name { text-align: left; font-size: 12px; line-height: 1.35; min-height: 32px; }
      .rq-table { width: 100%; border-collapse: collapse; font-size: 12px; }
      .rq-table th, .rq-table td { border: 1px solid #e6e6e6; padding: 6px 8px; text-align: left; vertical-align: top; }
      .rq-table th { background: #f5f6fa; font-weight: 700; }
      .rq-heat { overflow-x: auto; }
      .rq-heat td.cell { text-align: center; font-weight: 700; white-space: nowrap; min-width: 64px; }
      .rq-heat td.cell small { display: block; font-weight: 600; font-size: 10px; }
      .rq-section { margin-top: 28px; }
      .rq-section > h3 { margin-bottom: 8px; }
      .rq-details { border: 1px solid #e0e0e0; border-radius: 6px; padding: 10px 12px; margin-bottom: 8px; background: white; }
      .rq-details > summary { cursor: pointer; font-size: 13px; }
      .rq-datatable { margin-top: 10px; font-size: 12px; }
      .rq-datatable summary { cursor: pointer; color: #3949ab; }
      .rq-empty { text-align: center; color: #777; padding: 40px 16px; font-size: 14px; }
      .rq-chip { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 700; white-space: nowrap; }
    `;
    document.head.appendChild(style);
  }

  // --- configuration panel: input, checklist, ready summary ---

  async function init() {
    injectStyles();
    const response = await fetch('/api/requirements/config');
    state.config = response.ok ? await response.json() : { enabled: false };
    if (!state.config.enabled) return;

    loadUnchecked();
    $('requirementsPanel').style.display = 'block';
    $('requirementsTabBtn').style.display = '';
    $('requirementsExportPanel').style.display = 'block';
    renderPanel();
    renderExportPanel();
    renderEmptyPage();
    ['evaluationMode', 'numTests', 'suiteSelect', 'apiEndpoint'].forEach(id => $(id)?.addEventListener('change', updateSummary));
    await loadLibrary();
  }

  function renderPanel() {
    const c = state.config;
    $('requirementsPanel').innerHTML = `
      <div class="rq-panel">
        <h3>📋 Requirements (Optional)</h3>
        <p class="rq-help">Paste your product requirements, one per line (max ${c.maxRequirementWords} words each, up to ${c.maxRequirements}), or load a .txt / .md file.
        Every <strong>checked</strong> requirement is evaluated against every response when you click <strong>▶ Run DeepEval</strong>, by a separate requirement judge session. Results appear on the 📋 Requirements tab.</p>
        <textarea id="rqInput" placeholder="- The assistant must greet the user politely&#10;- Never ask for or repeat passwords or card numbers&#10;- Answers about refunds must mention the 30-day window" style="min-height: 80px; font-size: 13px;"></textarea>
        <div id="rqPreview" class="rq-preview"></div>
        <div class="rq-row">
          <button type="button" class="rq-btn-light" onclick="document.getElementById('rqFile').click()">📂 Load .txt / .md file</button>
          <button type="button" id="rqAddBtn" onclick="reqHook('addFromInput')">➕ Add requirements</button>
          <input type="file" id="rqFile" accept=".txt,.md,.markdown,text/plain,text/markdown" style="display:none;">
        </div>
        <div class="rq-box">
          <div class="rq-head">
            <span>Requirements to evaluate (<span id="rqCounter">0 of 0 selected</span>)</span>
            <span><a onclick="reqHook('selectAll', true)">Select all</a><a onclick="reqHook('selectAll', false)">Select none</a></span>
          </div>
          <ul id="rqList" class="rq-list"></ul>
        </div>
        <div id="rqEstimate" class="rq-note"></div>
        <div id="rqJudgeWarning"></div>
      </div>
    `;
    $('rqInput').addEventListener('input', () => {
      clearTimeout(state.previewTimer);
      state.previewTimer = setTimeout(() => guard(preview), 400);
    });
    $('rqFile').addEventListener('change', (event) => guard(() => loadFile(event.target)));
  }

  function guard(fn) {
    Promise.resolve().then(fn).catch(error => {
      console.error('Requirements UI error:', error);
      notify(`❌ ${esc(error.message)}`, 'error');
    });
  }

  async function loadLibrary() {
    const response = await fetch('/api/requirements');
    if (!response.ok) throw new Error(`Could not load requirements (HTTP ${response.status})`);
    state.library = await response.json();
    const known = new Set(state.library.map(r => r.id));
    state.unchecked = new Set([...state.unchecked].filter(id => known.has(id)));
    renderChecklist();
  }

  function renderChecklist() {
    const list = $('rqList');
    if (!list) return;
    list.innerHTML = state.library.length ? state.library.map(r => {
      const on = !state.unchecked.has(r.id);
      return `
        <li class="rq-item ${on ? '' : 'off'}">
          <input type="checkbox" id="rq_${esc(r.id)}" ${on ? 'checked' : ''} onchange="reqHook('toggle', '${esc(r.id)}', this.checked)">
          <label for="rq_${esc(r.id)}" class="rq-text"><span class="rq-id">${esc(r.id)}</span>${esc(r.text)}</label>
          <button type="button" class="rq-remove" title="Remove ${esc(r.id)}" aria-label="Remove ${esc(r.id)}" onclick="reqHook('remove', '${esc(r.id)}')">✕</button>
        </li>`;
    }).join('') : '<li class="rq-item" style="color:#999;">No requirements yet. Paste some above and click “Add requirements”.</li>';
    updateSummary();
  }

  function selectedRequirements() {
    return state.library.filter(r => !state.unchecked.has(r.id));
  }

  function expectedResponses() {
    const mode = $('evaluationMode')?.value;
    if (mode === 'suite') {
      const suite = typeof testSuites !== 'undefined' ? testSuites.find(s => s.id === $('suiteSelect')?.value) : null;
      return suite ? suite.caseCount : null;
    }
    if (mode === 'static') return typeof customPrompts !== 'undefined' ? customPrompts.length : null;
    return parseInt($('numTests')?.value, 10) || null;
  }

  function updateSummary() {
    const selected = selectedRequirements().length;
    const total = state.library.length;
    if ($('rqCounter')) $('rqCounter').textContent = `${selected} of ${total} selected`;
    const ready = $('requirementsReadySummary');
    if (ready) ready.textContent = state.config.enabled ? ` · ${selected} requirement${selected === 1 ? '' : 's'} selected` : '';

    const estimate = $('rqEstimate');
    if (estimate) {
      const n = expectedResponses();
      const calls = selected && n ? n * Math.ceil(selected / state.config.batchSize) : 0;
      estimate.innerHTML = selected
        ? `🧮 Estimated extra judge calls: about <strong>${calls || '?'}</strong> (${n ?? '?'} responses × ${Math.ceil(selected / state.config.batchSize)} call${selected > state.config.batchSize ? 's' : ''} per response; borderline scores are re-judged).`
        : 'No requirements selected: the run evaluates metrics only, exactly as before.';
    }
    const warning = $('rqJudgeWarning');
    if (warning) {
      const endpoint = $('apiEndpoint')?.value || '';
      const localChat = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\/api\/chat\/?$/.test(endpoint.trim());
      const c = state.config;
      warning.innerHTML = !c.judgeModel
        ? '<div class="rq-warn">⚠️ No judge model is configured, so requirements will be reported as <strong>Not measured</strong>.</div>'
        : selected && localChat && c.judgeModel === c.chatModel
          ? `<div class="rq-warn">⚠️ The requirement judge uses the same model as the chatbot under test (<strong>${esc(c.chatModel)}</strong>). Every check is still a fresh, separate session, but set <code>REQ_JUDGE_MODEL</code> in .env to a different model for a fully independent judgment.</div>`
          : '';
    }
  }

  async function preview() {
    const text = $('rqInput').value;
    const el = $('rqPreview');
    if (!text.trim()) {
      el.innerHTML = '';
      return;
    }
    const response = await fetch('/api/requirements/preview', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }),
    });
    const data = await response.json();
    if (!response.ok) {
      el.innerHTML = `<div class="rq-rejected">${esc(data.error)}</div>`;
      return;
    }
    el.innerHTML = previewHtml(data);
  }

  function previewHtml(data) {
    const ok = data.requirements.length;
    return `
      <div style="color:${ok ? '#2e7d32' : '#777'};">${ok} requirement${ok === 1 ? '' : 's'} ready to add${ok ? ` (${data.requirements.map(r => `${r.words}w`).join(', ')})` : ''}.</div>
      ${data.rejected.map(r => `<div class="rq-rejected">✗ ${esc(r.error)}${r.text ? ` “${esc(clip(r.text, 80))}”` : ''}</div>`).join('')}
    `;
  }

  async function addFromInput() {
    const input = $('rqInput');
    const text = input.value;
    if (!text.trim()) {
      notify('❌ Paste at least one requirement first.', 'error');
      return;
    }
    const response = await fetch('/api/requirements', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);

    // New requirements start checked.
    data.added.forEach(r => state.unchecked.delete(r.id));
    saveUnchecked();
    await loadLibrary();

    const notes = [`${data.added.length} added`];
    if (data.duplicates.length) notes.push(`${data.duplicates.length} already in the list`);
    if (data.overLimit.length) notes.push(`${data.overLimit.length} not added (limit of ${state.config.maxRequirements} reached)`);
    if (data.rejected.length) notes.push(`${data.rejected.length} rejected (over ${state.config.maxRequirementWords} words)`);
    // Keep only the rejected lines in the box so the user can shorten them.
    input.value = data.rejected.map(r => r.text).join('\n');
    $('rqPreview').innerHTML = data.rejected.length ? previewHtml({ requirements: [], rejected: data.rejected }) : '';
    notify(`${data.added.length ? '✅' : 'ℹ️'} Requirements: ${notes.join(', ')}.`, data.added.length ? 'success' : 'loading');
  }

  async function loadFile(inputEl) {
    const file = inputEl.files && inputEl.files[0];
    inputEl.value = '';
    if (!file) return;
    if (!/\.(txt|md|markdown)$/i.test(file.name)) throw new Error('Only .txt and .md files are supported.');
    if (file.size > 200000) throw new Error('The file is too large (max 200 KB).');
    const text = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Could not read the file.'));
      reader.readAsText(file);
    });
    if (text.includes('\u0000')) throw new Error('This file is not plain text (it contains NUL bytes).');
    const input = $('rqInput');
    input.value = input.value.trim() ? `${input.value.trim()}\n${text}` : text;
    await preview();
  }

  function toggle(id, checked) {
    if (checked) state.unchecked.delete(id); else state.unchecked.add(id);
    saveUnchecked();
    renderChecklist();
  }

  function selectAll(on) {
    state.unchecked = on ? new Set() : new Set(state.library.map(r => r.id));
    saveUnchecked();
    renderChecklist();
  }

  async function remove(id) {
    const r = state.library.find(x => x.id === id);
    if (!r || !confirm(`Remove ${id}: “${clip(r.text, 120)}”?`)) return;
    const response = await fetch(`/api/requirements/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!response.ok && response.status !== 404) throw new Error(`Could not remove ${id} (HTTP ${response.status})`);
    state.unchecked.delete(id);
    saveUnchecked();
    await loadLibrary();
  }

  // Called by runDeepEval(): the checked requirements as a snapshot ({ id, text }), or [] for none.
  function getSelectedForRun() {
    if (!state.config.enabled) return [];
    return selectedRequirements().map(({ id, text }) => ({ id, text }));
  }

  // --- the 📋 Requirements results page ---

  function destroyCharts() {
    state.charts.forEach(c => { try { c.destroy(); } catch { /* already gone */ } });
    state.charts = [];
  }

  function renderEmptyPage(message) {
    destroyCharts();
    const page = $('requirementsPage');
    if (page) page.innerHTML = `<div class="rq-empty">📋 ${esc(message || 'No requirements were selected for this run.')}<br><span style="font-size:12px;">Check requirements in the configuration panel before clicking ▶ Run DeepEval to evaluate the chatbot against them.</span></div>`;
  }

  function renderResults(evaluation) {
    if (!state.config.enabled) return;
    renderExportPanel(evaluation);
    const m = evaluation && evaluation.metrics;
    const rr = m && m.requirementResults;
    if (!rr) {
      renderEmptyPage();
      return;
    }
    destroyCharts();
    useRunThresholds(rr);
    const page = $('requirementsPage');
    page.innerHTML = `
      ${bannerHtml(m, rr)}
      ${kpiHtml(rr)}
      <h3 style="margin-top:8px;">📋 Requirement Scorecard</h3>
      <div class="quality-metrics-grid">${rr.requirements.map(cardHtml).join('')}</div>
      <div class="charts-grid" id="rqCharts"></div>
      <div class="rq-section">${heatmapHtml(m, rr)}</div>
      <div class="rq-section">${breakdownHtml(m, rr)}</div>
      <div class="rq-section">${notTestedHtml(m, rr)}</div>
      <div class="rq-section">${runDetailsHtml(m, rr)}</div>
    `;
    renderCharts(rr);
  }

  function verdictText(m, rr) {
    const s = rr.summary;
    if (rr.combinedPass) return { pass: true, text: '✅ DEEPEVAL PASSED — all metrics and all tested requirements pass' };
    if (s.tested === 0) return { pass: false, text: s.notMeasured ? '⚠️ REQUIREMENTS NOT MEASURED — no verdict possible' : '⚠️ NO REQUIREMENT WAS TESTED BY THIS RUN' };
    const parts = [];
    if (!m.overallPass) parts.push('metrics below the bar or failed responses');
    if (s.failed) parts.push(`${s.failed} requirement${s.failed === 1 ? '' : 's'} failed`);
    if (s.notMeasured) parts.push(`${s.notMeasured} not measured`);
    return { pass: false, text: `❌ DEEPEVAL FAILED — ${parts.join(', ')}` };
  }

  function bannerHtml(m, rr) {
    const s = rr.summary;
    const v = verdictText(m, rr);
    return `
      <div class="rq-banner" style="background:${v.pass ? '#e8f5e9' : '#ffebee'};color:${v.pass ? '#1b5e20' : '#b71c1c'};border:2px solid ${v.pass ? '#4caf50' : '#f44336'};">
        <span>${esc(v.text)}</span>
        <span>${s.passed} of ${s.tested} tested requirement${s.tested === 1 ? '' : 's'} pass${s.tested ? ` (${pct(s.passRate)})` : ''}</span>
      </div>
      <div style="font-size:12px;color:#666;line-height:1.6;">
        Combined verdict = Quality Metrics (${m.metricsPassed ?? 0}/${m.metricsTotal ?? 0} passed, ${m.overallPass ? 'PASS' : 'FAIL'}) <strong>and</strong> every tested requirement passing.
        Coverage: ${s.tested} of ${s.selected} requirement${s.selected === 1 ? '' : 's'} tested (${pct(s.coverage)}).
        The Quality Metrics tab is unchanged by requirement results.
        ${rr.error ? `<div class="rq-warn">⚠️ The requirement evaluation failed (${esc(rr.error)}); metric results are unaffected. Every requirement is reported as Not measured.</div>` : ''}
      </div>
    `;
  }

  function kpiHtml(rr) {
    const s = rr.summary;
    const tiles = [
      [pct(s.passRate), 'Requirement pass rate'],
      [pct(s.coverage), 'Coverage (tested ÷ selected)'],
      [pct(s.averageScore), 'Average requirement score'],
      [`${s.failed}`, 'Failed requirements'],
      [`${s.notTested + s.notMeasured}`, 'Not tested / not measured'],
      [`${s.lowConfidence}`, 'Low-confidence results'],
    ];
    return `<div class="rq-kpis">${tiles.map(([v, l]) => `<div class="rq-kpi"><div class="v">${esc(v)}</div><div class="l">${esc(l)}</div></div>`).join('')}</div>`;
  }

  function failedByText(r) {
    const why = [];
    if (r.failedBy.includes('average')) why.push(`average below ${pct(state.lastPass ?? passBar())}`);
    if (r.failedBy.includes('caseFloor')) why.push(`one response below the ${pct(state.lastFloor ?? 0.5)} floor`);
    return why.join(' and ');
  }

  // Thresholds come from the run itself, so old runs render with the rules they were scored by.
  function useRunThresholds(rr) {
    state.lastPass = rr.thresholds?.pass;
    state.lastFloor = rr.thresholds?.caseFloor;
  }

  function cardHtml(r) {
    const st = status(r.status);
    const tested = r.status === 'Pass' || r.status === 'Fail';
    const cls = r.status === 'Pass' ? 'good' : r.status === 'Fail' ? 'poor' : '';
    const detail = r.status === 'Not tested'
      ? 'No prompt in this run exercised it.'
      : r.status === 'Not measured' ? 'No judge result available.' : r.worstReason;
    return `
      <div class="quality-metric-badge rq-card ${cls}" ${cls ? '' : `style="background:${st.bg};border-color:${st.border};"`} title="${esc(r.text)}">
        <div class="quality-metric-name"><span class="rq-id">${esc(r.id)}</span>${esc(clip(r.text, 90))}</div>
        <div class="quality-metric-value" ${tested ? '' : 'style="color:#999;font-size:16px;"'}>${tested ? pct(r.score) : 'N/A'}</div>
        ${tested ? `<div class="quality-metric-bar"><div class="quality-metric-bar-fill" style="width:${Math.round(r.score * 100)}%;background:${st.border};"></div></div>` : ''}
        <div class="quality-metric-status" style="color:${st.color};">${st.label}${r.status === 'Fail' ? ` <span style="font-weight:400;">(${esc(failedByText(r))})</span>` : ''}</div>
        <div style="font-size:11px;color:#777;margin-top:4px;">${tested ? `${r.applicable} applicable response${r.applicable === 1 ? '' : 's'} · ${esc(r.confidence)} confidence` : ''}</div>
        ${detail ? `<div style="font-size:11px;color:#777;margin-top:6px;line-height:1.3;">${esc(clip(detail, 160))}</div>` : ''}
      </div>
    `;
  }

  function chartData(rr) {
    const tested = rr.requirements.filter(r => r.score !== null);
    const counts = ['Pass', 'Fail', 'Not tested', 'Not measured'].map(s => rr.requirements.filter(r => r.status === s).length);
    return { tested, counts };
  }

  function dataTable(headers, rows) {
    return `<details class="rq-datatable"><summary>Show data table</summary>
      <table class="rq-table" style="margin-top:6px;"><thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(row => `<tr>${row.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></details>`;
  }

  function chartConfigs(rr, forPrint) {
    const { tested, counts } = chartData(rr);
    const bar = state.lastPass ?? passBar();
    const base = forPrint
      ? { animation: false, responsive: false, maintainAspectRatio: false, devicePixelRatio: 2 }
      : { responsive: true, maintainAspectRatio: false };
    const configs = {};
    if (tested.length >= 3) {
      configs.radar = {
        type: 'radar',
        data: {
          labels: tested.map(r => r.id),
          datasets: [
            { label: 'Requirement score', data: tested.map(r => r.score), borderColor: '#3949ab', backgroundColor: 'rgba(57,73,171,0.18)', fill: true, pointRadius: 4 },
            { label: `Pass bar (${Math.round(bar * 100)}%)`, data: tested.map(() => bar), borderColor: '#f44336', borderDash: [4, 4], pointRadius: 0, fill: false },
          ],
        },
        options: { ...base, scales: { r: { beginAtZero: true, max: 1, ticks: { stepSize: 0.25 } } } },
      };
    }
    if (tested.length) {
      configs.bar = {
        type: 'bar',
        data: {
          labels: tested.map(r => `${r.id} (${r.status})`),
          datasets: [{ label: 'Score (%)', data: tested.map(r => Math.round(r.score * 100)), backgroundColor: tested.map(r => status(r.status).border), borderRadius: 4 }],
        },
        options: { ...base, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, max: 100 } } },
      };
    }
    configs.donut = {
      type: 'doughnut',
      data: {
        labels: ['Pass', 'Fail', 'Not tested', 'Not measured'].map((s, i) => `${s} (${counts[i]})`),
        datasets: [{ data: counts, backgroundColor: ['#4caf50', '#f44336', '#bdbdbd', '#a1887f'], borderColor: '#fff', borderWidth: 2 }],
      },
      options: { ...base, plugins: { legend: { position: 'bottom' } } },
    };
    return configs;
  }

  function renderCharts(rr) {
    const grid = $('rqCharts');
    if (!grid || typeof Chart === 'undefined') return;
    const { tested, counts } = chartData(rr);
    const configs = chartConfigs(rr, false);
    const scoreRows = tested.map(r => [r.id, clip(r.text, 70), pct(r.score), pct(r.min), r.status]);
    const blocks = [];
    if (configs.radar) blocks.push(['radar', '🕸️ Requirement Scores vs 75% Bar', dataTable(['ID', 'Requirement', 'Score', 'Min', 'Status'], scoreRows)]);
    if (configs.bar) blocks.push(['bar', '📊 Requirement Scores by Status', dataTable(['ID', 'Requirement', 'Score', 'Min', 'Status'], scoreRows)]);
    blocks.push(['donut', '🍩 Requirements by Status', dataTable(['Status', 'Requirements'], ['Pass', 'Fail', 'Not tested', 'Not measured'].map((s, i) => [s, String(counts[i])]))]);
    grid.innerHTML = blocks.map(([key, title, table]) => `
      <div class="chart-container">
        <h3>${title}</h3>
        <div class="chart-wrapper"><canvas id="rqChart_${key}" role="img" aria-label="${esc(title)}"></canvas></div>
        ${table}
      </div>`).join('') + (configs.radar ? '' : '<div class="chart-container" style="display:flex;align-items:center;color:#777;font-size:13px;">The radar chart needs at least 3 tested requirements.</div>');
    setTimeout(() => {
      blocks.forEach(([key]) => {
        const canvas = $(`rqChart_${key}`);
        if (canvas) state.charts.push(new Chart(canvas, configs[key]));
      });
    }, 100);
  }

  function promptOf(m, index) {
    return (m.prompts || [])[index] || '';
  }

  function heatmapHtml(m, rr) {
    const columns = rr.perResponse || [];
    if (!columns.length) return '';
    const head = columns.map(p => `<th style="text-align:center;" title="${esc(promptOf(m, p.index))}">#${p.index + 1}${m.caseIds ? `<br><small>${esc(m.caseIds[p.index] || '')}</small>` : ''}</th>`).join('');
    const rows = rr.requirements.map(r => `
      <tr>
        <td title="${esc(r.text)}"><span class="rq-id">${esc(r.id)}</span>${esc(clip(r.text, 60))}</td>
        <td style="text-align:center;white-space:nowrap;color:${status(r.status).color};font-weight:700;">${esc(status(r.status).label)}</td>
        ${columns.map(p => {
          const e = p.results[r.id] || {};
          const v = verdict(e.verdict);
          return `<td class="cell" style="background:${v.bg};color:${v.color};" title="${esc(e.reason || '')}">${e.applies ? pct(e.score) : '·'}<small>${esc(v.short)}</small></td>`;
        }).join('')}
      </tr>`).join('');
    return `
      <h3>🗺️ Requirement × Response Heatmap</h3>
      <p style="font-size:12px;color:#666;margin-bottom:8px;">Each cell is the requirement judge's score and verdict for one response (hover for the reason). “n/a” means the prompt did not give the chatbot a chance to meet or break that requirement.</p>
      <div class="rq-heat"><table class="rq-table"><thead><tr><th>Requirement</th><th>Status</th>${head}</tr></thead><tbody>${rows}</tbody></table></div>
    `;
  }

  function breakdownHtml(m, rr) {
    const failed = new Set((m.failedResponses || []).map(f => f.index));
    const items = rr.requirements.map(r => {
      const st = status(r.status);
      const responses = (rr.perResponse || []).map(p => ({ index: p.index, ...(p.results[r.id] || {}) }));
      const ordered = responses.sort((a, b) => (b.applies === true) - (a.applies === true) || (a.score ?? 2) - (b.score ?? 2));
      const rows = ordered.map(e => {
        const v = verdict(e.verdict);
        return `
          <tr>
            <td style="white-space:nowrap;">#${e.index + 1}${m.caseIds ? ` · ${esc(m.caseIds[e.index] || '')}` : ''}</td>
            <td><span class="rq-chip" style="background:${v.bg};color:${v.color};">${esc(e.verdict || 'not measured')}</span></td>
            <td style="text-align:center;font-weight:700;">${e.applies ? pct(e.score) : '—'}</td>
            <td>${esc(e.reason || '')}${e.samples > 1 ? ` <span style="color:#999;">(median of ${e.samples} judgments)</span>` : ''}
              <details style="margin-top:4px;"><summary style="cursor:pointer;color:#3949ab;">Prompt and reply</summary>
                <div style="background:#f5f7ff;padding:6px 8px;border-radius:4px;margin:4px 0;"><strong>Prompt:</strong> ${esc(promptOf(m, e.index))}</div>
                <div class="md-body" style="background:#fafafa;padding:6px 8px;border-radius:4px;max-height:200px;overflow:auto;">${failed.has(e.index) ? '' : md((m.responses || [])[e.index])}</div>
              </details>
            </td>
          </tr>`;
      }).join('');
      return `
        <details class="rq-details" style="border-left:4px solid ${st.border};">
          <summary><strong>${esc(r.id)}</strong> <span style="color:#555;">${esc(clip(r.text, 120))}</span>
            <span class="rq-chip" style="margin-left:6px;background:${st.bg};color:${st.color};">${esc(st.label)}${r.score !== null ? ` · ${pct(r.score)}` : ''}</span></summary>
          <div style="margin-top:10px;font-size:12px;">
            <div style="background:#f5f7ff;padding:8px 10px;border-radius:4px;margin-bottom:8px;"><strong>Requirement:</strong> ${esc(r.text)}</div>
            <div style="margin-bottom:8px;color:#555;">Score ${pct(r.score)} · min ${pct(r.min)} · max ${pct(r.max)} · ${r.applicable} applicable response${r.applicable === 1 ? '' : 's'}${r.confidence ? ` · ${esc(r.confidence)} confidence` : ''}${r.notMeasuredResponses ? ` · ${r.notMeasuredResponses} not measured` : ''}${r.status === 'Fail' ? ` · failed: ${esc(failedByText(r))}` : ''}</div>
            <table class="rq-table"><thead><tr><th>Response</th><th>Verdict</th><th>Score</th><th>Judge's reason</th></tr></thead><tbody>${rows}</tbody></table>
          </div>
        </details>`;
    }).join('');
    return `
      <h3>🔍 Per-Requirement Breakdown</h3>
      <p style="font-size:12px;color:#666;margin-bottom:12px;">Click a requirement to see every response's verdict, score and the judge's reason, with the prompt and the full reply. Applicable responses are listed first, worst first.</p>
      ${items}
    `;
  }

  function notTestedHtml(m, rr) {
    const list = rr.requirements.filter(r => r.status === 'Not tested' || r.status === 'Not measured');
    if (!list.length) return '';
    const advice = m.evaluationMode === 'dynamic'
      ? 'Start the dynamic run from an initial question that touches these requirements.'
      : m.evaluationMode === 'suite'
        ? 'The suite\'s cases do not cover these requirements; run them with static prompts that do.'
        : 'Add static prompts that give the chatbot a chance to meet or break these requirements.';
    return `
      <h3>⚪ Not Tested / Not Measured</h3>
      <p style="font-size:12px;color:#666;margin-bottom:8px;">These requirements have no verdict, so they are <strong>not</strong> counted as passing. ${esc(advice)}</p>
      <table class="rq-table"><thead><tr><th>ID</th><th>Requirement</th><th>Status</th></tr></thead><tbody>
        ${list.map(r => `<tr><td class="rq-id">${esc(r.id)}</td><td>${esc(r.text)}</td><td>${esc(status(r.status).label)}</td></tr>`).join('')}
      </tbody></table>
    `;
  }

  function runDetailsRows(m, rr) {
    const t = rr.thresholds || {};
    return [
      ['Requirement judge model', rr.judgeModel || 'None configured (requirements not measured)'],
      ['Session', 'Separate requirement-judge session: own process, own system prompt, one stateless call per response batch. It never sees the metric judge\'s scores or reasons.'],
      ['Pass rule', `Average ≥ ${pct(t.pass)} over applicable responses, and no single applicable response below ${pct(t.caseFloor)}`],
      ['Noise control', `Scores within ${pct(t.borderlineMargin)} of the bar or floor re-judged ${t.judgeSamples}× (median kept); Low confidence under ${t.minApplicable} applicable responses or within ${pct(t.noiseBand)} of the bar`],
      ['Judge calls', String(rr.judgeCalls ?? '—')],
      ['Duration', rr.durationMs ? `${(rr.durationMs / 1000).toFixed(1)}s` : '—'],
      ['Responses checked', String((rr.perResponse || []).length)],
      ['Requirements in scope', `${rr.summary.selected} (snapshot saved with this run)`],
    ];
  }

  function runDetailsHtml(m, rr) {
    return `
      <h3>⚙️ Run Details</h3>
      <table class="rq-table"><tbody>${runDetailsRows(m, rr).map(([k, v]) => `<tr><th style="width:220px;">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table>
    `;
  }

  // --- history and comparison ---

  function artifactCardLine(a) {
    if (!state.config.enabled || a.requirementsSelected === undefined) return '';
    const ok = a.requirementsTested > 0 && a.requirementsPassed === a.requirementsTested;
    return `<div class="artifact-metric">Requirements: <strong style="color:${ok ? '#2e7d32' : '#c62828'};">${a.requirementsPassed}/${a.requirementsTested}</strong> pass${a.requirementsTested < a.requirementsSelected ? ` <span style="color:#999;">(${a.requirementsSelected - a.requirementsTested} untested)</span>` : ''}</div>`;
  }

  function comparisonHtml(current, previous) {
    if (!state.config.enabled || !current || !previous || !current.requirementScores) return '';
    const noise = state.config.thresholds?.noiseBand ?? 0.12;
    const delta = (a, b) => {
      if (typeof a !== 'number' || typeof b !== 'number') return '';
      const d = Math.round((a - b) * 100);
      const small = Math.abs(a - b) < noise;
      return `<span style="color:${small ? '#999' : d > 0 ? '#2e7d32' : '#c62828'};font-weight:600;">${d > 0 ? '+' : ''}${d}${small ? ' (noise)' : ''}</span>`;
    };
    if (!previous.requirementScores) {
      return `<div style="font-size:13px;color:#666;margin-top:8px;">Requirements: the previous run did not evaluate requirements, so there is nothing to compare.</div>`;
    }
    const texts = [...new Set([...Object.keys(current.requirementScores), ...Object.keys(previous.requirementScores)])];
    const rows = texts.map(text => {
      const c = current.requirementScores[text];
      const p = previous.requirementScores[text];
      return `<tr><td><span class="rq-id">${esc((c || p).id)}</span>${esc(clip(text, 80))}</td>
        <td style="text-align:center;">${p ? `${pct(p.score)} <small>${esc(p.status)}</small>` : '—'}</td>
        <td style="text-align:center;">${c ? `${pct(c.score)} <small>${esc(c.status)}</small>` : '—'}</td>
        <td style="text-align:center;">${c && p ? delta(c.score, p.score) : ''}</td></tr>`;
    }).join('');
    return `
      <div class="table-container" style="margin-top:12px;">
        <div style="font-size:13px;color:#666;margin-bottom:8px;">
          Requirement pass rate ${pct(previous.requirementsPassRate)} → <strong>${pct(current.requirementsPassRate)}</strong> ${delta(current.requirementsPassRate, previous.requirementsPassRate)}.
          Requirements are matched by text, so renumbered lists still compare. Changes under ${Math.round(noise * 100)} points are labelled as noise.
        </div>
        <table><thead><tr><th>Requirement</th><th style="text-align:center;">Previous</th><th style="text-align:center;">This run</th><th style="text-align:center;">Δ (pts)</th></tr></thead><tbody>${rows}</tbody></table>
      </div>
    `;
  }

  // --- exports: CSV, JSON, PDF ---

  function renderExportPanel(evaluation) {
    const el = $('requirementsExportPanel');
    if (!el) return;
    const has = Boolean(evaluation?.metrics?.requirementResults);
    el.innerHTML = `
      <div style="background:linear-gradient(135deg,#eef1fb 0%,#f7f9ff 100%);border:1px solid #c5cae9;border-radius:12px;padding:20px;margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <div style="width:44px;height:44px;background:#3949ab;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">📋</div>
          <div>
            <div style="font-weight:700;color:#333;font-size:15px;">Requirements Report</div>
            <div style="color:#666;font-size:12px;">Scorecard, charts, findings for failing requirements, methodology and sign-off. Built from the saved run.</div>
          </div>
        </div>
        <div class="rq-row">
          <button type="button" onclick="reqHook('downloadReport')" style="background:#3949ab;" ${has ? '' : 'disabled'}>📥 Download Requirements Report</button>
          <button type="button" class="rq-btn-light" onclick="reqHook('exportCsv')" ${has ? '' : 'disabled'}>CSV</button>
          <button type="button" class="rq-btn-light" onclick="reqHook('exportJson')" ${has ? '' : 'disabled'}>JSON</button>
        </div>
        ${has ? '' : '<p style="margin:8px 0 0;color:#999;font-size:12px;">Available for runs that evaluated requirements.</p>'}
      </div>
    `;
  }

  function currentResults() {
    const ev = typeof currentEvaluation !== 'undefined' ? currentEvaluation : null;
    if (!ev?.metrics?.requirementResults) throw new Error('Load a run that evaluated requirements first.');
    return ev;
  }

  function download(name, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Quotes every cell and neutralises leading = + - @ so spreadsheets never run a cell as a formula.
  function csvCell(value) {
    let s = value === null || value === undefined ? '' : String(value);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  }

  function exportCsv() {
    const ev = currentResults();
    const rr = ev.metrics.requirementResults;
    const header = ['ID', 'Requirement', 'Status', 'Score', 'Min', 'Max', 'Applicable responses', 'Confidence', 'Failed by', 'Weakest response', 'Weakest reason'];
    const rows = rr.requirements.map(r => [
      r.id, r.text, r.status, r.score, r.min, r.max, r.applicable, r.confidence || '',
      (r.failedBy || []).join(' + '), r.worstIndex === null ? '' : `#${r.worstIndex + 1}`, r.worstReason,
    ]);
    const csv = [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
    download(`requirements-${ev.conversationId || 'run'}.csv`, `﻿${csv}`, 'text/csv;charset=utf-8');
    notify('✅ Requirement results exported as CSV.', 'success');
  }

  function exportJson() {
    const ev = currentResults();
    const report = {
      exportedAt: new Date().toISOString(),
      conversationId: ev.conversationId,
      combinedPass: ev.metrics.requirementResults.combinedPass,
      requirements: ev.metrics.requirements,
      requirementResults: ev.metrics.requirementResults,
      artifact: ev,
    };
    download(`requirements-${ev.conversationId || 'run'}.json`, JSON.stringify(report, null, 2), 'application/json');
    notify('✅ Requirement results exported as JSON.', 'success');
  }

  function chartImages(rr) {
    if (typeof Chart === 'undefined') return {};
    const images = {};
    Object.entries(chartConfigs(rr, true)).forEach(([key, config]) => {
      const canvas = document.createElement('canvas');
      // Chart.js doubles the canvas pixels (devicePixelRatio 2), so keep the intended print size here.
      const width = 600;
      const height = key === 'bar' ? Math.max(220, 34 * config.data.labels.length + 60) : 320;
      canvas.width = width;
      canvas.height = height;
      canvas.style.cssText = `width:${width}px;height:${height}px;`;
      const holder = document.createElement('div');
      holder.style.cssText = 'position:fixed;left:-10000px;top:0;';
      holder.appendChild(canvas);
      document.body.appendChild(holder);
      const chart = new Chart(canvas, { ...config, options: { ...config.options, responsive: false, animation: false } });
      images[key] = { src: canvas.toDataURL('image/png'), width, height };
      chart.destroy();
      holder.remove();
    });
    return images;
  }

  function reportHtml(ev) {
    const m = ev.metrics;
    const rr = m.requirementResults;
    const s = rr.summary;
    const v = verdictText(m, rr);
    const images = chartImages(rr);
    const failing = rr.requirements.filter(r => r.status === 'Fail');
    const untested = rr.requirements.filter(r => r.status === 'Not tested' || r.status === 'Not measured');
    const th = 'style="background:#eef0f6;border:1px solid #c9ccd6;padding:6px 8px;text-align:left;font-size:11px;"';
    const td = 'style="border:1px solid #d6d8e0;padding:6px 8px;font-size:11px;vertical-align:top;word-break:break-word;"';
    const h2 = (t) => `<h2 style="font-size:16px;color:#1a237e;border-bottom:2px solid #1a237e;padding-bottom:4px;margin:22px 0 10px;page-break-after:avoid;">${t}</h2>`;
    const table = (headers, rows) => `<table style="width:100%;border-collapse:collapse;margin-bottom:8px;"><thead><tr>${headers.map(h => `<th ${th}>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr class="rq-keep">${r.map(c => `<td ${td}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const statusCell = (st) => `<strong>${esc(st.toUpperCase())}</strong>`;
    // Fixed image sizes: page breaks are computed before data-URL images finish loading.
    const img = (key, title, tableHtml, heading = '') => images[key] ? `<div class="rq-keep" style="margin:10px 0;page-break-inside:avoid;">${heading}<div style="font-weight:700;font-size:12px;margin-bottom:4px;">${title}</div><img src="${images[key].src}" width="${images[key].width}" height="${images[key].height}" style="display:block;width:${images[key].width}px;height:${images[key].height}px;"></div>${tableHtml}` : '';
    const tested = rr.requirements.filter(r => r.score !== null);
    const scoreTable = table(['ID', 'Score', 'Status'], tested.map(r => [esc(r.id), pct(r.score), statusCell(r.status)]));
    const counts = chartData(rr).counts;

    const summaryLines = [
      `The chatbot met <strong>${s.passed} of ${s.tested}</strong> tested requirement${s.tested === 1 ? '' : 's'}${s.tested ? ` (${pct(s.passRate)})` : ''}; ${s.tested} of ${s.selected} selected requirements were exercised by this run's prompts (coverage ${pct(s.coverage)}).`,
      failing.length ? `Failing: ${failing.map(r => `${esc(r.id)} (${pct(r.score)}${r.failedBy.includes('caseFloor') ? ', a response below the floor' : ''})`).join(', ')}.` : 'No tested requirement failed.',
      untested.length ? `${untested.length} requirement${untested.length === 1 ? ' has' : 's have'} no verdict (not tested or not measured) and ${untested.length === 1 ? 'is' : 'are'} not counted as passing.` : '',
      `Quality metrics: ${m.metricsPassed ?? 0}/${m.metricsTotal ?? 0} passed (${m.overallPass ? 'PASS' : 'FAIL'}). Combined DeepEval verdict: <strong>${rr.combinedPass ? 'PASS' : 'FAIL'}</strong>.`,
      s.lowConfidence ? `${s.lowConfidence} result${s.lowConfidence === 1 ? ' has' : 's have'} Low confidence (few applicable responses or a score within the noise band); confirm with a re-run before acting on ${s.lowConfidence === 1 ? 'it' : 'them'}.` : '',
    ].filter(Boolean);

    const findings = failing.map((r, i) => {
      const worst = (rr.perResponse || [])
        .map(p => ({ index: p.index, ...(p.results[r.id] || {}) }))
        .filter(e => e.applies)
        .sort((a, b) => a.score - b.score)
        .slice(0, 3);
      // The first finding carries the section heading so the heading is never left alone at a page end.
      return `${i === 0 ? '<div class="rq-keep">' + h2('5. Findings: Failing Requirements') : ''}<div class="rq-keep" style="border:1px solid #d6d8e0;border-left:4px solid #555;padding:8px 10px;margin-bottom:10px;">
        <div style="font-weight:700;font-size:12px;">${esc(r.id)} — ${esc(r.text)}</div>
        <div style="font-size:11px;color:#444;margin:2px 0 6px;">Score ${pct(r.score)} · min ${pct(r.min)} · ${r.applicable} applicable · failed: ${esc(failedByText(r))} · ${esc(r.confidence)} confidence</div>
        ${worst.map(e => `<div style="font-size:11px;margin:6px 0 0;padding-top:6px;border-top:1px dashed #ccc;">
          <div><strong>Response #${e.index + 1}</strong> · ${esc(e.verdict.toUpperCase())} · ${pct(e.score)}</div>
          <div><strong>Prompt:</strong> ${esc(clip(promptOf(m, e.index), 300))}</div>
          <div><strong>Reply excerpt:</strong> ${esc(clip(plain((m.responses || [])[e.index]), 400))}</div>
          <div><strong>Judge's reason:</strong> ${esc(e.reason)}</div></div>`).join('')}
      </div>${i === 0 ? '</div>' : ''}`;
    }).join('');

    const el = document.createElement('div');
    // 680px fits the printable width of A4 with 12 mm side margins.
    el.style.cssText = 'width:680px;padding:0 2px;font-family:Arial,Helvetica,sans-serif;color:#222;line-height:1.5;background:#fff;';
    el.innerHTML = `
      <div style="padding:28px 0 18px;border-bottom:3px solid #1a237e;">
        <div style="font-size:11px;letter-spacing:2px;color:#555;text-transform:uppercase;">DeepEval · Requirement Evaluation Report</div>
        <div style="font-size:24px;font-weight:700;color:#1a237e;margin:6px 0;">Requirements Report</div>
        <div style="font-size:12px;color:#444;">Run ${esc(ev.conversationId || '')} · ${esc(new Date(m.timestamp).toLocaleString())}</div>
        <div style="font-size:12px;color:#444;">Chatbot endpoint: ${esc(m.apiEndpoint || '')} · Mode: ${esc(m.evaluationMode || '')}${m.suiteName ? ` (${esc(m.suiteName)})` : ''}</div>
        <div style="margin-top:14px;padding:12px 14px;border:2px solid #222;font-size:15px;font-weight:700;">${esc(v.text)}</div>
      </div>

      ${h2('1. Executive Summary')}
      ${summaryLines.map(l => `<p style="font-size:12px;margin:0 0 6px;">${l}</p>`).join('')}
      ${table(['Selected', 'Tested', 'Passed', 'Failed', 'Not tested', 'Not measured', 'Pass rate', 'Coverage'],
        [[s.selected, s.tested, s.passed, s.failed, s.notTested, s.notMeasured, pct(s.passRate), pct(s.coverage)].map(String)])}

      ${h2('2. Requirements in Scope')}
      <p style="font-size:11px;color:#555;margin:0 0 6px;">Snapshot saved with this run; later edits to the requirement list do not change these results.</p>
      ${table(['ID', 'Requirement'], (m.requirements || []).map(r => [`<strong>${esc(r.id)}</strong>`, esc(r.text)]))}

      ${h2('3. Requirement Scorecard')}
      ${table(['ID', 'Requirement', 'Status', 'Score', 'Min', 'Applicable', 'Confidence'],
        rr.requirements.map(r => [`<strong>${esc(r.id)}</strong>`, esc(r.text), statusCell(r.status), pct(r.score), pct(r.min), String(r.applicable), esc(r.confidence || '—')]))}

      ${images.bar ? '' : h2('4. Charts')}
      ${img('bar', 'Requirement scores (bar = score %, label shows status)', scoreTable, h2('4. Charts'))}
      ${img('radar', 'Requirement scores vs the 75% bar', '')}
      ${img('donut', 'Requirements by status', table(['Status', 'Count'], ['Pass', 'Fail', 'Not tested', 'Not measured'].map((st, i) => [st, String(counts[i])])))}

      ${findings || `<div class="rq-keep">${h2('5. Findings: Failing Requirements')}<p style="font-size:12px;">No tested requirement failed.</p></div>`}

      <div class="rq-keep">${h2('6. Not Tested / Not Measured')}
      ${untested.length ? table(['ID', 'Requirement', 'Status'], untested.map(r => [esc(r.id), esc(r.text), statusCell(r.status)])) : '<p style="font-size:12px;">Every selected requirement was tested.</p>'}</div>

      <div class="rq-keep" style="font-size:11px;">${h2('7. Methodology')}
        <p style="margin:0 0 6px;"><strong>Three isolated sessions.</strong> (1) The chatbot under test answers the prompts. (2) The metric judge scores the quality metrics in its own stateless calls. (3) The requirement judge checks each reply against the requirements in a separate process with its own system prompt; it never sees the metric judge's scores or reasons, so it cannot anchor on them.</p>
        <p style="margin:0 0 6px;"><strong>Scoring.</strong> For each reply the judge decides whether a requirement applies and, if so, scores compliance 0–1 using calibration anchors. A requirement passes when its average over applicable replies is at least the pass bar and no single applicable reply scores below the case floor. Requirements no prompt exercised are “Not tested” and are never counted as passing.</p>
        ${table(['Setting', 'Value'], runDetailsRows(m, rr).map(([k, val]) => [esc(k), esc(val)]))}
        <p style="margin:6px 0 0;"><strong>Limitations.</strong> Judgments come from a language model and vary between identical runs by up to about ${pct(rr.thresholds?.noiseBand)}; borderline scores are re-judged to reduce this. Whether a requirement applies is the judge's decision. Coverage depends entirely on the prompts in the run. Results are evidence for review, not a certification.</p>
      </div>

      <div class="rq-keep">${h2('8. Sign-off')}${table(['Role', 'Name', 'Signature', 'Date'], [['Prepared by', '', '', ''], ['Reviewed by', '', '', ''], ['Approved by', '', '', '']].map(r => r.map(c => c || '&nbsp;<br>&nbsp;')))}</div>
      <p style="font-size:10px;color:#777;margin-top:16px;">Generated ${esc(new Date().toLocaleString())} from the saved run artifact.</p>
    `;
    return el;
  }

  async function downloadReport() {
    const ev = currentResults();
    if (typeof html2pdf === 'undefined') throw new Error('The PDF library has not loaded. Refresh the page and try again.');
    useRunThresholds(ev.metrics.requirementResults);
    notify('⏳ Generating requirements report...', 'loading');
    const element = reportHtml(ev);
    await Promise.all([...element.querySelectorAll('img')].map(i => (i.decode ? i.decode().catch(() => {}) : null)));
    const title = `Requirements Report · ${ev.conversationId || ''}`;
    await html2pdf().set({
      margin: [16, 12, 16, 12],
      filename: `requirements-report-${ev.conversationId || new Date().toISOString().slice(0, 10)}.pdf`,
      image: { type: 'jpeg', quality: 0.96 },
      html2canvas: { scale: 2, useCORS: true, logging: false, scrollX: 0, scrollY: 0 },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.rq-keep', 'h2'] },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }).from(element).toPdf().get('pdf').then(pdf => {
      const pages = pdf.internal.getNumberOfPages();
      const w = pdf.internal.pageSize.getWidth();
      const h = pdf.internal.pageSize.getHeight();
      for (let i = 1; i <= pages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(90);
        pdf.text(title, 12, 9);
        pdf.text(`Page ${i} of ${pages}`, w - 12, h - 7, { align: 'right' });
        pdf.text('Confidential · DeepEval requirement evaluation', 12, h - 7);
      }
    }).save();
    notify('✅ Requirements report downloaded.', 'success');
  }

  window.RequirementsUI = {
    init, getSelectedForRun, renderResults, artifactCardLine, comparisonHtml,
    addFromInput, toggle, selectAll, remove, exportCsv, exportJson, downloadReport,
    // Exposed for automated checks of the page against the artifact.
    _internal: { csvCell, verdictText, chartData, state },
  };
})();
