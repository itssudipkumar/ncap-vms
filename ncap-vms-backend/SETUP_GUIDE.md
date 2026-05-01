# NCAP VMS — Complete Setup Guide
# Free Stack: Supabase (DB) + Render (hosting)
# ============================================================

## WHAT YOU NEED
- A computer with a browser
- Free accounts on: GitHub, Supabase, Render
- No coding experience needed for setup

---

## STEP 1 — Create a GitHub Account + Upload Code

1. Go to https://github.com and sign up (free)
2. Click "New repository" → name it `ncap-vms` → Public → Create
3. Upload all backend files by dragging them into the repo page
   OR install Git and run:
     git init
     git add .
     git commit -m "initial commit"
     git remote add origin https://github.com/YOUR_USERNAME/ncap-vms.git
     git push -u origin main

---

## STEP 2 — Set Up Supabase (Free PostgreSQL Database)

1. Go to https://supabase.com → Sign Up (free)
2. Click "New Project"
   - Name: ncap-vms
   - Password: choose a strong password (SAVE THIS)
   - Region: choose closest to Australia (e.g. ap-southeast-1 Singapore)
3. Wait ~2 minutes for project to start
4. Go to: SQL Editor (left sidebar) → New Query
5. Copy the ENTIRE contents of `db/schema.sql`
6. Paste into the SQL editor → Click "Run"
   ✅ You should see "Success. No rows returned"
7. Get your connection string:
   - Left sidebar → Project Settings → Database
   - Scroll to "Connection string" → select "URI"
   - Copy the string — looks like:
     postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
   - Replace [YOUR-PASSWORD] with the password from step 2
   - SAVE THIS — you need it in Step 3

---

## STEP 3 — Deploy Backend to Render (Free Hosting)

1. Go to https://render.com → Sign Up with GitHub (free)
2. Click "New +" → "Web Service"
3. Connect your GitHub repo → select `ncap-vms`
4. Fill in settings:
   - Name: ncap-vms
   - Region: Singapore (closest to Australia)
   - Branch: main
   - Runtime: Node
   - Build Command: npm install
   - Start Command: npm start
5. Click "Add Environment Variables" and add:

   Key                 Value
   ──────────────────────────────────────────────────────
   DATABASE_URL        postgresql://postgres:...  (from Step 2)
   JWT_SECRET          (generate: open any browser console, type:
                        btoa(Math.random().toString(36).repeat(10))
                        copy the result)
   JWT_EXPIRES_IN      12h
   NODE_ENV            production
   FRONTEND_URL        https://ncap-vms.onrender.com
                       (use your actual Render URL once created)

6. Click "Create Web Service"
7. Wait 3-5 minutes for first deploy
8. Your backend will be live at: https://ncap-vms.onrender.com
   ✅ Visit https://ncap-vms.onrender.com/health — should show {"status":"ok"}

---

## STEP 4 — Connect Frontend to Backend

Open your `NCAP_VMS.html` file and add this near the top of the <script> tag:

  const API_BASE = 'https://ncap-vms.onrender.com/api';

Then replace the mock login with a real API call:

  async function doLogin() {
    const userId  = document.getElementById('inp-userid').value.trim();
    const passcode = pinBuffer;
    try {
      const res  = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, passcode })
      });
      const data = await res.json();
      if (!res.ok) {
        showEl('login-error', data.error || 'Invalid credentials');
        shakePinDots();
        return;
      }
      localStorage.setItem('vms_token', data.token);
      currentUser = data.user;
      // continue to app...
      initApp();
    } catch (e) {
      showEl('login-error', 'Cannot reach server. Check connection.');
    }
  }

  // Add token to all API calls:
  function apiHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('vms_token')}`
    };
  }

---

## KIOSK & SELF CHECK-IN (QR flow)

This release adds a simple kiosk pattern so staff can display a QR code for visitors to scan and complete the form on their phones. The flow is implemented in `Public/check-in.html` and works with two URL modes:

- `check-in.html?kiosk=1` — kiosk-only mode: shows a large QR code that links to the form URL.
- `check-in.html?form=1` — form-only mode: displays the visitor form (no QR). Use this in the scanned link.

Key behaviours and notes:
- QR generation uses `qrcodejs` (CDN) and encodes the `?form=1` link so visitors open the form on their phone.
- The kiosk page includes `Print QR` and `Download QR` buttons so staff can print a sign or save the QR image.
- When a visitor submits the form the page attempts to POST to `/api/visitors` (same origin). If the POST fails (network or CORS), the page falls back to queuing the visitor in `localStorage.pendingCheckIns` so the kiosk device retains the record until it can be flushed.

Important: LocalStorage is device-local. If visitors use their own phone to submit (the common case), the fallback queue will be stored on that visitor's device and will not be visible to staff. To guarantee cross-device visibility, ensure the backend `/api/visitors` is reachable from visitor devices (see CORS note below) so the POST succeeds.

Server/CORS note (Express): if you host the frontend and backend on different origins, enable CORS on the backend. Add this minimal snippet to `server.js` before your routes:

```js
const cors = require('cors');
app.use(cors({ origin: '*' })); // simple, permissive; prefer restricting origin in production
```

If you prefer stricter control, set `origin` to your frontend origin (Netlify/Render URL).

Testing locally:
- If you open `check-in.html` via `file://` the script will fall back to `http://localhost:3000` as the API origin — update `postToBackend` or serve the `Public/` folder via a local static server for realistic testing (see below).

