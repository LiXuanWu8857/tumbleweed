// ══ LINE Message Builders ══

function fmtD(d) {
  if (!d) return '';
  const p = d.split('-');
  return parseInt(p[1]) + '/' + parseInt(p[2]);
}

function getSitterBank(opName) {
  const op = opName != null ? opName : getOp();
  const s = sitters.find(x => x.name === op);
  if (!s || !s.bankAccount) return { line1: '可以Line pay 或者是匯款', line2: '' };
  const bankLabel = (s.bankName || '') + (s.bankCode ? ' ' + s.bankCode : '');
  return { line1: '可以Line pay 或者是匯款', line2: bankLabel + '\n' + s.bankAccount };
}

function buildStayMsg(r) {
  const ci = fmtD(r.ciDate) + (r.ciTime ? ' ' + r.ciTime.slice(0, 5) : '');
  const co = fmtD(r.coDate) + (r.coTime ? ' ' + r.coTime.slice(0, 5) : '');
  const isAnChin    = r.ciDate === r.coDate;
  const typeLabel   = isAnChin ? '安親' : '住宿';
  const daysRounded = Math.round((r.days || 1) * 2) / 2;
  const unitPrice   = r.price + (r.special ? 150 : 0);
  const subtotal    = Math.round(unitPrice * daysRounded);
  const transportAmt = r.transport ? (r.transportFee || 0) : 0;
  const freshTotal   = r.fresh ? Math.round((r.freshPrice || 0) * (r.freshMeals || 0)) : 0;
  const grandTotal   = subtotal + transportAmt + freshTotal;
  const bank = getSitterBank(r.operator);
  const lines = [
    r.petName,
    '時段 - ' + ci + ' ~ ' + co,
    '',
    typeLabel + '費 ' + unitPrice + '$ / 天 × ' + daysRounded + ' 天 = ' + subtotal + '$',
    r.transport ? '接送服務 ' + transportAmt + '$' : null,
    r.fresh ? '鮮食費 ' + (r.freshPrice || 0) + '$ / 餐 × ' + (r.freshMeals || 0) + ' 餐 = ' + freshTotal + '$' : null,
    '',
    '總計 ' + grandTotal + '$',
    '',
    '以上金額確認無誤後再付款！🙇',
    '謝謝🌸',
    '',
    '———',
    '',
    bank.line1,
    bank.line2 || null,
    '',
    '再麻煩了🙇'
  ];
  return lines.filter(l => l !== null).join('\n');
}

function buildVisitMsg(r) {
  const sLabel    = fmtD(r.start) + ' ' + (r.sAMPM === 'AM' ? '早上' : '晚上');
  const eLabel    = fmtD(r.end)   + ' ' + (r.eAMPM === 'AM' ? '早上' : '晚上');
  const tpd       = r.tpd || r.timesDay || 1;
  const unitPrice = r.price + (r.special ? 150 : 0) + (r.distance ? 100 : 0);
  const total     = Math.round(unitPrice * r.times);
  const bank      = getSitterBank(r.operator);
  const hasExtras = r.special || r.distance;
  const lines = [
    r.petName,
    '時段 - ' + sLabel + ' ~ ' + eLabel,
    '每日 ' + tpd + ' 次 · 共 ' + r.times + ' 次',
    '',
    '到府費 ' + r.price + '$ / 次' + (r.special ? ' + 特殊照護 150$' : '') + (r.distance ? ' + 遠距離 100$' : '') + (hasExtras ? ' = ' + unitPrice + '$ / 次' : ''),
    '合計 ' + unitPrice + '$ × ' + r.times + ' 次 = ' + total + '$',
    '',
    '以上金額確認無誤後再付款！🙇',
    '謝謝🌸',
    '',
    '———',
    '',
    bank.line1,
    bank.line2 || null,
    '',
    '再麻煩了🙇'
  ];
  return lines.filter(l => l !== null).join('\n');
}

function copyMsg(type) {
  const el = document.getElementById(type === 'stay' ? 's-msg-preview' : 'v-msg-preview');
  const text = el.textContent;
  navigator.clipboard.writeText(text)
    .then(() => toast('✅ 訊息已複製！'))
    .catch(() => { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); toast('✅ 訊息已複製！'); });
}
