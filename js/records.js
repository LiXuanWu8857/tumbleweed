// ══ Helpers ══

function timeToMins(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function calcFreshMeals(ciDate, ciTime, coDate, coTime) {
  if (!ciDate || !coDate) return 0;
  const dayDiff    = Math.round((new Date(coDate) - new Date(ciDate)) / 86400000);
  const ciMins     = timeToMins(ciTime);
  const coMins     = timeToMins(coTime);
  const breakfasts = dayDiff + (ciMins <= 9 * 60 ? 1 : 0);
  const dinners    = dayDiff + (coMins >= 20 * 60 ? 1 : 0);
  return breakfasts + dinners;
}

// ══ Stay ══

function onStayPetChange() {
  const pet = pets.find(p => p.id === document.getElementById('s-pet').value);
  if (pet && pet.stayPrice) document.getElementById('s-price').value = pet.stayPrice;
  stayCalc();
}

function stayCalc() {
  const ciDate       = document.getElementById('s-ci-date').value;
  const ciTime       = document.getElementById('s-ci-time').value;
  const coDate       = document.getElementById('s-co-date').value;
  const coTime       = document.getElementById('s-co-time').value;
  const price        = parseFloat(document.getElementById('s-price').value) || 0;
  const special      = document.getElementById('s-special').checked;
  const transport    = document.getElementById('s-transport').checked;
  const transportFee = parseFloat(document.getElementById('s-transport-fee').value) || 0;
  const fresh        = document.getElementById('s-fresh').checked;
  const freshPrice   = parseFloat(document.getElementById('s-fresh-price').value) || 0;
  let days = '', extraLabel = '', total = 0, freshMeals = 0;

  if (ciDate && coDate) {
    let diff = (new Date(coDate) - new Date(ciDate)) / 86400000;
    if (diff < 0) diff = 0;
    let extra = 0;
    if (ciTime && coTime) {
      const ciH = parseInt(ciTime), coH = parseInt(coTime);
      const timeDiff = coH - ciH;
      if (timeDiff > 0) {
        extra = timeDiff < 12 ? 0.5 : 1;
        extraLabel = extra === 0.5 ? '是 (+½ 天)' : '加整天';
      }
    }
    days = diff === 0 ? 1 : (extra > 0 ? diff + extra : diff);
    days = days % 1 === 0 ? days : parseFloat(days.toFixed(1));
    const daysRounded = Math.round(days * 2) / 2;
    if (fresh && ciDate && coDate) {
      freshMeals = calcFreshMeals(ciDate, ciTime, coDate, coTime);
    }
    const freshTotal    = fresh ? freshPrice * freshMeals : 0;
    const transportTotal = transport ? transportFee : 0;
    total = price * daysRounded + (special ? 150 * daysRounded : 0) + transportTotal + freshTotal;
  }

  document.getElementById('s-extra').textContent = extraLabel || '—';
  document.getElementById('s-days').textContent  = days !== '' ? days + ' 天' : '—';
  const freshRow = document.getElementById('s-fresh-meals-row');
  if (fresh && freshMeals > 0) {
    freshRow.style.display = '';
    document.getElementById('s-fresh-meals').textContent = freshMeals + ' 餐';
  } else { freshRow.style.display = 'none'; }

  const rc  = document.getElementById('s-result-card');
  const scb = document.getElementById('s-save-copy-btn');
  if (price > 0 && days !== '') {
    document.getElementById('s-total').textContent = fmt(total);
    const petId = document.getElementById('s-pet').value;
    const pet   = pets.find(p => p.id === petId);
    if (pet && ciDate && coDate) {
      document.getElementById('s-msg-preview').textContent =
        buildStayMsg({ petName: pet.name, ciDate, ciTime, coDate, coTime, days, price, total, special, transport, transportFee, fresh, freshPrice, freshMeals });
      rc.style.display = 'block'; scb.style.display = 'block';
    }
  } else { rc.style.display = 'none'; scb.style.display = 'none'; }
  return { days, total, special, transport, transportFee, fresh, freshPrice, freshMeals };
}

function buildStayRec() {
  const petId = document.getElementById('s-pet').value;
  if (!petId) { toast('⚠️ 請選擇寵物'); return null; }
  if (!getOp() || getOp() === '未知') { toast('⚠️ 請先選擇輸入者'); return null; }
  const ciDate = document.getElementById('s-ci-date').value;
  const coDate = document.getElementById('s-co-date').value;
  if (!ciDate || !coDate) { toast('⚠️ 請填寫日期'); return null; }
  const price = parseFloat(document.getElementById('s-price').value) || 0;
  if (!price) { toast('⚠️ 請填寫單價'); return null; }
  const pet = pets.find(p => p.id === petId);
  const { days, total, special, transport, transportFee, fresh, freshPrice, freshMeals } = stayCalc();
  const pct    = pet?.pct || 0.8;
  const ciTime = document.getElementById('s-ci-time').value;
  const coTime = document.getElementById('s-co-time').value;
  return { id: makeId(), type: 'stay', petId, petName: pet?.name || '', operator: getOp(), date: ciDate, ciDate, ciTime, coDate, coTime, days, price, pct, special, transport, transportFee, fresh, freshPrice, freshMeals, total: Math.round(total), net: Math.round(total * pct), commission: Math.round(total * (1 - pct)), note: document.getElementById('s-note').value.trim(), paid: false, createdAt: new Date().toLocaleString('zh-TW') };
}

function resetStay() {
  document.getElementById('s-pet').value = '';
  const t = todayStr();
  const ci = document.getElementById('s-ci-date'), co = document.getElementById('s-co-date');
  ci.value = t; co.value = t; delete co.dataset.manual;
  document.getElementById('s-ci-time').value = '';
  document.getElementById('s-co-time').value = '';
  ['s-price', 's-note', 's-transport-fee', 's-fresh-price'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('s-special').checked = false;
  document.getElementById('s-transport').checked = false;
  document.getElementById('s-fresh').checked = false;
  document.getElementById('s-fresh-meals-row').style.display = 'none';
  document.getElementById('s-result-card').style.display = 'none';
  document.getElementById('s-save-copy-btn').style.display = 'none';
}

function submitStay()        { const r = buildStayRec(); if (!r) return; records.unshift(r); dbSet('records/' + r.id, r); updateMonthFilter(); resetStay(); toast('✅ 住宿紀錄已儲存'); }
function submitStayAndCopy() { const r = buildStayRec(); if (!r) return; copyMsg('stay'); records.unshift(r); dbSet('records/' + r.id, r); updateMonthFilter(); resetStay(); toast('✅ 已儲存並複製訊息！'); }

// ══ Visit ══

function onVisitPetChange() {
  const pet = pets.find(p => p.id === document.getElementById('v-pet').value);
  if (pet && pet.visitPrice) document.getElementById('v-price').value = pet.visitPrice;
  visitCalc();
}

function onVisitStartChange() {
  const end = document.getElementById('v-end');
  if (!end.dataset.manual) end.value = document.getElementById('v-start').value;
  visitCalc();
}

function visitCalc() {
  const start    = document.getElementById('v-start').value;
  const end      = document.getElementById('v-end').value;
  const sAMPM    = document.getElementById('v-start-ampm').value;
  const eAMPM    = document.getElementById('v-end-ampm').value;
  const tpd      = parseInt(document.getElementById('v-times-day').value) || 1;
  const price    = parseFloat(document.getElementById('v-price').value) || 0;
  const special  = document.getElementById('v-special').checked;
  const distance = document.getElementById('v-distance').checked;
  let times = '', total = 0;

  if (start && end) {
    const dayDiff = Math.floor((new Date(end) - new Date(start)) / 86400000) + 1;
    let t = dayDiff * tpd;
    if (sAMPM === 'PM') t -= tpd / 2;
    if (eAMPM === 'AM') t -= tpd / 2;
    times = Math.max(0, Math.ceil(t));
    total = price * times + (special ? 150 * times : 0) + (distance ? 100 * times : 0);
  }

  document.getElementById('v-times').textContent = times !== '' ? times + ' 次' : '—';

  const rc  = document.getElementById('v-result-card');
  const scb = document.getElementById('v-save-copy-btn');
  if (price > 0 && times !== '') {
    document.getElementById('v-total').textContent = fmt(total);
    const petId = document.getElementById('v-pet').value;
    const pet   = pets.find(p => p.id === petId);
    if (pet && start && end) {
      document.getElementById('v-msg-preview').textContent =
        buildVisitMsg({ petName: pet.name, start, end, sAMPM, eAMPM, tpd, times, price, total, special, distance });
      rc.style.display = 'block'; scb.style.display = 'block';
    }
  } else { rc.style.display = 'none'; scb.style.display = 'none'; }
  return { times, total, special, distance };
}

function buildVisitRec() {
  const petId = document.getElementById('v-pet').value;
  if (!petId) { toast('⚠️ 請選擇寵物'); return null; }
  if (!getOp() || getOp() === '未知') { toast('⚠️ 請先選擇輸入者'); return null; }
  const start = document.getElementById('v-start').value, end = document.getElementById('v-end').value;
  if (!start || !end) { toast('⚠️ 請填寫日期'); return null; }
  const price = parseFloat(document.getElementById('v-price').value) || 0;
  if (!price) { toast('⚠️ 請填寫單價'); return null; }
  const pet    = pets.find(p => p.id === petId);
  const { times, total, special, distance } = visitCalc();
  const pct    = pet?.pct || 0.8;
  const sAMPM  = document.getElementById('v-start-ampm').value;
  const eAMPM  = document.getElementById('v-end-ampm').value;
  const tpd    = parseInt(document.getElementById('v-times-day').value) || 1;
  return { id: makeId(), type: 'visit', petId, petName: pet?.name || '', operator: getOp(), date: start, start, startAMPM: sAMPM, end, endAMPM: eAMPM, timesDay: tpd, times, price, pct, special, distance, total: Math.round(total), net: Math.round(total * pct), commission: Math.round(total * (1 - pct)), note: document.getElementById('v-note').value.trim(), paid: false, createdAt: new Date().toLocaleString('zh-TW') };
}

function resetVisit() {
  document.getElementById('v-pet').value = '';
  const t = todayStr();
  const vs = document.getElementById('v-start'), ve = document.getElementById('v-end');
  vs.value = t; ve.value = t; delete ve.dataset.manual;
  ['v-price', 'v-note'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('v-special').checked = false;
  document.getElementById('v-distance').checked = false;
  document.getElementById('v-times-day').value = '2';
  document.getElementById('v-start-ampm').value = 'AM';
  document.getElementById('v-end-ampm').value = 'PM';
  document.getElementById('v-result-card').style.display = 'none';
  document.getElementById('v-save-copy-btn').style.display = 'none';
}

function submitVisit()        { const r = buildVisitRec(); if (!r) return; records.unshift(r); dbSet('records/' + r.id, r); updateMonthFilter(); resetVisit(); toast('✅ 到府紀錄已儲存'); }
function submitVisitAndCopy() { const r = buildVisitRec(); if (!r) return; copyMsg('visit'); records.unshift(r); dbSet('records/' + r.id, r); updateMonthFilter(); resetVisit(); toast('✅ 已儲存並複製訊息！'); }

// ══ Records ══

function updateMonthFilter() {
  const sel = document.getElementById('monthFilter'), cur = sel.value;
  const months = [...new Set(records.map(r => r.date ? r.date.slice(0, 7) : null).filter(Boolean))].sort().reverse();
  sel.innerHTML = '<option value="">全部月份</option>' + months.map(m => `<option value="${m}" ${m === cur ? 'selected' : ''}>${m.replace('-', '年')}月</option>`).join('');
}

function toggleRecDetail(id) {
  const el = document.getElementById('rd-' + id), btn = document.getElementById('rb-' + id);
  const open = el.classList.toggle('open');
  btn.textContent = open ? '▾ 收起' : '▸ 展開';
}

function togglePaid(id) {
  const r = records.find(x => x.id === id); if (!r) return;
  r.paid = !r.paid;
  dbUpdate('records/' + id, { paid: r.paid });
  renderRecords();
}

function deleteRecord(id) {
  if (!confirm('確定刪除？')) return;
  records = records.filter(r => r.id !== id);
  dbRemove('records/' + id);
  updateMonthFilter(); renderRecords();
}

function openEditRecModal(id) {
  if (!getOp() || getOp() === '未知') { toast('⚠️ 請先在右上角選擇輸入者才能編輯'); return; }
  const r = records.find(x => x.id === id); if (!r) return;
  const isStay = r.type === 'stay';
  document.getElementById('er-id').value = id;
  document.getElementById('er-type').value = r.type;
  document.getElementById('er-price').value = r.price || '';
  document.getElementById('er-pct').value = r.pct != null ? r.pct : 0.8;
  document.getElementById('er-reason').value = '';
  document.getElementById('er-stay-dates').style.display  = isStay ? '' : 'none';
  document.getElementById('er-visit-dates').style.display = isStay ? 'none' : '';
  if (isStay) {
    document.getElementById('er-ci-date').value = r.ciDate || '';
    document.getElementById('er-ci-time').value = r.ciTime || '';
    document.getElementById('er-co-date').value = r.coDate || '';
    document.getElementById('er-co-time').value = r.coTime || '';
  } else {
    document.getElementById('er-v-start').value = r.start || '';
    document.getElementById('er-v-end').value   = r.end   || '';
  }
  const typeLabel = isStay ? '🏠 住宿' : '🚗 到府';
  document.getElementById('er-info').textContent = `${r.petName} · ${typeLabel} · 建立者：${r.operator || '未知'}`;
  openModal('editRecModal');
}

function saveEditRec() {
  const id = document.getElementById('er-id').value;
  const reason = document.getElementById('er-reason').value.trim();
  if (!reason) { toast('⚠️ 請填寫編輯原因才能儲存'); return; }
  const r = records.find(x => x.id === id); if (!r) return;

  const newPrice = parseFloat(document.getElementById('er-price').value);
  const newPct   = parseFloat(document.getElementById('er-pct').value);
  const changes  = [];
  const oldTotal = r.total;

  if (r.type === 'stay') {
    const newCiDate = document.getElementById('er-ci-date').value;
    const newCiTime = document.getElementById('er-ci-time').value;
    const newCoDate = document.getElementById('er-co-date').value;
    const newCoTime = document.getElementById('er-co-time').value;
    if (newCiDate && newCiDate !== r.ciDate) { changes.push({ f: '入住日期', o: r.ciDate, n: newCiDate }); r.ciDate = newCiDate; r.date = newCiDate; }
    if (newCiTime !== r.ciTime)              { changes.push({ f: '入住時間', o: r.ciTime, n: newCiTime }); r.ciTime = newCiTime; }
    if (newCoDate && newCoDate !== r.coDate) { changes.push({ f: '離開日期', o: r.coDate, n: newCoDate }); r.coDate = newCoDate; }
    if (newCoTime !== r.coTime)              { changes.push({ f: '離開時間', o: r.coTime, n: newCoTime }); r.coTime = newCoTime; }
    if (r.ciDate && r.coDate) {
      let diff = (new Date(r.coDate) - new Date(r.ciDate)) / 86400000;
      if (diff < 0) diff = 0;
      let extra = 0;
      if (r.ciTime && r.coTime) {
        const ciH = parseInt(r.ciTime), coH = parseInt(r.coTime);
        extra = Math.abs(coH - ciH) < 12 ? 0.5 : 1;
      }
      const newDays = diff === 0 ? 1 : (extra > 0 ? diff + extra : diff);
      if (newDays !== r.days) { changes.push({ f: '天數', o: r.days, n: newDays }); r.days = newDays; }
    }
  } else {
    const newStart = document.getElementById('er-v-start').value;
    const newEnd   = document.getElementById('er-v-end').value;
    if (newStart && newStart !== r.start) { changes.push({ f: '開始日期', o: r.start, n: newStart }); r.start = newStart; r.date = newStart; }
    if (newEnd   && newEnd   !== r.end)   { changes.push({ f: '結束日期', o: r.end,   n: newEnd   }); r.end   = newEnd;   }
    if (r.start && r.end) {
      const dayDiff = Math.floor((new Date(r.end) - new Date(r.start)) / 86400000) + 1;
      const tpd = r.timesDay || 1;
      let t = dayDiff * tpd;
      if (r.startAMPM === 'PM') t -= tpd / 2;
      if (r.endAMPM   === 'AM') t -= tpd / 2;
      const newTimes = Math.max(0, Math.ceil(t));
      if (newTimes !== r.times) { changes.push({ f: '次數', o: r.times, n: newTimes }); r.times = newTimes; }
    }
  }

  if (!isNaN(newPrice) && newPrice > 0 && newPrice !== r.price) { changes.push({ f: '單價', o: r.price, n: newPrice }); r.price = newPrice; }
  if (!isNaN(newPct)   && newPct >= 0  && newPct <= 1 && newPct !== r.pct) { changes.push({ f: '抽成', o: r.pct, n: newPct }); r.pct = newPct; }

  const daysRounded = Math.round((r.days || 1) * 2) / 2;
  const times = r.times || 1;
  if (r.type === 'stay') {
    r.total = Math.round(r.price * daysRounded + (r.special ? 150 * daysRounded : 0) + (r.transport ? r.transportFee || 0 : 0) + (r.fresh ? (r.freshPrice || 0) * (r.freshMeals || 0) : 0));
  } else {
    r.total = Math.round(r.price * times + (r.special ? 150 * times : 0) + (r.distance ? 100 * times : 0));
  }
  if (r.total !== oldTotal) changes.push({ f: '總金額', o: oldTotal, n: r.total });
  r.net        = Math.round(r.total * r.pct);
  r.commission = Math.round(r.total * (1 - r.pct));
  r.editedBy   = getOp();
  r.editedAt   = new Date().toLocaleString('zh-TW');
  r.editReason = reason;
  r.editHistory = [...(r.editHistory || []), { editedBy: getOp(), editedAt: r.editedAt, reason, changes }];

  dbSet('records/' + id, r);
  closeModal('editRecModal');
  renderRecords();
  toast('✅ 紀錄已更新');
}

function buildEditLogHtml(r) {
  const history = r.editHistory || [];
  if (!history.length) {
    if (!r.editedBy) return '';
    return `<div class="rec-edit-log"><div class="rec-edit-label">最後編輯</div><div class="rec-edit-info">${esc(r.editedBy)} · ${esc(r.editedAt)}</div><div class="rec-edit-reason">${esc(r.editReason)}</div></div>`;
  }
  const entries = history.map(h => {
    const changesHtml = h.changes && h.changes.length
      ? h.changes.map(c => `<div class="rec-edit-change">${esc(c.f)}: ${esc(String(c.o))} → ${esc(String(c.n))}</div>`).join('')
      : '';
    return `<div class="rec-edit-entry"><div class="rec-edit-info">${esc(h.editedBy)} · ${esc(h.editedAt)}</div>${changesHtml}<div class="rec-edit-reason">${esc(h.reason)}</div></div>`;
  }).join('');
  return `<div class="rec-edit-log"><div class="rec-edit-label">編輯歷史</div>${entries}</div>`;
}

function copyRecMsg(id) {
  const r = records.find(x => x.id === id); if (!r) return;
  const msg = r.type === 'stay'
    ? buildStayMsg({ petName: r.petName, ciDate: r.ciDate, ciTime: r.ciTime, coDate: r.coDate, coTime: r.coTime, days: r.days, price: r.price, total: r.total, special: r.special, transport: r.transport, transportFee: r.transportFee, fresh: r.fresh, freshPrice: r.freshPrice, freshMeals: r.freshMeals })
    : buildVisitMsg({ petName: r.petName, start: r.start, end: r.end, sAMPM: r.startAMPM, eAMPM: r.endAMPM, tpd: r.timesDay, times: r.times, price: r.price, total: r.total, special: r.special, distance: r.distance });
  navigator.clipboard.writeText(msg)
    .then(() => toast('✅ 訊息已複製！'))
    .catch(() => { const ta = document.createElement('textarea'); ta.value = msg; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); toast('✅ 訊息已複製！'); });
}

function renderRecords() {
  const fm = document.getElementById('monthFilter').value;
  const filtered = fm ? records.filter(r => r.date && r.date.startsWith(fm)) : records;

  const opMap = {};
  filtered.forEach(r => {
    const op = r.operator || '未知';
    if (!opMap[op]) opMap[op] = { total: 0, net: 0, commission: 0, count: 0 };
    opMap[op].total += r.total || 0; opMap[op].net += r.net || 0; opMap[op].commission += r.commission || 0; opMap[op].count++;
  });
  const opEl = document.getElementById('opSummary');
  if (Object.keys(opMap).length) {
    opEl.innerHTML = `<div class="op-summary"><div class="op-hdr">各保母統計</div>${Object.entries(opMap).map(([op, s]) => `
      <div class="op-row">
        <span class="op-name">${esc(op)} <small style="font-weight:400;color:var(--muted)">(${s.count}筆)</small></span>
        <div class="op-nums">
          <span>總 <span class="hi">${fmt(s.total)}</span></span>
          <span>實拿 <span class="hi">${fmt(s.net)}</span></span>
          <span>抽成 ${fmt(s.commission)}</span>
        </div>
      </div>`).join('')}</div>`;
  } else opEl.innerHTML = '';

  const listEl = document.getElementById('recordsList');
  if (!filtered.length) { listEl.innerHTML = '<div class="empty"><div class="icon">📋</div>尚無紀錄</div>'; return; }

  const grouped = {};
  filtered.forEach(r => { const m = r.date ? r.date.slice(0, 7) : '未知'; if (!grouped[m]) grouped[m] = []; grouped[m].push(r); });

  listEl.innerHTML = Object.keys(grouped).sort().reverse().map(month => {
    const recs   = grouped[month];
    const mTotal = recs.reduce((a, r) => a + (r.total || 0), 0);
    const mNet   = recs.reduce((a, r) => a + (r.net || 0), 0);

    const recHtml = recs.map(r => {
      const typeLabel  = r.type === 'stay' ? '🏠 住宿' : '🚗 到府';
      const dateRange  = r.type === 'stay' ? `${r.ciDate}${r.ciTime ? ' ' + r.ciTime : ''} → ${r.coDate}${r.coTime ? ' ' + r.coTime : ''}` : `${r.start} → ${r.end}`;
      const dateMeta   = r.type === 'stay' ? `${fmtD(r.ciDate)} → ${fmtD(r.coDate)}` : `${fmtD(r.start)} → ${fmtD(r.end)}`;
      const qty        = r.type === 'stay' ? r.days + '天' : r.times + '次';
      const pctLabel   = Math.round((r.pct || 0) * 100) + '%';
      return `<div class="rec-card">
        <div class="rec-hdr">
          <div>
            <div class="rec-title">${esc(r.petName)} · ${typeLabel} · <span style="font-size:0.75rem;font-weight:500;color:${r.paid ? 'var(--green)' : 'var(--danger)'}">${r.paid ? '✓ 已付款' : '✗ 未付款'}</span></div>
            <div class="rec-meta">${dateMeta} · ${esc(r.operator || '')}</div>
          </div>
          <div class="rec-amount">${fmt(r.total)}<small>實拿 ${fmt(r.net)} · 抽成 ${pctLabel}</small></div>
        </div>
        <div class="rec-detail" id="rd-${r.id}">
          <div class="rec-dr"><span class="rec-dl">日期</span><span class="rec-dv">${dateRange}</span></div>
          <div class="rec-dr"><span class="rec-dl">數量</span><span class="rec-dv">${qty}</span></div>
          <div class="rec-dr"><span class="rec-dl">單價</span><span class="rec-dv">${fmt(r.price)}</span></div>
          <div class="rec-dr"><span class="rec-dl">抽成比例</span><span class="rec-dv">${pctLabel}</span></div>
          <div class="rec-dr"><span class="rec-dl">抽成金額</span><span class="rec-dv">${fmt(r.commission)}</span></div>
          <div class="rec-dr"><span class="rec-dl">付款狀態</span><span class="rec-dv ${r.paid ? 'paid' : 'unpaid'}">${r.paid ? '✓ 已付款' : '✗ 未付款'}</span></div>
          ${r.note ? `<div class="rec-dr"><span class="rec-dl">備註</span><span class="rec-dv">${esc(r.note)}</span></div>` : ''}
          ${buildEditLogHtml(r)}
          <div style="display:flex;gap:7px;padding-top:9px;flex-wrap:wrap">
            <button class="btn-ghost" style="flex:1;min-width:70px" onclick="togglePaid('${r.id}')">${r.paid ? '↩ 標記未付' : '✓ 標記已付'}</button>
            <button class="btn-ghost" style="flex:1;min-width:70px" onclick="copyRecMsg('${r.id}')">📋 複製 LINE</button>
            <button class="btn-ghost" style="flex:1;min-width:70px" onclick="openEditRecModal('${r.id}')">✏️ 編輯</button>
            <button class="btn-danger" onclick="deleteRecord('${r.id}')">刪除</button>
          </div>
        </div>
        <button class="rec-expand-btn" id="rb-${r.id}" onclick="toggleRecDetail('${r.id}')">▸ 展開</button>
      </div>`;
    }).join('');
    return `<div class="month-hdr"><span class="month-label">${month.replace('-', '年')}月</span><span class="month-stats">總額 ${fmt(mTotal)} · 實拿 ${fmt(mNet)}</span></div>${recHtml}`;
  }).join('');
}
