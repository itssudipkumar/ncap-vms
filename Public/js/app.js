/* App init and boot */
function initApp() {
  // Header
  const av = document.getElementById('header-av'); if (av) av.textContent   = initials(currentUser.name);
  const name = document.getElementById('header-name'); if (name) name.textContent = currentUser.name;
  const role = document.getElementById('header-role'); if (role) role.textContent = currentUser.role === 'admin' ? 'Admin' : 'Staff · ' + currentUser.id;

  // Admin nav items
  if (currentUser.role === 'admin') {
    document.getElementById('nav-admin').classList.remove('hidden');
    document.getElementById('nav-users').classList.remove('hidden');
  } else {
    document.getElementById('nav-admin').classList.add('hidden');
    document.getElementById('nav-users').classList.add('hidden');
  }

  // Clock
  updateClock();
  clockInterval = setInterval(updateClock, 1000);

  // Live refresh for kiosk/dashboard (keep display updating)
  if (liveRefreshInterval) clearInterval(liveRefreshInterval);
  liveRefreshInterval = setInterval(renderAll_views, 5000);

  renderAll_views();
  renderAdminToggles();
  renderUserList();
  showView('dashboard');
}

function updateClock() {
  const now = new Date();
  const ts  = now.toLocaleTimeString('en-AU', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
  const dt  = now.toLocaleDateString('en-AU', { weekday:'short', day:'2-digit', month:'short', year:'numeric' });
  const el  = document.getElementById('dash-time'); if (el) el.textContent = ts;
  const si  = document.getElementById('dash-session-info'); if (si) si.textContent = dt;
  const af = document.getElementById('auto-date'); if (af) af.textContent = now.toLocaleDateString('en-AU', { day:'2-digit', month:'short', year:'numeric' });
  const at = document.getElementById('auto-time'); if (at) at.textContent = ts;
}

function showView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const viewEl = document.getElementById('view-' + view);
  if (viewEl) viewEl.classList.add('active');
  const navEl = document.querySelector(`.nav-item[data-view="${view}"]`);
  if (navEl) navEl.classList.add('active');
  renderAll_views();
}

function renderAll_views() {
  renderDashboard();
  renderActive();
  renderAll();
  renderReports();
  updateStats();
}

function setFilter(ctx, el) {
  const siblings = el.parentElement.querySelectorAll('.filter-pill');
  siblings.forEach(s => s.classList.remove('active'));
  el.classList.add('active');
  if (ctx === 'dash')   { filterState.dash   = el.dataset.filter; renderDashboard(); }
  if (ctx === 'all')    { filterState.all    = el.dataset.filter; renderAll(); }
  if (ctx === 'report') { filterState.report = el.dataset.filter; renderReports(); }
}

function setSort(ctx, val, el) {
  const siblings = el.parentElement.querySelectorAll('.sort-chip');
  siblings.forEach(s => s.classList.remove('active'));
  el.classList.add('active');
  if (ctx === 'dash') { sortState.dash = val; renderDashboard(); }
  if (ctx === 'all')  { sortState.all  = val; renderAll(); }
}

/* Reports */
function buildSessions() {
  const sessions = {};
  VISITORS.forEach(v => {
    const start = getSessionStart(new Date(v.entryTimestamp));
    const key   = start.toISOString().slice(0,10);
    if (!sessions[key]) sessions[key] = { start, visitors: [] };
    sessions[key].visitors.push(v);
  });
  return Object.values(sessions).sort((a,b) => b.start - a.start);
}

function isLiveSession(sessionStart) {
  const now = new Date();
  const end = new Date(sessionStart.getTime() + 24*60*60*1000);
  return now >= sessionStart && now < end;
}

