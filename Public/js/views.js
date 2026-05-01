/* Rendering and view logic */
function filterVisitors(list, filter) {
    if (filter === 'onsite') return list.filter(v => !v.exitTimestamp);
    if (filter === 'offsite') return list.filter(v => v.exitTimestamp);
    return list;
}

function sortVisitors(list, sort) {
    const copy = [...list];
    if (sort === 'status') {
        return copy.sort((a, b) => {
            const aOn = !a.exitTimestamp ? 0 : 1;
            const bOn = !b.exitTimestamp ? 0 : 1;
            if (aOn !== bOn) return aOn - bOn;
            return new Date(a.entryTimestamp) - new Date(b.entryTimestamp);
        });
    }
    if (sort === 'time') return copy.sort((a, b) => new Date(a.entryTimestamp) - new Date(b.entryTimestamp));
    if (sort === 'name') return copy.sort((a, b) => a.name.localeCompare(b.name));
    return copy;
}

function searchVisitors(list, query) {
    if (!query) return list;
    const q = query.toLowerCase();
    return list.filter(v =>
        v.name.toLowerCase().includes(q) ||
        v.rego.toLowerCase().includes(q) ||
        v.company.toLowerCase().includes(q) ||
        v.dept.toLowerCase().includes(q)
    );
}

function todayVisitors() {
    const start = getTodaySessionStart();
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return VISITORS.filter(v => {
        const e = new Date(v.entryTimestamp);
        return e >= start && e < end;
    });
}

function renderDashboard() {
    const q = document.getElementById('dash-search')?.value || '';
    let list = todayVisitors();
    list = searchVisitors(list, q);
    list = filterVisitors(list, filterState.dash);
    list = sortVisitors(list, sortState.dash);
    const labelEl = document.getElementById('dash-table-label');
    if (labelEl) labelEl.textContent = `Today's visitors (${list.length})`;
    renderTable('dash-table-body', list, true);
}

function renderActive() {
    const q = document.getElementById('active-search')?.value || '';
    let list = todayVisitors().filter(v => !v.exitTimestamp);
    list = searchVisitors(list, q);
    list = list.sort((a, b) => new Date(a.entryTimestamp) - new Date(b.entryTimestamp));
    renderTable('active-table-body', list, false);
}

function renderAll() {
    const q = document.getElementById('all-search')?.value || '';
    let list = [...VISITORS];
    list = searchVisitors(list, q);
    list = filterVisitors(list, filterState.all);
    list = sortVisitors(list, sortState.all);
    renderTable('all-table-body', list, false);
}

function renderTable(containerId, list, todayOnly) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!list.length) {
        el.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div>No visitors found</div>`;
        return;
    }
    el.innerHTML = list.map(v => rowHTML(v)).join('');
}

function plateHTML(rego) {
    return `<div class="vplate">
    <div class="vplate-vic"></div>
    <div class="vplate-num">${rego.toUpperCase()}</div>
  </div>`;
}

function rowHTML(v) {
    const onsite = !v.exitTimestamp;
    const editOk = canEdit(v);
    const entryDt = new Date(v.entryTimestamp);
    const entryStr = entryDt.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
    const exitStr = v.exitTimestamp
        ? new Date(v.exitTimestamp).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
        : '';

    let actionsHTML = '';
    if (onsite) {
        actionsHTML = `
      <button class="exit-btn" onclick="openExitConfirm('${v.id}')">Exit</button>
      ${editOk ? `<button class="edit-btn" onclick="openEditModal('${v.id}')" title="Edit visitor details">✏️</button>` : ''}
    `;
    } else {
        actionsHTML = `
      <div style="display:flex;flex-direction:column;gap:2px;">
        <span class="exit-time">Out ${exitStr}</span>
        ${editOk ? `<button class="edit-btn" onclick="openEditModal('${v.id}')" title="Edit visitor details">✏️</button>` : '<span class="lock-lbl">Locked</span>'}
      </div>
    `;
    }

    return `<div class="vtrow ${onsite ? '' : 'offsite'}">
    <div>${plateHTML(v.rego)}</div>
    <div><div class="vname">${esc(v.name)}</div><div class="vco">${esc(v.company)}</div></div>
    <div class="vdept">${esc(v.dept)}</div>
    <div class="vts">${entryStr}</div>
    <div>${onsite
            ? `<span class="badge-on"><span class="sdot"></span>On Site</span>`
            : `<span class="badge-off"><span class="sdot"></span>Off Site</span>`
        }</div>
    <div class="actions">${actionsHTML}</div>
  </div>`;
}

function updateStats() {
    const today = todayVisitors();
    const onsite = today.filter(v => !v.exitTimestamp).length;
    const off = today.filter(v => v.exitTimestamp).length;
    const elTotal = document.getElementById('stat-total'); if (elTotal) elTotal.textContent = today.length;
    const elOn = document.getElementById('stat-onsite'); if (elOn) elOn.textContent = onsite;
    const elOff = document.getElementById('stat-offsite'); if (elOff) elOff.textContent = off;
    const badge = document.getElementById('active-badge'); if (badge) badge.textContent = onsite;
    const name = document.getElementById('dash-user-name'); if (name) name.textContent = currentUser ? currentUser.name : '—';
}
