// ══ LINE Message Builders ══

function fmtD(d) {
  if (!d) return '';
  const p = d.split('-');
  return parseInt(p[1]) + '/' + parseInt(p[2]);
}

function getSitterBank() {
  const op = getOp();
  const s = sitters.find(x => x.name === op);
  if (!s || !s.bankAccount) return { line1: '可以Line pay 或者是匯款', line2: '' };
  const bankLabel = (s.bankName || '') + (s.bankCode ? ' ' + s.bankCode : '');
  return { line1: '可以Line pay 或者是匯款', line2: bankLabel + '\n' + s.bankAccount };
}

function buildStayMsg(r) {
  const ci = fmtD(r.ciDate) + (r.ciTime ? ' ' + r.ciTime.slice(0, 5) : '');
  const co = fmtD(r.coDate) + (r.coTime ? ' ' + r.coTime.slice(0, 5) : '');
  const isAnChin = r.ciDate === r.coDate;
  const typeLabel = isAnChin ? '安親' : '住宿';
  const daysRounded = Math.round(r.days * 2) / 2;
  const specialAmt  = r.special ? 150 * daysRounded : 0;
  const distanceAmt = r.distance ? 100 : 0;
  const bank = getSitterBank();
  const lines = [
    r.petName,
    '時段 - ' + ci + ' ~ ' + co,
    '',
    typeLabel + '金額為 ' + r.price + '$ / 天',
    r.special  ? '特殊照護 150$ / 天' : null,
    r.distance ? '遠距離加給 100$ / 趟' : null,
    (r.special || r.distance) ? '總金額為 ' + (r.price + (r.special ? 150 : 0)) + '$ / 天' : null,
    (!isAnChin && r.days % 1 === 0.5) ? '含半天' : null,
    '共 ' + r.days + ' 天',
    '',
    r.price + ' * ' + r.days + (r.special ? ' + 特殊照護 ' + specialAmt : '') + (r.distance ? ' + 遠距離 ' + distanceAmt : '') + ' = ' + Math.round(r.total),
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
  const sLabel = fmtD(r.start) + ' ' + (r.sAMPM === 'AM' ? '早上' : '晚上');
  const eLabel = fmtD(r.end)   + ' ' + (r.eAMPM === 'AM' ? '早上' : '晚上');
  const specialAmt  = r.special ? 150 * r.times : 0;
  const distanceAmt = r.distance ? 100 : 0;
  const bank = getSitterBank();
  const lines = [
    r.petName,
    '時段 - ' + sLabel + ' ~ ' + eLabel,
    '',
    '到府金額為 ' + r.price + '$ / 次',
    r.special  ? '特殊照護 150$ / 次' : null,
    r.distance ? '遠距離加給 100$ / 趟' : null,
    (r.special || r.distance) ? '總金額為 ' + (r.price + (r.special ? 150 : 0)) + '$ / 次' : null,
    r.tpd > 1 ? '一天 ' + r.tpd + ' 次' : null,
    '共 ' + r.times + ' 次',
    '',
    r.price + ' * ' + r.times + (r.special ? ' + 特殊照護 ' + specialAmt : '') + (r.distance ? ' + 遠距離 ' + distanceAmt : '') + ' = ' + Math.round(r.total),
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
