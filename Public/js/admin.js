/* Admin toggles and user management */
const TOGGLE_DEFS = [
  { key:'csvExport',    label:'CSV Export',    sub:'Staff can export visitor data' },
  { key:'pdfExport',    label:'PDF Reports',   sub:'Staff can download PDF reports' },
  { key:'editVisitor',  label:'Edit Visitor',  sub:'Staff can edit within session' },
  { key:'search',       label:'Search',        sub:'Search bar visible to staff' },
  { key:'deleteRecord', label:'Delete Records', sub:'Permanently remove entries' },
];

// Generate random 4-digit passcode
function generatePasscode() {
  return String(Math.floor(Math.random() * 10000)).padStart(4, '0');
}

function renderAdminToggles() {
  const el = document.getElementById('toggle-list');
  if (!el) return;
  el.innerHTML = TOGGLE_DEFS.map(t => `
    <div class="toggle-row">
      <div>
        <div class="toggle-lbl">${t.label}</div>
        <div class="toggle-sub">${t.sub}</div>
      </div>
      <div class="toggle ${FEATURES[t.key] ? 'on' : ''}" onclick="toggleFeature('${t.key}')"></div>
    </div>
  `).join('');
}

function toggleFeature(key) {
  FEATURES[key] = !FEATURES[key];
  renderAdminToggles();
  showToast(`${key} ${FEATURES[key] ? 'enabled' : 'disabled'}.`);
}

function renderUserList() {
  const el = document.getElementById('user-list');
  if (!el) return;
  el.innerHTML = USERS.map(u => `
    <div class="user-row">
      <div class="u-av" style="${u.role==='admin' ? 'background:linear-gradient(135deg,#7C3AED,#A78BFA);' : 'background:linear-gradient(135deg,var(--accent),#60A5FA);'}">${initials(u.name)}</div>
      <div style="flex:1;">
        <div class="u-name">${esc(u.name)}</div>
        <div class="u-id">${u.id}</div>
        <div class="u-pass">📝 ${u.pass}</div>
      </div>
      <div class="u-role-wrap">
        <span class="role-pill ${u.role === 'admin' ? 'role-admin' : 'role-staff'}">${u.role}</span>
        <div class="${u.id === currentUser.id ? 'u-online' : 'u-offline'}" title="${u.id === currentUser.id ? 'Logged in' : 'Offline'}"></div>
      </div>
      ${u.id !== currentUser.id
        ? `<div style="display:flex;gap:6px;margin-left:8px;">
            <button class="u-action-btn" onclick="regeneratePasscode('${u.id}')" title="Regenerate passcode">🔄</button>
            <button class="u-action-btn danger" onclick="deleteUser('${u.id}')">Remove</button>
          </div>`
        : `<span style="font-size:11px;color:var(--text3);font-weight:600;margin-left:8px;">You</span>`}
    </div>
  `).join('');
}

function regeneratePasscode(userId) {
  const user = USERS.find(u => u.id === userId);
  if (!user) return;
  const newPass = generatePasscode();
  user.pass = newPass;
  renderUserList();
  showToast(`Passcode reset: ${newPass}`, 'success');
}

function openCreateUserModal() {
  ['inp-new-name','inp-new-id','inp-new-pass'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const role = document.getElementById('inp-new-role'); if (role) role.value = 'staff';
  const passEl = document.getElementById('inp-new-pass'); if (passEl) passEl.placeholder = 'Auto-generated on submit';
  const modal = document.getElementById('modal-user'); if (modal) modal.classList.remove('hidden');
}

function submitCreateUser() {
  const name = document.getElementById('inp-new-name').value.trim();
  const id   = document.getElementById('inp-new-id').value.trim().toUpperCase();
  const role = document.getElementById('inp-new-role').value;
  if (!name || !id) { showToast('Fill name and ID.', 'error'); return; }
  if (USERS.find(u => u.id === id)) { showToast('User ID already exists.', 'error'); return; }
  const pass = generatePasscode();
  USERS.push({ id, name, pass, role });
  closeModal('modal-user');
  renderUserList();
  showToast(`User created. Passcode: ${pass}`, 'success');
}

function deleteUser(id) {
  USERS = USERS.filter(u => u.id !== id);
  renderUserList();
  showToast('User removed.');
}
