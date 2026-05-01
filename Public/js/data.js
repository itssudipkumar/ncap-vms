/* Data store and global state */
/* Default users — in production replace with server auth */
let USERS = [
  { id: 'ADM-001', name: 'R. Matsuda', pass: '1234', role: 'admin' },
  { id: 'STF-042', name: 'J. Barker', pass: '5678', role: 'staff' },
  { id: 'TF40', name: 'TechnoForty', pass: '1351', role: 'admin' },
];

/* Feature flags */
let FEATURES = {
  csvExport: true,
  pdfExport: true,
  editVisitor: true,
  darkMode: false,
  search: true,
  deleteRecord: false,
};

/* Visitor records */
let VISITORS = [];

/* State */
let currentUser = null;
let editingId = null;
let exitTargetId = null;
let clockInterval = null;
let liveRefreshInterval = null;

/* filters / sort state (defaults) */
let filterState = { dash: 'all', all: 'all', report: 'all' };
let sortState = { dash: 'status', all: 'time' };

function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

function seedData() {
  const now = new Date();
  const base = getTodaySessionStart();

  function ts(hoursOffset, minuteOffset = 0) {
    const d = new Date(base);
    d.setHours(d.getHours() + hoursOffset, d.getMinutes() + minuteOffset);
    return d.toISOString();
  }

  VISITORS = [
    { id: uid(), rego: 'ABC 123', name: 'Sarah Mitchell', company: 'Acme Logistics', dept: 'Operations / K. Lee', entryTimestamp: ts(2, 4), exitTimestamp: null, createdBy: 'STF-042' },
    { id: uid(), rego: 'LMN 456', name: 'Priya Sharma', company: 'TechPeak', dept: 'IT / R. Chen', entryTimestamp: ts(3, 25), exitTimestamp: null, createdBy: 'STF-042' },
    { id: uid(), rego: 'DEF 321', name: 'Mark Liu', company: 'SafeWorks', dept: 'Safety / Admin', entryTimestamp: ts(3, 52), exitTimestamp: null, createdBy: 'STF-039' },
    { id: uid(), rego: 'XYZ 987', name: 'Tom Reynolds', company: 'BuildCorp', dept: 'Engineering / J. Hart', entryTimestamp: ts(0, 42), exitTimestamp: ts(3, 32), createdBy: 'STF-042' },
    { id: uid(), rego: 'GHJ 009', name: 'Anita Rao', company: 'Delta Supply', dept: 'Warehouse / P. Singh', entryTimestamp: ts(0, 20), exitTimestamp: ts(2, 45), createdBy: 'STF-039' },
    { id: uid(), rego: 'PLT 772', name: 'Chris Nakamura', company: 'Metro Parts', dept: 'Procurement / D. Walsh', entryTimestamp: ts(4, 10), exitTimestamp: null, createdBy: 'STF-042' },
  ];

  const yest = new Date(base);
  yest.setDate(yest.getDate() - 1);
  yest.setHours(9, 15, 0, 0);
  const yestExit = new Date(yest);
  yestExit.setHours(11, 40, 0, 0);
  VISITORS.push({
    id: uid(), rego: 'OLD 001', name: 'Jenny Park', company: 'Vintage Co', dept: 'Finance / M. Ho',
    entryTimestamp: yest.toISOString(), exitTimestamp: yestExit.toISOString(), createdBy: 'STF-039'
  });
}

// export seedData for boot
