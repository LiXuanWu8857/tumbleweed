// ══ Sitters ══

function renderSitterList() {
  const el = document.getElementById('sitterList');
  if (!sitters.length) { el.innerHTML = '<div class="empty"><div class="icon">👤</div>尚未新增保母</div>'; return; }
  el.innerHTML = sitters.map(s => `
    <div class="list-item">
      <div>
        <div class="list-name">${esc(s.name)}</div>
        ${s.note ? `<div class="list-meta">${esc(s.note)}</div>` : ''}
      </div>
      <div style="display:flex;gap:6px">
        <button class="item-edit-btn" onclick="openSitterModal('${s.id}')">編輯</button>
        <button class="btn-danger" onclick="deleteSitter('${s.id}')">刪除</button>
      </div>
    </div>`).join('');
}

function populateOpSelect() {
  const sel = document.getElementById('operatorSel'), cur = sel.value;
  sel.innerHTML = '<option value="">— 選擇 —</option>' +
    sitters.map(s => `<option value="${esc(s.name)}" ${s.name === cur ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
}

function openSitterModal(editId) {
  document.getElementById('sm-id').value = editId || '';
  if (editId) {
    const s = sitters.find(x => x.id === editId); if (!s) return;
    document.getElementById('sitterModalTitle').textContent = '編輯保母';
    document.getElementById('sm-name').value = s.name || '';
    document.getElementById('sm-bank-name').value = s.bankName || '';
    document.getElementById('sm-bank-code').value = s.bankCode || '';
    document.getElementById('sm-bank-account').value = s.bankAccount || '';
    document.getElementById('sm-note').value = s.note || '';
    document.getElementById('sm-del').innerHTML = `<button class="btn-danger" onclick="deleteSitter('${editId}');closeModal('sitterModal')">🗑 刪除保母</button>`;
  } else {
    document.getElementById('sitterModalTitle').textContent = '新增保母';
    ['sm-name', 'sm-bank-name', 'sm-bank-code', 'sm-bank-account', 'sm-note'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('sm-del').innerHTML = '';
  }
  openModal('sitterModal');
}

function saveSitter() {
  const name = document.getElementById('sm-name').value.trim();
  if (!name) { toast('⚠️ 請輸入保母名稱'); return; }
  const editId = document.getElementById('sm-id').value;
  const data = {
    name,
    bankName:    document.getElementById('sm-bank-name').value.trim(),
    bankCode:    document.getElementById('sm-bank-code').value.trim(),
    bankAccount: document.getElementById('sm-bank-account').value.trim(),
    note:        document.getElementById('sm-note').value.trim()
  };
  if (editId) { const i = sitters.findIndex(x => x.id === editId); if (i > -1) sitters[i] = { ...sitters[i], ...data }; }
  else sitters.push({ id: makeId(), ...data });
  saveData(); renderSitterList(); populateOpSelect(); closeModal('sitterModal'); toast('✅ 保母資料已儲存');
}

function deleteSitter(id) {
  if (!confirm('確定刪除？')) return;
  sitters = sitters.filter(s => s.id !== id);
  saveData(); renderSitterList(); populateOpSelect();
}
