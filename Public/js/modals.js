/* Modals: add/edit/exit handlers */
function openAddModal() {
    editingId = null;
    const title = document.getElementById('modal-visitor-title');
    if (title) title.textContent = 'New Visitor Entry';
    const submit = document.getElementById('modal-visitor-submit');
    if (submit) submit.textContent = 'Record Entry';
    const now = new Date();
    const sub = document.getElementById('modal-visitor-sub');
    if (sub) sub.textContent = `${currentUser.name} (${currentUser.id}) · ${now.toLocaleDateString('en-AU', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}`;
    ['inp-rego', 'inp-vname', 'inp-company', 'inp-dept'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const wrap = document.getElementById('rego-preview-wrap'); if (wrap) wrap.innerHTML = '';
    const af = document.getElementById('auto-fields-wrap'); if (af) af.style.display = '';
    const at = document.getElementById('auto-time-wrap'); if (at) at.style.display = '';
    const modal = document.getElementById('modal-visitor'); if (modal) modal.classList.remove('hidden');
}

function openEditModal(id) {
    const v = VISITORS.find(x => x.id === id);
    if (!v) return;
    editingId = id;
    const title = document.getElementById('modal-visitor-title'); if (title) title.textContent = 'Edit Visitor';
    const submit = document.getElementById('modal-visitor-submit'); if (submit) submit.textContent = 'Save Changes';
    const sub = document.getElementById('modal-visitor-sub'); if (sub) sub.textContent = `Editing entry by ${v.createdBy}`;
    document.getElementById('inp-rego').value = v.rego;
    document.getElementById('inp-vname').value = v.name;
    document.getElementById('inp-company').value = v.company;
    document.getElementById('inp-dept').value = v.dept;
    updateRegoPreview();
    const af = document.getElementById('auto-fields-wrap'); if (af) af.style.display = 'none';
    const at = document.getElementById('auto-time-wrap'); if (at) at.style.display = 'none';
    const modal = document.getElementById('modal-visitor'); if (modal) modal.classList.remove('hidden');
}

function updateRegoPreview() {
    const inp = document.getElementById('inp-rego'); if (!inp) return;
    const val = inp.value.toUpperCase();
    const wrap = document.getElementById('rego-preview-wrap');
    if (!wrap) return;
    if (val.length > 0) {
        wrap.innerHTML = `<div style="margin-top:8px;">${plateHTML(val)}</div>`;
    } else {
        wrap.innerHTML = '';
    }
}

function submitVisitor() {
    const regoEl = document.getElementById('inp-rego');
    const nameEl = document.getElementById('inp-vname');
    const companyEl = document.getElementById('inp-company');
    const deptEl = document.getElementById('inp-dept');
    const rego = regoEl?.value.trim().toUpperCase();
    const name = nameEl?.value.trim();
    const company = companyEl?.value.trim();
    const dept = deptEl?.value.trim();
    if (!rego || !name || !company || !dept) { showToast('Please fill in all fields.', 'error'); return; }
    if (editingId) {
        const v = VISITORS.find(x => x.id === editingId);
        if (v) { v.rego = rego; v.name = name; v.company = company; v.dept = dept; }
        showToast('Visitor updated.', 'success');
    } else {
        VISITORS.push({ id: uid(), rego, name, company, dept, entryTimestamp: new Date().toISOString(), exitTimestamp: null, createdBy: currentUser.id });
        showToast('Visitor recorded.', 'success');
    }
    closeModal('modal-visitor');
    renderAll_views();
}

function openExitConfirm(id) {
    const v = VISITORS.find(x => x.id === id);
    if (!v) return;
    exitTargetId = id;
    const msg = document.getElementById('confirm-msg'); if (msg) msg.textContent = `Mark "${v.name}" (${v.rego}) as Off Site?`;
    const modal = document.getElementById('modal-confirm'); if (modal) modal.classList.remove('hidden');
}

function confirmExit() {
    const v = VISITORS.find(x => x.id === exitTargetId);
    if (v) { v.exitTimestamp = new Date().toISOString(); }
    closeModal('modal-confirm');
    showToast('Exit recorded.', 'success');
    renderAll_views();
}