Serve `Public/` locally (recommended for testing):

1. Install `serve` globally (Node):

```bash
npm install -g serve
serve Public -p 8080
```

2. Open `http://localhost:8080/check-in.html?kiosk=1` to view the kiosk and scan the QR with a phone that can reach `http://localhost:8080` (or deploy both frontend and backend to public URLs).

Flushing queued check-ins:
- A simple approach is to add a small script in the staff app that reads `pendingCheckIns` from the kiosk device and POSTs them when connectivity returns. Alternatively, prefer ensuring the `/api/visitors` POST is reachable from visitor devices so queuing is rarely used.


---

## STEP 5 — Host Frontend (Free on Netlify)

1. Go to https://netlify.com → Sign Up (free)
2. Drag and drop your `NCAP_VMS.html` file onto the Netlify dashboard
3. Netlify gives you a free URL instantly:
   e.g. https://random-name-12345.netlify.app
4. Update FRONTEND_URL in Render to this Netlify URL

---

## DEFAULT LOGIN CREDENTIALS

  User ID    PIN    Role
  ─────────────────────────
  ADM-001    1234   Admin
  STF-042    5678   Staff
  STF-039    9012   Staff

⚠️  Change these passcodes immediately after first login!
    Admin Panel → Manage Users → Reset Passcode

---

## FREE TIER LIMITS

  Service     Free limit            Notes
  ─────────────────────────────────────────────────────────
  Supabase    500MB DB, 2GB transfer  More than enough for years of visitor logs
  Render      750 hrs/month          App sleeps after 15min inactivity
                                     First request after sleep takes ~30sec to wake
  Netlify     100GB bandwidth        Way more than enough

### Fix Render Sleep Issue (optional)
Add a free uptime monitor at https://uptimerobot.com
- Create account → Add monitor → HTTP → URL: https://ncap-vms.onrender.com/health
- Check every 5 minutes → keeps app awake during work hours

---

## REGENERATE PASSCODE HASHES (if you change PINs)

Run this in any terminal with Node installed:

  node -e "
    const b = require('bcryptjs');
    ['1234','5678','9012'].forEach(pin => {
      console.log(pin, '->', b.hashSync(pin, 10));
    });
  "

Paste new hashes into Supabase SQL editor:
  UPDATE users SET passcode = 'NEW_HASH' WHERE user_id = 'STF-042';

---

## FILE STRUCTURE

  ncap-vms/
  ├── server.js           Main server
  ├── package.json        Dependencies
  ├── .env.example        Env vars template (copy to .env)
  ├── .gitignore
  ├── db/
  │   ├── schema.sql      Run once in Supabase SQL editor
  │   └── pool.js         DB connection
  ├── middleware/
  │   └── auth.js         JWT verification
  ├── routes/
  │   ├── auth.js         Login endpoint
  │   ├── visitors.js     Visitor CRUD
  │   └── admin.js        User + feature management
  └── public/
      └── index.html      ← Put your NCAP_VMS.html here (rename to index.html)

---

## API REFERENCE

  POST   /api/auth/login              Login → returns JWT token
  GET    /api/auth/me                 Get current user

  GET    /api/visitors                List visitors (query: session, status, search)
  POST   /api/visitors                Add visitor
  PATCH  /api/visitors/:id            Edit visitor
  POST   /api/visitors/:id/exit       Record exit
  DELETE /api/visitors/:id            Soft delete (admin only)
  GET    /api/visitors/sessions/list  All session dates + counts

  GET    /api/admin/users             List users (admin only)
  POST   /api/admin/users             Create user
  PATCH  /api/admin/users/:userId     Update user / reset PIN
  DELETE /api/admin/users/:userId     Deactivate user
  GET    /api/admin/features          List feature flags
  PATCH  /api/admin/features/:key     Toggle feature
  GET    /api/admin/audit             Audit log

---
Built for Nissan Casting PTY LTD — NCAP VMS
