// ══ Calendar ══
const _tzDate = new Date().toLocaleDateString('sv', { timeZone: 'Asia/Shanghai' });
let calYear  = parseInt(_tzDate.slice(0, 4));
let calMonth = parseInt(_tzDate.slice(5, 7)) - 1;
let calSelectedDate = null;
let calSitterFilter = null;

// ══ Special care timing ══
let _vSpecialTime = 'both';

function getSitterColor(opName) {
  if (!opName) return '#e8829a';
  const s = sitters.find(x => x.name === opName);
  return (s && s.color) ? s.color : '#e8829a';
}

function isColorDark(hex) {
  if (!hex || hex.length < 7) return false;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.55;
}

function renderCalendar() {
  const titleEl  = document.getElementById('calTitle');
  const gridEl   = document.getElementById('calGrid');
  const hintEl   = document.getElementById('calHint');
  const filterEl = document.getElementById('calSitterFilter');
  if (!titleEl || !gridEl) return;

  const today       = todayStr();
  const firstDay    = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const monthStr    = calYear + '-' + String(calMonth + 1).padStart(2, '0');
  const monthStart  = monthStr + '-01';
  const monthEnd    = monthStr + '-' + String(daysInMonth).padStart(2, '0');

  titleEl.textContent = calYear + '年' + (calMonth + 1) + '月';

  // Sitter filter pills — show when any operators have records
  if (filterEl) {
    const opNames = [...new Set(records.map(r => r.operator).filter(Boolean))];
    if (opNames.length >= 1) {
      filterEl.innerHTML =
        `<button class="cal-sitter-pill all-pill${!calSitterFilter ? ' active' : ''}" onclick="calSetSitterFilter(null)">全部</button>` +
        opNames.map(name => {
          const bg  = getSitterColor(name);
          const txt = isColorDark(bg) ? '#fff' : '#2a1a1d';
          return `<button class="cal-sitter-pill${calSitterFilter === name ? ' active' : ''}" style="background:${bg};color:${txt}" data-name="${esc(name)}" onclick="calSetSitterFilterFromBtn(this)"><span class="cal-sitter-dot" style="background:${isColorDark(bg) ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.2)'}"></span>${esc(name)}</button>`;
        }).join('');
      filterEl.style.display = '';
    } else {
      filterEl.style.display = 'none';
    }
  }

  // Build event list for this month
  const calEvts = records
    .filter(r => {
      if (calSitterFilter && r.operator !== calSitterFilter) return false;
      const s = r.type === 'stay' ? r.ciDate : r.start;
      const e = r.type === 'stay' ? r.coDate : r.end;
      return s && e && s <= monthEnd && e >= monthStart;
    })
    .map(r => {
      const bg = getSitterColor(r.operator);
      return {
        id:    r.id,
        label: r.petName,
        start: r.type === 'stay' ? r.ciDate : r.start,
        end:   r.type === 'stay' ? r.coDate : r.end,
        bg,
        fg:    isColorDark(bg) ? '#fff' : '#2a1a1d'
      };
    });

  // Build weeks
  const numWeeks = Math.ceil((firstDay + daysInMonth) / 7);

  // Pre-compute all week data and find globalMaxLanes
  const weekData = [];
  for (let w = 0; w < numWeeks; w++) {
    const weekDs = [];
    for (let col = 0; col < 7; col++) {
      const d = w * 7 + col - firstDay + 1;
      weekDs.push((d >= 1 && d <= daysInMonth) ? monthStr + '-' + String(d).padStart(2, '0') : null);
    }
    const validDs   = weekDs.filter(Boolean);
    const weekStart = validDs[0];
    const weekEnd   = validDs[validDs.length - 1];
    const firstValidIdx = weekDs.findIndex(d => d !== null);
    let   lastValidIdx  = 6;
    for (let i = 6; i >= 0; i--) { if (weekDs[i] !== null) { lastValidIdx = i; break; } }

    const wEvts = calEvts.filter(e => e.start <= weekEnd && e.end >= weekStart);
    wEvts.sort((a, b) => a.start.localeCompare(b.start) || b.end.localeCompare(a.end));

    const lanes = [];
    const eLane = {};
    wEvts.forEach(evt => {
      let lane = 0;
      while ((lanes[lane] || []).some(e => e.start <= evt.end && e.end >= evt.start)) lane++;
      if (!lanes[lane]) lanes[lane] = [];
      lanes[lane].push(evt);
      eLane[evt.id] = lane;
    });

    weekData.push({ weekDs, weekStart, weekEnd, firstValidIdx, lastValidIdx, lanes, eLane });
  }

  let html = '';

  for (let w = 0; w < numWeeks; w++) {
    const { weekDs, weekStart, weekEnd, firstValidIdx, lastValidIdx, lanes } = weekData[w];
    html += '<div class="cal-week">';

    html += '<div class="cal-day-row">';
    weekDs.forEach((ds, col) => {
      if (!ds) { html += '<div class="cal-day-cell empty"></div>'; return; }
      const isToday = ds === today, isSel = ds === calSelectedDate;
      const dayNum  = parseInt(ds.slice(8));
      html += `<div class="cal-day-cell${isToday ? ' today' : ''}${isSel ? ' selected' : ''}" onclick="calSelectDate('${ds}')"><span class="cal-day-num">${dayNum}</span></div>`;
    });
    html += '</div>';

    for (let lane = 0; lane < lanes.length; lane++) {
      html += '<div class="cal-event-lane">';
      (lanes[lane] || []).forEach(evt => {
        const cL = evt.start < weekStart;
        const cR = evt.end   > weekEnd;
        const c1 = cL ? firstValidIdx : weekDs.indexOf(evt.start);
        const c2 = cR ? lastValidIdx  : weekDs.indexOf(evt.end);
        const safeC1 = Math.max(0, c1 < 0 ? firstValidIdx : c1);
        const safeC2 = Math.min(6, c2 < 0 ? lastValidIdx  : c2);
        const span   = Math.max(1, safeC2 - safeC1 + 1);
        const lbl    = cL ? ('↵ ' + evt.label) : evt.label;
        const cls    = `cal-event-bar${cL ? ' no-left' : ''}${cR ? ' no-right' : ''}`;
        html += `<div class="${cls}" style="grid-column:${safeC1 + 1}/span ${span};background:${evt.bg};color:${evt.fg}" title="${esc(evt.label)}">${esc(lbl)}</div>`;
      });
      html += '</div>';
    }

    html += '</div>'; // cal-week
  }

  gridEl.innerHTML = html;

  if (hintEl) {
    if (calSelectedDate) {
      const p = calSelectedDate.split('-');
      hintEl.textContent = parseInt(p[1]) + '/' + parseInt(p[2]) + ' · 點擊取消';
      hintEl.style.display = '';
      hintEl.onclick = () => calSelectDate(calSelectedDate);
    } else {
      hintEl.style.display = 'none';
    }
  }
}

