// ══ Pets ══

function renderPetList() {
  const el = document.getElementById('petList');
  if (!pets.length) { el.innerHTML = '<div class="empty"><div class="icon">🐾</div>尚未新增寵物</div>'; return; }
  const svcLabel = { stay: '🏠 住宿', visit: '🚗 到府', both: '🏠🚗 兩種都有' };
  el.innerHTML = pets.map(p => {
    const prices = [
      p.stayPrice    ? `住宿 ${fmt(p.stayPrice)}/天`    : null,
      p.daycarePrice ? `安親 ${fmt(p.daycarePrice)}/8hr` : null,
      p.visitPrice   ? `到府 ${fmt(p.visitPrice)}/次`    : null,
    ].filter(Boolean).join(' · ') || '尚未設定價格';
    const svc = svcLabel[p.serviceType] || '';
    return `<div class="rec-card">
      <div class="rec-hdr">
        <div>
          <div class="rec-title">🐾 ${esc(p.name)}${svc ? ` <span style="font-size:0.7rem;font-weight:400;color:var(--muted)">${svc}</span>` : ''}</div>
          <div class="rec-meta">${prices}</div>
        </div>
        <div style="text-align:right;font-size:0.72rem;color:var(--muted)">抽成 ${Math.round((p.pct || 0.8) * 100)}%</div>
      </div>
      <div class="rec-detail" id="pd-${p.id}">
        ${p.note ? `<div class="rec-dr"><span class="rec-dl">備註</span><span class="rec-dv">${esc(p.note)}</span></div>` : ''}
        ${buildPetEditLogHtml(p)}
        <div style="display:flex;gap:7px;padding-top:9px;flex-wrap:wrap">
          <button class="btn-ghost" style="flex:1;min-width:80px" onclick="openCareModal('${p.id}')">📋 照護手冊</button>
          <button class="btn-ghost" style="flex:1;min-width:60px" onclick="openEditPetModal('${p.id}')">✏️ 編輯</button>
          <button class="btn-danger" onclick="deletePet('${p.id}')">刪除</button>
        </div>
      </div>
      <button class="rec-expand-btn" id="pb-${p.id}" onclick="togglePetDetail('${p.id}')">▸ 展開</button>
    </div>`;
  }).join('');
}

function togglePetDetail(id) {
  const el = document.getElementById('pd-' + id), btn = document.getElementById('pb-' + id);
  const open = el.classList.toggle('open');
  btn.textContent = open ? '▾ 收起' : '▸ 展開';
}

