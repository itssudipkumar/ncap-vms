/* Utility helpers and session logic */
function getSessionStart(date) {
  const d = new Date(date);
  const h = d.getHours(), m = d.getMinutes();
  if (h < 6 || (h === 6 && m < 30)) {
    d.setDate(d.getDate() - 1);
  }
  d.setHours(6, 30, 0, 0);
  return d;
}

function getTodaySessionStart() {
  return getSessionStart(new Date());
}

function isCurrentSession(visitor) {
  const start = getTodaySessionStart();
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const entry = new Date(visitor.entryTimestamp);
  return entry >= start && entry < end;
}

function canEdit(visitor) {
  if (currentUser && currentUser.role === 'admin') return true;
  return isCurrentSession(visitor) && FEATURES.editVisitor;
}

function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showEl(id, text) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('hidden');
  if (text) el.textContent = text;
}

function hideEl(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('hidden');
}

let toastTimeout = null;
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  setTimeout(() => t.classList.add('show'), 10);
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => t.classList.remove('show'), 3000);
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

function closeModalBackdrop(e, id) {
  if (e.target.id === id) closeModal(id);
}

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function toggleUserMenu() { /* placeholder for dropdown */ }