function calPrev() { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar(); }
function calNext() { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendar(); }

function calSelectDate(dateStr) {
  calSelectedDate = calSelectedDate === dateStr ? null : dateStr;
  renderCalendar();
}

function calSetSitterFilter(name) {
  calSitterFilter = name;
  renderCalendar();
}

function calSetSitterFilterFromBtn(btn) {
  const name = btn.dataset.name;
  calSitterFilter = calSitterFilter === name ? null : name;
  renderCalendar();
}

// ══ Helpers ══
let _lastIsDaycare = null;

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
  _lastIsDaycare = null;
  stayCalc();
}

function stayCalc() {
  const ciDate       = document.getElementById('s-ci-date').value;
  const ciTime       = document.getElementById('s-ci-time').value;
  const coDate       = document.getElementById('s-co-date').value;
  const coTime       = document.getElementById('s-co-time').value;
  const special      = document.getElementById('s-special').checked;
  const transport    = document.getElementById('s-transport').checked;
  const transportFee = parseFloat(document.getElementById('s-transport-fee').value) || 0;
  const fresh        = document.getElementById('s-fresh').checked;
  const freshPrice   = parseFloat(document.getElementById('s-fresh-price').value) || 0;
  let days = '', extraLabel = '', total = 0, freshMeals = 0;

  // 判斷是否為安親（≤ 8 小時）
  let totalHours = null;
  if (ciDate && coDate && ciTime && coTime) {
    totalHours = (new Date(coDate + 'T' + coTime) - new Date(ciDate + 'T' + ciTime)) / 3600000;
  }
  const isDaycare = totalHours !== null && totalHours > 0 && totalHours <= 8;

  // 當模式切換時自動帶入對應單價
  const petId = document.getElementById('s-pet').value;
  const pet   = pets.find(p => p.id === petId);
  if (isDaycare !== _lastIsDaycare) {
    _lastIsDaycare = isDaycare;
    if (isDaycare && pet && pet.daycarePrice) {
      document.getElementById('s-price').value = pet.daycarePrice;
    } else if (!isDaycare && pet && pet.stayPrice) {
      document.getElementById('s-price').value = pet.stayPrice;
    }
  }

  const price = parseFloat(document.getElementById('s-price').value) || 0;

  if (ciDate && coDate) {
    let diff = (new Date(coDate) - new Date(ciDate)) / 86400000;
    if (diff < 0) diff = 0;
    let extra = 0;
    if (!isDaycare && ciTime && coTime) {
      const ciH = parseInt(ciTime), coH = parseInt(coTime);
      const timeDiff = coH - ciH;
      if (timeDiff > 0) {
        extra = timeDiff < 12 ? 0.5 : 1;
        extraLabel = extra === 0.5 ? '是 (+½ 天)' : '加整天';
      }
    }
    days = isDaycare ? 1 : (diff === 0 ? 1 : (extra > 0 ? diff + extra : diff));
    days = days % 1 === 0 ? days : parseFloat(days.toFixed(1));
    const daysRounded = Math.round(days * 2) / 2;
    if (fresh && ciDate && coDate) freshMeals = calcFreshMeals(ciDate, ciTime, coDate, coTime);
    const freshTotal     = fresh ? freshPrice * freshMeals : 0;
    const transportTotal = transport ? transportFee : 0;
    total = price * daysRounded + (special ? 150 * daysRounded : 0) + transportTotal + freshTotal;
  }

  // 更新標籤
  if (isDaycare) {
    document.getElementById('s-extra-label').textContent = '類型';
    document.getElementById('s-extra').textContent = '安親';
    document.getElementById('s-days-label').textContent = '時數';
    document.getElementById('s-days').textContent = totalHours !== null ? totalHours.toFixed(1) + ' 小時' : '—';
    document.getElementById('s-price-label').textContent = '安親單價 / 8hr';
  } else {
    document.getElementById('s-extra-label').textContent = '加半天';
    document.getElementById('s-extra').textContent = extraLabel || '—';
    document.getElementById('s-days-label').textContent = '總天數';
    document.getElementById('s-days').textContent = days !== '' ? days + ' 天' : '—';
    document.getElementById('s-price-label').textContent = '單價 / 天';
  }

  const freshRow = document.getElementById('s-fresh-meals-row');
  if (fresh && freshMeals > 0) {
    freshRow.style.display = '';
    document.getElementById('s-fresh-meals').textContent = freshMeals + ' 餐';
  } else { freshRow.style.display = 'none'; }

  const rc  = document.getElementById('s-result-card');
  const scb = document.getElementById('s-save-copy-btn');
  if (price > 0 && days !== '') {
    document.getElementById('s-total').textContent = fmt(total);
    if (pet && ciDate && coDate) {
      document.getElementById('s-msg-preview').textContent =
        buildStayMsg({ petName: pet.name, ciDate, ciTime, coDate, coTime, days, price, total, special, transport, transportFee, fresh, freshPrice, freshMeals, isDaycare });
      rc.style.display = 'block'; scb.style.display = 'block';
    }
  } else { rc.style.display = 'none'; scb.style.display = 'none'; }
  return { days, total, special, transport, transportFee, fresh, freshPrice, freshMeals, isDaycare };
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
  return { id: makeId(), type: 'stay', petId, petName: pet?.name || '', operator: getOp(), date: ciDate, ciDate, ciTime, coDate, coTime, days, price, pct, special, transport, transportFee, fresh, freshPrice, freshMeals, total: Math.round(total), net: Math.round(total * pct), commission: Math.round(total * (1 - pct)), note: document.getElementById('s-note').value.trim(), paid: false, createdAt: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Shanghai' }) };
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

function onVSpecialChange() {
  const checked = document.getElementById('v-special').checked;
  const row = document.getElementById('v-special-time-row');
  if (row) row.style.display = checked ? '' : 'none';
  visitCalc();
}

function setSpecialTime(t) {
  _vSpecialTime = t;
  ['AM', 'PM', 'both'].forEach(v => {
    const btn = document.getElementById('spt-' + (v === 'AM' ? 'am' : v === 'PM' ? 'pm' : 'both'));
    if (btn) btn.classList.toggle('active', v === t);
  });
  visitCalc();
}

function calcSpecialTimes(times, tpd, sTime) {
  if (tpd <= 1) return times;
  if (sTime === 'both') return times;
  if (sTime === 'AM') return Math.round(times * Math.ceil(tpd / 2) / tpd);
  if (sTime === 'PM') return Math.round(times * Math.floor(tpd / 2) / tpd);
  return times;
}

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
  let times = '', total = 0, specialTimes = 0;

  if (start && end) {
    const dayDiff = Math.floor((new Date(end) - new Date(start)) / 86400000) + 1;
    times = dayDiff * tpd;
    specialTimes = special ? calcSpecialTimes(times, tpd, _vSpecialTime) : 0;
    total = price * times + (special ? 150 * specialTimes : 0) + (distance ? 100 * times : 0);
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
        buildVisitMsg({ petName: pet.name, start, end, sAMPM, eAMPM, tpd, times, price, total, special, distance, specialTime: _vSpecialTime, specialTimes });
      rc.style.display = 'block'; scb.style.display = 'block';
    }
  } else { rc.style.display = 'none'; scb.style.display = 'none'; }
  return { times, total, special, distance, specialTimes };
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
  const { times, total, special, distance, specialTimes } = visitCalc();
  const pct    = pet?.pct || 0.8;
  const sAMPM  = document.getElementById('v-start-ampm').value;
  const eAMPM  = document.getElementById('v-end-ampm').value;
  const tpd    = parseInt(document.getElementById('v-times-day').value) || 1;
  return { id: makeId(), type: 'visit', petId, petName: pet?.name || '', operator: getOp(), date: start, start, startAMPM: sAMPM, end, endAMPM: eAMPM, timesDay: tpd, times, price, pct, special, specialTime: _vSpecialTime, specialTimes: special ? specialTimes : 0, distance, total: Math.round(total), net: Math.round(total * pct), commission: Math.round(total * (1 - pct)), note: document.getElementById('v-note').value.trim(), paid: false, createdAt: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Shanghai' }) };
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
  // Reset special care timing
  _vSpecialTime = 'both';
  const row = document.getElementById('v-special-time-row');
  if (row) row.style.display = 'none';
  ['spt-am', 'spt-pm', 'spt-both'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.toggle('active', id === 'spt-both');
  });
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
  if (r.paid) {
    // Mark unpaid: clear payee
    r.paid = false;
    delete r.payee;
    dbUpdate('records/' + id, { paid: false, payee: null });
    renderRecords();
  } else {
    // Mark paid: show payee selection modal
    const modal = document.getElementById('payeeModal');
    document.getElementById('payee-rec-id').value = id;
    const list = document.getElementById('payee-list');
    list.innerHTML = sitters.map(s =>
      `<label style="display:flex;align-items:center;gap:10px;padding:10px 15px;border-bottom:1px solid var(--border);cursor:pointer;font-size:0.86rem;font-weight:500">
        <input type="radio" name="payee-radio" value="${esc(s.name)}" style="accent-color:var(--rose);width:16px;height:16px">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${s.color || 'var(--pink)'};border:1px solid rgba(0,0,0,0.1);flex-shrink:0"></span>
        ${esc(s.name)}
      </label>`
    ).join('');
    // Pre-select operator if available
    const radioToCheck = list.querySelector(`input[value="${esc(r.operator)}"]`);
    if (radioToCheck) radioToCheck.checked = true;
    openModal('payeeModal');
  }
}