function populatePetSelects() {
  ['s-pet', 'v-pet', 'care-pet-sel'].forEach(id => {
    const sel = document.getElementById(id); if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">— 請選擇寵物 —</option>' +
      pets.map(p => `<option value="${p.id}" ${p.id === cur ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
  });
}

function openPetModal(editId) {
  document.getElementById('pm-id').value = editId || '';
  if (editId) {
    const p = pets.find(x => x.id === editId); if (!p) return;
    document.getElementById('petModalTitle').textContent = '編輯寵物';
    document.getElementById('pm-name').value = p.name || '';
    document.getElementById('pm-stay-price').value = p.stayPrice || '';
    document.getElementById('pm-daycare-price').value = p.daycarePrice || '';
    document.getElementById('pm-visit-price').value = p.visitPrice || '';
    document.getElementById('pm-pct').value = p.pct || '';
    document.getElementById('pm-service-type').value = p.serviceType || '';
    document.getElementById('pm-note').value = p.note || '';
    document.getElementById('pm-del').innerHTML = `<button class="btn-danger" onclick="deletePet('${editId}');closeModal('petModal')">🗑 刪除寵物</button>`;
  } else {
    document.getElementById('petModalTitle').textContent = '新增寵物';
    document.getElementById('pm-id').value = '';
    ['pm-name', 'pm-stay-price', 'pm-daycare-price', 'pm-visit-price', 'pm-pct', 'pm-note'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('pm-service-type').value = '';
    document.getElementById('pm-del').innerHTML = '';
  }
  openModal('petModal');
}

function savePet(goToCare) {
  const name = document.getElementById('pm-name').value.trim();
  if (!name) { toast('⚠️ 請輸入寵物名稱'); return; }
  const editId = document.getElementById('pm-id').value;
  const pctRaw = document.getElementById('pm-pct').value;
  const data = {
    name,
    stayPrice:    parseFloat(document.getElementById('pm-stay-price').value) || 0,
    daycarePrice: parseFloat(document.getElementById('pm-daycare-price').value) || 0,
    visitPrice:   parseFloat(document.getElementById('pm-visit-price').value) || 0,
    pct:          pctRaw !== '' ? parseFloat(pctRaw) : 0.8,
    serviceType:  document.getElementById('pm-service-type').value,
    note:         document.getElementById('pm-note').value.trim()
  };
  let pet;
  if (editId) {
    const i = pets.findIndex(x => x.id === editId);
    if (i > -1) { pets[i] = { ...pets[i], ...data }; pet = pets[i]; }
  } else {
    const existingIdx = pets.findIndex(p => p.name === name);
    if (existingIdx > -1) {
      pets[existingIdx] = { ...pets[existingIdx], ...data };
      pet = pets[existingIdx];
    } else {
      pet = { id: makeId(), ...data, careSteps: [] };
      pets.push(pet);
    }
  }
  const petId = pet ? pet.id : null;
  if (pet) dbSet('pets/' + pet.id, pet);
  renderPetList(); populatePetSelects(); closeModal('petModal');
  if (goToCare && petId) { setTimeout(() => openCareModal(petId), 200); }
  else toast('✅ 寵物資料已儲存');
}

function deletePet(id) {
  if (!confirm('確定刪除？')) return;
  pets = pets.filter(p => p.id !== id);
  dbRemove('pets/' + id);
  renderPetList(); populatePetSelects();
}

function openEditPetModal(id) {
  const p = pets.find(x => x.id === id); if (!p) return;
  document.getElementById('ep-id').value = id;
  document.getElementById('ep-name').value = p.name || '';
  document.getElementById('ep-stay-price').value = p.stayPrice || '';
  document.getElementById('ep-daycare-price').value = p.daycarePrice || '';
  document.getElementById('ep-visit-price').value = p.visitPrice || '';
  document.getElementById('ep-pct').value = p.pct != null ? p.pct : '';
  document.getElementById('ep-service-type').value = p.serviceType || '';
  document.getElementById('ep-note').value = p.note || '';
  document.getElementById('ep-reason').value = '';
  document.getElementById('ep-info').textContent = '🐾 ' + p.name;
  openModal('editPetModal');
}

function saveEditPet() {
  const id = document.getElementById('ep-id').value;
  const reason = document.getElementById('ep-reason').value.trim();
  if (!reason) { toast('⚠️ 請填寫編輯原因才能儲存'); return; }
  const p = pets.find(x => x.id === id); if (!p) return;

  const newName        = document.getElementById('ep-name').value.trim();
  const newStayPrice   = parseFloat(document.getElementById('ep-stay-price').value) || 0;
  const newDaycarePrice = parseFloat(document.getElementById('ep-daycare-price').value) || 0;
  const newVisitPrice  = parseFloat(document.getElementById('ep-visit-price').value) || 0;
  const pctRaw         = document.getElementById('ep-pct').value;
  const newPct         = pctRaw !== '' ? parseFloat(pctRaw) : p.pct;
  const newServiceType = document.getElementById('ep-service-type').value;
  const newNote        = document.getElementById('ep-note').value.trim();

  const changes = [];
  if (newName && newName !== p.name)                   changes.push({ f: '名稱',     o: p.name,         n: newName });
  if (newStayPrice !== (p.stayPrice || 0))             changes.push({ f: '住宿單價', o: p.stayPrice || 0, n: newStayPrice });
  if (newDaycarePrice !== (p.daycarePrice || 0))       changes.push({ f: '安親單價', o: p.daycarePrice || 0, n: newDaycarePrice });
  if (newVisitPrice !== (p.visitPrice || 0))           changes.push({ f: '到府單價', o: p.visitPrice || 0, n: newVisitPrice });
  if (!isNaN(newPct) && newPct !== p.pct)              changes.push({ f: '抽成',     o: p.pct,          n: newPct });
  if (newServiceType !== (p.serviceType || ''))        changes.push({ f: '服務類型', o: p.serviceType || '', n: newServiceType });
  if (newNote !== (p.note || ''))                      changes.push({ f: '備註',     o: p.note || '',   n: newNote });

  if (newName) p.name = newName;
  p.stayPrice    = newStayPrice;
  p.daycarePrice = newDaycarePrice;
  p.visitPrice   = newVisitPrice;
  if (!isNaN(newPct)) p.pct = newPct;
  p.serviceType  = newServiceType;
  p.note         = newNote;
  p.editedBy     = getOp();
  p.editedAt     = new Date().toLocaleString('zh-TW');
  p.editReason   = reason;
  p.editHistory  = [...(p.editHistory || []), { editedBy: getOp(), editedAt: p.editedAt, reason, changes }];

  dbSet('pets/' + id, p);
  closeModal('editPetModal');
  renderPetList(); populatePetSelects();
  toast('✅ 寵物資料已更新');
}

function buildPetEditLogHtml(p) {
  const history = p.editHistory || [];
  if (!history.length) {
    if (!p.editedBy) return '';
    return `<div class="rec-edit-log"><div class="rec-edit-label">最後編輯</div><div class="rec-edit-info">${esc(p.editedBy)} · ${esc(p.editedAt)}</div><div class="rec-edit-reason">${esc(p.editReason)}</div></div>`;
  }
  const entries = history.map(h => {
    const changesHtml = h.changes && h.changes.length
      ? h.changes.map(c => `<div class="rec-edit-change">${esc(c.f)}: ${esc(String(c.o))} → ${esc(String(c.n))}</div>`).join('')
      : '';
    return `<div class="rec-edit-entry"><div class="rec-edit-info">${esc(h.editedBy)} · ${esc(h.editedAt)}</div>${changesHtml}<div class="rec-edit-reason">${esc(h.reason)}</div></div>`;
  }).join('');
  return `<div class="rec-edit-log"><div class="rec-edit-label">編輯歷史</div>${entries}</div>`;
}
