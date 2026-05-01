// ══ Pets ══

function renderPetList() {
  const el = document.getElementById('petList');
  if (!pets.length) { el.innerHTML = '<div class="empty"><div class="icon">🐾</div>尚未新增寵物</div>'; return; }
  el.innerHTML = pets.map(p => `
    <div class="list-item">
      <div style="flex:1;min-width:0">
        <div class="list-name">${esc(p.name)}</div>
        <div class="list-meta">住宿 ${p.stayPrice ? fmt(p.stayPrice) + '/天' : '未設定'} · 安親 ${p.daycarePrice ? fmt(p.daycarePrice) + '/8hr' : '未設定'} · 到府 ${p.visitPrice ? fmt(p.visitPrice) + '/次' : '未設定'} · 抽成 ${p.pct ? Math.round(p.pct * 100) + '%' : '—'}</div>
      </div>
      <div style="display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end;margin-left:8px">
        <button class="item-btn-teal" onclick="openCareModal('${p.id}')">📋 照護手冊</button>
        <button class="item-edit-btn" onclick="openPetModal('${p.id}')">編輯</button>
        <button class="btn-danger" onclick="deletePet('${p.id}')">刪除</button>
      </div>
    </div>`).join('');
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
