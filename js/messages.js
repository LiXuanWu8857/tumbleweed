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
  const daysRounded  = Math.round((r.days || 1) * 2) / 2;
  const unitDayPrice = r.price + (r.special ? 150 : 0);
  const transportAmt = r.transport ? (r.transportFee || 0) : 0;
  const freshMeals   = r.freshMeals || 0;
  const freshTotal   = r.fresh ? Math.round((r.freshPrice || 0) * freshMeals) : 0;
  const grandTotal   = Math.round(unitDayPrice * daysRounded) + transportAmt + freshTotal;
  const bank = getSitterBank();

  const calcParts = r.isDaycare
    ? [`${unitDayPrice} $`]
    : [`${unitDayPrice} $ * ${daysRounded} 天`];
  if (r.transport && transportAmt) calcParts.push(`${transportAmt} $`);
  if (r.fresh && freshMeals)       calcParts.push(`${r.freshPrice || 0} $ * ${freshMeals} 餐`);
  const calcLine = '總金額 = ' + calcParts.join(' + ') + ' = ' + grandTotal + ' $';

  const lines = [
    r.petName,
    '時段 - ' + ci + ' ~ ' + co,
    r.isDaycare ? '安親' : ('共 ' + daysRounded + ' 天'),
    '',
    r.isDaycare ? ('安親費 ' + unitDayPrice + ' $ / 8hr') : ('住宿費 ' + unitDayPrice + ' $ / 天'),
    r.transport ? '接送服務 ' + transportAmt + ' $' : null,
    r.fresh ? '鮮食費 ' + (r.freshPrice || 0) + ' $ / 餐 × ' + freshMeals + ' 餐 = ' + freshTotal + '$' : null,
    '',
    calcLine,
    '總計 ' + grandTotal + ' $',
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
  const hasExtras = r.special || r.distance;
  const unitPrice = r.price + (r.special ? 150 : 0) + (r.distance ? 100 : 0);
  const total     = Math.round(unitPrice * r.times);
  const bank = getSitterBank();

  const lines = [
    r.petName,
    '時段 - ' + sLabel + ' ~ ' + eLabel,
    '共' + r.times + '次',
    '',
    '到府費用 ' + r.price + '$ / 次',
    r.special  ? '特殊照護加成 150$ / 次' : null,
    r.distance ? '遠距離加給 100$ / 次'   : null,
  ];

  if (hasExtras) {
    let breakdown = r.price + '$';
    if (r.special)  breakdown += ' + 150$';
    if (r.distance) breakdown += ' + 100$';
    breakdown += ' = ' + unitPrice + '$ / 次';
    lines.push('');
    lines.push('單次到府金額 ' + breakdown);
  }

  lines.push('');
  lines.push(unitPrice + '$ × ' + r.times + ' 次 = ' + total + '$');
  lines.push('');
  lines.push('以上金額確認無誤後再付款！🙇');
  lines.push('謝謝🌸');
  lines.push('');
  lines.push('———');
  lines.push('');
  lines.push(bank.line1);
  if (bank.line2) lines.push(bank.line2);
  lines.push('');
  lines.push('再麻煩了🙇');

  return lines.filter(l => l !== null).join('\n');
}

function copyMsg(type) {
  const el = document.getElementById(type === 'stay' ? 's-msg-preview' : 'v-msg-preview');
  const text = el.textContent;
  navigator.clipboard.writeText(text)
    .then(() => toast('✅ 訊息已複製！'))
    .catch(() => { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); toast('✅ 訊息已複製！'); });
}
