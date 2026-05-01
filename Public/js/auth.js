/* Auth and PIN pad logic */
let pinBuffer = '';
const PIN_LEN = 4;

function pinPress(digit) {
  if (pinBuffer.length >= PIN_LEN) return;
  pinBuffer += String(digit);
  updatePinDots();
  if (pinBuffer.length === PIN_LEN) {
    setTimeout(() => {
      document.getElementById('inp-pass').value = pinBuffer;
      doLogin();
    }, 180);
  }
}

function pinDel() {
  pinBuffer = pinBuffer.slice(0, -1);
  updatePinDots();
}

function pinClear() {
  pinBuffer = '';
  updatePinDots();
}

function updatePinDots() {
  for (let i = 0; i < PIN_LEN; i++) {
    const dot = document.getElementById('dot-' + i);
    if (!dot) continue;
    dot.classList.toggle('filled', i < pinBuffer.length);
  }
}

function shakePinDots() {
  pinBuffer = '';
  for (let i = 0; i < PIN_LEN; i++) {
    const dot = document.getElementById('dot-' + i);
    if (!dot) continue;
    dot.classList.remove('filled');
    dot.classList.add('shake');
    setTimeout(() => dot.classList.remove('shake'), 500);
  }
}

function doLogin() {
  const id = document.getElementById('inp-userid').value.trim();
  const pass = document.getElementById('inp-pass').value;
  const user = USERS.find(u => u.id === id && u.pass === pass);
  if (!user) {
    showEl('login-error', 'Invalid User ID or passcode. Please try again.');
    shakePinDots();
    return;
  }
  pinBuffer = ''; updatePinDots();
  currentUser = user;
  // persist session so user stays logged in across reloads (kiosk-style)
  try { localStorage.setItem('vms_currentUser', JSON.stringify({ id: user.id })); } catch (e) { console.warn('Failed to persist session', e); }

  // Import pending self-check-ins from localStorage
  try {
    const pending = JSON.parse(localStorage.getItem('pendingCheckIns') || '[]');
    if (pending.length > 0) {
      VISITORS.push(...pending);
      localStorage.removeItem('pendingCheckIns');
      showToast(`${pending.length} visitor(s) imported from self check-in.`, 'success');
    }
  } catch (err) {
    console.error('Failed to import check-ins:', err);
  }

  hideEl('login-error');
  document.getElementById('login-page').classList.add('hidden');
  document.getElementById('app-page').classList.remove('hidden');
  initApp();
}

function doLogout() {
  currentUser = null;
  if (clockInterval) clearInterval(clockInterval);
  if (liveRefreshInterval) { clearInterval(liveRefreshInterval); liveRefreshInterval = null; }
  document.getElementById('inp-pass').value = '';
  document.getElementById('app-page').classList.add('hidden');
  document.getElementById('login-page').classList.remove('hidden');
  try { localStorage.removeItem('vms_currentUser'); } catch (e) { }
  showView('dashboard');
}

// Allow Enter key on login
document.addEventListener('DOMContentLoaded', () => {
  const inpPass = document.getElementById('inp-pass');
  const inpUser = document.getElementById('inp-userid');
  if (inpPass) inpPass.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  if (inpUser) inpUser.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('pin-pad').querySelector('.pin-key').focus(); });

  // Auto-restore session for kiosk: if a user was previously logged in, restore and init app
  try {
    const stored = JSON.parse(localStorage.getItem('vms_currentUser') || 'null');
    if (stored && stored.id) {
      // prefer the canonical user object from USERS if present
      const restored = USERS.find(u => u.id === stored.id) || stored;
      currentUser = restored;
      // import any pending self-checkins (same as doLogin)
      try {
        const pending = JSON.parse(localStorage.getItem('pendingCheckIns') || '[]');
        if (pending.length > 0) {
          VISITORS.push(...pending);
          localStorage.removeItem('pendingCheckIns');
          showToast && showToast(`${pending.length} visitor(s) imported from self check-in.`, 'success');
        }
      } catch (err) { console.warn('Failed to import check-ins on restore', err); }

      document.getElementById('login-page')?.classList.add('hidden');
      document.getElementById('app-page')?.classList.remove('hidden');
      initApp();
      showToast && showToast('Session restored — kiosk mode active.', 'success');
    }
  } catch (e) {
    console.warn('No stored session', e);
  }
});