function confirmPayee() {
  const id = document.getElementById('payee-rec-id').value;
  const r  = records.find(x => x.id === id); if (!r) return;
  const sel = document.querySelector('input[name="payee-radio"]:checked');
  if (!sel) { toast('⚠️ 請選擇收款人'); return; }
  r.paid  = true;
  r.payee = sel.value;
  dbUpdate('records/' + id, { paid: true, payee: r.payee });
  closeModal('payeeModal');
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
  r.editedAt   = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Shanghai' });
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
    ? buildStayMsg({ operator: r.operator, petName: r.petName, ciDate: r.ciDate, ciTime: r.ciTime, coDate: r.coDate, coTime: r.coTime, days: r.days, price: r.price, total: r.total, special: r.special, transport: r.transport, transportFee: r.transportFee, fresh: r.fresh, freshPrice: r.freshPrice, freshMeals: r.freshMeals })
    : buildVisitMsg({ operator: r.operator, petName: r.petName, start: r.start, end: r.end, sAMPM: r.startAMPM, eAMPM: r.endAMPM, tpd: r.timesDay, times: r.times, price: r.price, total: r.total, special: r.special, distance: r.distance, specialTime: r.specialTime, specialTimes: r.specialTimes });
  navigator.clipboard.writeText(msg)
    .then(() => toast('✅ 訊息已複製！'))
    .catch(() => { const ta = document.createElement('textarea'); ta.value = msg; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); toast('✅ 訊息已複製！'); });
}