function renderReports() {
  if (!currentUser) return;  // Skip if no user logged in
  const dateFilter = document.getElementById('report-date-filter')?.value || '';
  let sessions = buildSessions();
  if (dateFilter) {
    sessions = sessions.filter(s => s.start.toISOString().slice(0,10) === dateFilter);
  }
  if (filterState.report === 'live') { sessions = sessions.filter(s => isLiveSession(s.start)); }
  else if (filterState.report === 'closed') { sessions = sessions.filter(s => !isLiveSession(s.start)); }
  const el = document.getElementById('report-list');
  if (!el) return;
  if (!sessions.length) { el.innerHTML = `<div class="empty-state"><div class="empty-icon">📁</div>No reports found</div>`; return; }
  el.innerHTML = sessions.map(s => {
    const live   = isLiveSession(s.start);
    const dayStr = s.start.toLocaleDateString('en-AU', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
    const endDt  = new Date(s.start.getTime() + 24*60*60*1000);
    const meta   = `06:30 → ${endDt.toLocaleDateString('en-AU',{day:'2-digit',month:'short'})} 06:30 · ${s.visitors.length} visitors · ${live ? 'in progress' : 'closed'}`;
    const csvOk  = currentUser.role === 'admin' || FEATURES.csvExport;
    const pdfOk  = currentUser.role === 'admin' || FEATURES.pdfExport;
    const dateKey = s.start.toISOString().slice(0,10);
    return `<div class="report-card">
      <div>
        <div class="report-day">${dayStr}</div>
        <div class="report-meta">${meta}</div>
      </div>
      <div class="report-btns">
        ${pdfOk ? `<button class="btn-pdf" onclick="exportPDF('${dateKey}')">PDF</button>` : ''}
        ${csvOk ? `<button class="btn-csv" onclick="exportCSV('${dateKey}')">CSV</button>` : ''}
        <button class="btn-print" onclick="printReport('${dateKey}')">Print</button>
        ${live
          ? `<span class="chip-live"><span style="width:5px;height:5px;border-radius:50%;background:var(--green);flex-shrink:0;"></span>Live</span>`
          : `<span class="chip-locked">Read-only</span>`}
      </div>
    </div>`;
  }).join('');
}

function exportCSV(dateKey) {
  const sessions = buildSessions();
  const s = sessions.find(x => x.start.toISOString().slice(0,10) === dateKey);
  if (!s) return;
  const rows = [['Rego','Name','Company','Dept/Person','Entry Date','Entry Time','Exit Date','Exit Time','Status']];
  s.visitors.forEach(v => {
    const entry  = new Date(v.entryTimestamp);
    const exit   = v.exitTimestamp ? new Date(v.exitTimestamp) : null;
    rows.push([
      v.rego, v.name, v.company, v.dept,
      entry.toLocaleDateString('en-AU'), entry.toLocaleTimeString('en-AU', {hour:'2-digit',minute:'2-digit'}),
      exit ? exit.toLocaleDateString('en-AU') : '',
      exit ? exit.toLocaleTimeString('en-AU', {hour:'2-digit',minute:'2-digit'}) : '',
      v.exitTimestamp ? 'Off Site' : 'On Site'
    ]);
  });
  const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type:'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `NCAP_Visitors_${dateKey}.csv`; a.click();
  showToast('CSV downloaded.', 'success');
}

function exportPDF(dateKey) {
  const sessions = buildSessions();
  const s = sessions.find(x => x.start.toISOString().slice(0,10) === dateKey);
  if (!s) return;
  const dayStr = s.start.toLocaleDateString('en-AU', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
  const rows   = s.visitors.map(v => {
    const entry = new Date(v.entryTimestamp);
    const exit  = v.exitTimestamp ? new Date(v.exitTimestamp) : null;
    return `<tr>
      <td>${v.rego}</td>
      <td>${v.name}</td>
      <td>${v.company}</td>
      <td>${v.dept}</td>
      <td>${entry.toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'})}</td>
      <td>${exit ? exit.toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'}) : '—'}</td>
      <td>${v.exitTimestamp ? 'Off Site' : 'On Site'}</td>
    </tr>`;
  }).join('');

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head>
    <title>NCAP Visitor Report — ${dayStr}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:30px;color:#111;} h1{font-size:18px;color:#1E3A5F;margin-bottom:4px;} h2{font-size:13px;color:#6B7280;font-weight:normal;margin-bottom:20px;} table{width:100%;border-collapse:collapse;font-size:12px;} th{background:#1E3A5F;color:#fff;padding:8px 10px;text-align:left;} td{padding:7px 10px;border-bottom:1px solid #E5E7EB;} tr:nth-child(even){background:#F8FAFF;} .footer{margin-top:20px;font-size:10px;color:#9CA3AF;}
    </style>
  </head><body>
    <h1>Nissan Casting PTY LTD — Visitor Report</h1>
    <h2>${dayStr} · Generated ${new Date().toLocaleString('en-AU')}</h2>
    <table>
      <thead><tr><th>Rego</th><th>Name</th><th>Company</th><th>Department</th><th>Entry</th><th>Exit</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="footer">Total visitors: ${s.visitors.length} · Generated by NCAP VMS</div>
  </body></html>`);
  win.document.close();
  win.print();
}

function printReport(dateKey) { exportPDF(dateKey); }

// Boot: keyboard support for PIN (login)
document.addEventListener('keydown', e => {
  const loginPage = document.getElementById('login-page');
  if (!loginPage) return;
  if (!loginPage.classList.contains('hidden')) {
    const useridFocused = document.activeElement === document.getElementById('inp-userid');
    if (useridFocused) return;
    if (e.key >= '0' && e.key <= '9') { e.preventDefault(); pinPress(parseInt(e.key)); }
    if (e.key === 'Backspace') { e.preventDefault(); pinDel(); }
    if (e.key === 'Escape') pinClear();
  }
});

// Seed sample data on load
document.addEventListener('DOMContentLoaded', () => {
  seedData();
});
