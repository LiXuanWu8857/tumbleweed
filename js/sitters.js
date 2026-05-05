// ══ Sitters ══

function renderSitterList() {
  const sel = document.getElementById('sitterSel');
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = '<option value="">— 請選擇 —</option>' +
    sitters.map(s => {
      const dot = s.color ? `●` : '';
      return `<option value="${s.id}" ${s.id === cur ? 'selected' : ''}>${esc(s.name)}</option>`;
    }).join('');
  onSitterSelChange();
}

function onSitterSelChange() {
  const id  = document.getElementById('sitterSel').value;
  const det = document.getElementById('sitterDetail');
  if (!id) { det.style.display = 'none'; det.innerHTML = ''; return; }
  const s = sitters.find(x => x.id === id);
  if (!s) { det.style.display = 'none'; return; }
  const dot = s.color
    ? `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${s.color};border:1px solid rgba(0,0,0,0.1);margin-right:5px;vertical-align:middle"></span>`
    : '';
  det.innerHTML = `<div class="card"><div class="list-item">
    <div>
      <div class="list-name">${dot}${esc(s.name)}</div>
      ${s.phone    ? `<div class="list-meta">📞 ${esc(s.phone)}</div>` : ''}
      ${s.bankName ? `<div class="list-meta">🏦 ${esc(s.bankName)}${s.bankCode ? ' ' + esc(s.bankCode) : ''} · ${esc(s.bankAccount || '')}</div>` : ''}
      ${s.note     ? `<div class="list-meta">${esc(s.note)}</div>` : ''}
    </div>
    <div style="display:flex;gap:6px;flex-shrink:0">
      <button class="item-edit-btn" onclick="openSitterModal('${s.id}')">編輯</button>
      <button class="btn-danger" onclick="deleteSitter('${s.id}')">刪除</button>
    </div>
  </div></div>`;
  det.style.display = '';

  // Auto-fill operator selector
  const opSel = document.getElementById('operatorSel');
  if (opSel) opSel.value = s.name;

  // Sync calendar sitter filter
  if (typeof calSitterFilter !== 'undefined') {
    calSitterFilter = s.name;
    if (typeof renderCalendar === 'function') renderCalendar();
  }
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
    document.getElementById('sm-name').value        = s.name        || '';
    document.getElementById('sm-bank-name').value   = s.bankName    || '';
    document.getElementById('sm-bank-code').value   = s.bankCode    || '';
    document.getElementById('sm-bank-account').value= s.bankAccount || '';
    document.getElementById('sm-phone').value       = s.phone       || '';
    document.getElementById('sm-note').value        = s.note        || '';
    document.getElementById('sm-color').value       = s.color       || '#e8829a';
    document.getElementById('sm-del').innerHTML = `<button class="btn-danger" onclick="deleteSitter('${editId}');closeModal('sitterModal')">🗑 刪除保母</button>`;
  } else {
    document.getElementById('sitterModalTitle').textContent = '新增保母';
    ['sm-name', 'sm-bank-name', 'sm-bank-code', 'sm-bank-account', 'sm-phone', 'sm-note'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('sm-color').value = '#e8829a';
    document.getElementById('sm-del').innerHTML = '';
  }
  openModal('sitterModal');
}

function saveSitter() {
  const name        = document.getElementById('sm-name').value.trim();
  const bankName    = document.getElementById('sm-bank-name').value.trim();
  const bankCode    = document.getElementById('sm-bank-code').value.trim();
  const bankAccount = document.getElementById('sm-bank-account').value.trim();
  const phone       = document.getElementById('sm-phone').value.trim();
  if (!name)        { toast('⚠️ 請輸入保母名稱'); return; }
  if (!bankName)    { toast('⚠️ 請輸入銀行名稱'); return; }
  if (!bankCode)    { toast('⚠️ 請輸入銀行代碼'); return; }
  if (!bankAccount) { toast('⚠️ 請輸入帳戶號碼'); return; }
  if (!phone)       { toast('⚠️ 請輸入電話'); return; }
  const editId = document.getElementById('sm-id').value;
  const data   = { name, bankName, bankCode, bankAccount, phone, note: document.getElementById('sm-note').value.trim(), color: document.getElementById('sm-color').value };
  let sitter;
  if (editId) {
    const i = sitters.findIndex(x => x.id === editId);
    if (i > -1) { sitters[i] = { ...sitters[i], ...data }; sitter = sitters[i]; }
  } else {
    sitter = { id: makeId(), ...data };
    sitters.push(sitter);
  }
  if (sitter) dbSet('sitters/' + sitter.id, sitter);
  renderSitterList(); populateOpSelect(); closeModal('sitterModal'); toast('✅ 保母資料已儲存');
}

function deleteSitter(id) {
  if (!confirm('確定刪除？')) return;
  sitters = sitters.filter(s => s.id !== id);
  dbRemove('sitters/' + id);
  const sel = document.getElementById('sitterSel');
  if (sel && sel.value === id) sel.value = '';
  renderSitterList(); populateOpSelect();
}