function renderRecords() {
  const fm = document.getElementById('monthFilter').value;
  let filtered = fm ? records.filter(r => r.date && r.date.startsWith(fm)) : records;

  const opMap = {};
  filtered.forEach(r => {
    const op = r.operator || '未知';
    if (!opMap[op]) opMap[op] = { total: 0, net: 0, commission: 0, count: 0, owedToCompany: 0, owedToSitter: 0 };
    opMap[op].total += r.total || 0; opMap[op].net += r.net || 0; opMap[op].commission += r.commission || 0; opMap[op].count++;
    if (r.paid && r.payee) {
      if (r.payee === r.operator) opMap[op].owedToCompany += r.commission || 0;
      else                        opMap[op].owedToSitter  += r.net       || 0;
    }
  });
  const opEl = document.getElementById('opSummary');
  if (Object.keys(opMap).length) {
    opEl.innerHTML = `<div class="op-summary"><div class="op-hdr">各保母統計</div>${Object.entries(opMap).map(([op, s]) => {
      const hasSettle     = s.owedToCompany > 0 || s.owedToSitter > 0;
      const netCommission = hasSettle ? (s.owedToCompany - s.owedToSitter) : s.commission;
      return `<div class="op-row">
        <div class="op-row-main">
          <span class="op-name">${esc(op)} <small style="font-weight:400;color:var(--muted)">(${s.count}筆)</small></span>
          <div class="op-nums">
            <span>總 <span class="hi">${fmt(s.total)}</span></span>
            <span>實拿 <span class="hi">${fmt(s.net)}</span></span>
            <span>抽成 <span class="${netCommission < 0 ? 'settle-recv' : 'settle-pay'}">${fmt(netCommission)}</span>${s.owedToSitter ? ` · 非本人收款: ${fmt(s.owedToSitter)}` : ''}</span>
          </div>
        </div>
      </div>`;
    }).join('')}</div>`;
  } else opEl.innerHTML = '';

  const listEl = document.getElementById('recordsList');
  if (!filtered.length) { listEl.innerHTML = '<div class="empty"><div class="icon">📋</div>尚無紀錄</div>'; return; }

  const grouped = {};
  filtered.forEach(r => { const m = r.date ? r.date.slice(0, 7) : '未知'; if (!grouped[m]) grouped[m] = []; grouped[m].push(r); });

  listEl.innerHTML = Object.keys(grouped).sort().reverse().map(month => {
    const recs   = grouped[month];
    const mTotal        = recs.reduce((a, r) => a + (r.total || 0), 0);
    const mOwedToCompany = recs.reduce((a, r) => a + (r.paid && r.payee && r.payee === r.operator ? (r.commission || 0) : 0), 0);
    const mOwedToSitter  = recs.reduce((a, r) => a + (r.paid && r.payee && r.payee !== r.operator ? (r.net || 0) : 0), 0);
    const mNetCommission = (mOwedToCompany > 0 || mOwedToSitter > 0) ? mOwedToCompany - mOwedToSitter : recs.reduce((a, r) => a + (r.commission || 0), 0);

    const recHtml = recs.map(r => {
      const typeLabel  = r.type === 'stay' ? '🏠 住宿' : '🚗 到府';
      const dateRange  = r.type === 'stay' ? `${r.ciDate}${r.ciTime ? ' ' + r.ciTime : ''} → ${r.coDate}${r.coTime ? ' ' + r.coTime : ''}` : `${r.start} → ${r.end}`;
      const dateMeta   = r.type === 'stay' ? `${fmtD(r.ciDate)} → ${fmtD(r.coDate)}` : `${fmtD(r.start)} → ${fmtD(r.end)}`;
      const qty        = r.type === 'stay' ? r.days + '天' : r.times + '次';
      const pctLabel   = Math.round((r.pct || 0) * 100) + '%';
      const sBg        = getSitterColor(r.operator);
      // 實拿 display: if payee === operator → full amount; if payee !== operator → net; no payee → net
      const displayNet = (r.payee && r.payee === r.operator) ? r.total : r.net;
      const payeeMeta  = r.paid && r.payee ? ` · 收款人: ${esc(r.payee)}` : '';
      return `<div class="rec-card" style="background:${sBg}18;border-left:3px solid ${sBg}">
        <div class="rec-hdr">
          <div>
            <div class="rec-title">${esc(r.petName)} · ${typeLabel} · <span style="font-size:0.75rem;font-weight:500;color:${r.paid ? 'var(--green)' : 'var(--danger)'}">${r.paid ? '✓ 已付款' : '✗ 未付款'}</span></div>
            <div class="rec-meta">${dateMeta} · ${esc(r.operator || '')}${payeeMeta}</div>
          </div>
          <div class="rec-amount">${fmt(r.total)}<small>實拿 ${fmt(displayNet)} · 抽成 ${pctLabel}</small></div>
        </div>
        <div class="rec-detail" id="rd-${r.id}">
          <div class="rec-dr"><span class="rec-dl">日期</span><span class="rec-dv">${dateRange}</span></div>
          <div class="rec-dr"><span class="rec-dl">數量</span><span class="rec-dv">${qty}</span></div>
          <div class="rec-dr"><span class="rec-dl">單價</span><span class="rec-dv">${fmt(r.price)}</span></div>
          <div class="rec-dr"><span class="rec-dl">抽成比例</span><span class="rec-dv">${pctLabel}</span></div>
          <div class="rec-dr"><span class="rec-dl">抽成金額</span><span class="rec-dv">${fmt(r.commission)}</span></div>
          <div class="rec-dr"><span class="rec-dl">付款狀態</span><span class="rec-dv ${r.paid ? 'paid' : 'unpaid'}">${r.paid ? '✓ 已付款' : '✗ 未付款'}</span></div>
          ${r.paid && r.payee ? `<div class="rec-dr"><span class="rec-dl">收款人</span><span class="rec-dv">${esc(r.payee)}</span></div>` : ''}
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
    return `<div class="month-hdr"><span class="month-label">${month.replace('-', '年')}月</span><span class="month-stats">總額 ${fmt(mTotal)} · 抽成 ${fmt(mNetCommission)}</span></div>${recHtml}`;
  }).join('');
}
