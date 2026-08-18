/* 견종 · 연령대별 질환 위험 사전 알림 */
import { esc, empty } from '../ui.js';
import * as H from '../health.js';

const SEV = { high: { c: 'bad', l: '주의' }, mid: { c: 'warn', l: '관찰' }, low: { c: '', l: '참고' } };
let browse = '';

export default {
  head: ctx => ({
    title: '견종 · 연령 위험 알림',
    sub: ctx.risk?.breed ? `${ctx.risk.breed.name} · ${H.ageLabel(ctx.dog.birth)} 기준` : '견종과 생년월일을 등록하면 맞춤 알림이 표시됩니다'
  }),

  mount(root, ctx) {
    const BR = ctx.DB.breeds;
    if (!BR) { root.innerHTML = `<div class="card">${empty('⚠️', '견종 데이터를 불러오지 못했습니다.')}</div>`; return; }
    if (!ctx.dog) { root.innerHTML = `<div class="card">${empty('🩺', '반려견을 먼저 등록해 주세요.', '<a class="btn btn-primary" href="#/profile">등록하기</a>')}</div>`; return; }

    const r = ctx.risk;
    const stage = r?.stage;
    const ageY = H.ageYears(ctx.dog.birth);
    const bsel = browse || r?.breed?.name || '';
    const browsed = BR.breeds.find(b => b.name === bsel);

    root.innerHTML = `
    <div class="stack">
      ${!ctx.dog.birth ? `<div class="alert warn"><span class="ai">📅</span><span>
        <b>생년월일이 없어 연령별 알림이 제한적입니다.</b><br>
        <span style="opacity:.85"><a href="#/profile">프로필에서 생년월일을 등록</a>하면 지금 나이에 맞는 위험만 골라서 보여드립니다.</span></span></div>` : ''}

      ${stage ? `<div class="card">
        <div class="card-head"><h2>📌 지금은 ‘${esc(stage.label)}’ 시기입니다</h2><div class="spacer"></div>
          <span class="chip brand">${H.ageLabel(ctx.dog.birth)}</span></div>
        <div class="grid g2" style="gap:9px">
          ${stage.checks.map(c => `<div class="row" style="gap:8px;align-items:flex-start;font-size:13px">
            <span style="color:var(--brand)">✓</span><span>${esc(c)}</span></div>`).join('')}
        </div>
      </div>` : ''}

      <div class="card">
        <div class="card-head"><h2>🩺 지금 특히 살펴야 할 질환</h2><div class="spacer"></div>
          <span class="hint">${r?.breed ? esc(r.breed.name) : '견종 미등록'} 기준 ${r?.now?.length || 0}건</span></div>
        ${r?.now?.length ? `<div class="stack" style="gap:11px">${r.now.map(x => riskCard(x)).join('')}</div>`
          : empty('🍀', '현재 나이에 해당하는 특이 주의 항목이 없습니다.')}
      </div>

      ${r?.later?.length ? `<div class="card">
        <div class="card-head"><h2>⏳ 앞으로 2년 내 주의가 필요해지는 질환</h2></div>
        <div class="grid g2">${r.later.map(x => `
          <div style="border:1px dashed var(--line-2);border-radius:var(--radius-sm);padding:12px">
            <div class="row"><b style="font-size:13.5px;flex:1">${esc(x.cond)}</b>
              <span class="chip info">약 ${x.inYears}년 뒤부터</span></div>
            <div style="font-size:12.5px;color:var(--ink-2);margin-top:5px">${esc(x.signs)}</div>
          </div>`).join('')}</div>
      </div>` : ''}

      <div class="card">
        <div class="card-head"><h2>📚 견종별 호발 질환 사전</h2><div class="spacer"></div>
          <select data-browse style="max-width:220px">
            ${BR.breeds.map(b => `<option value="${esc(b.name)}" ${b.name === bsel ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}
          </select></div>
        ${browsed ? `
          <div class="row" style="margin-bottom:12px;gap:6px">
            <span class="chip">${esc(BR.sizes[browsed.size] || browsed.size)}</span>
            <span class="chip">평균 수명 ${browsed.lifespan.join('~')}세</span>
            ${ageY != null && browsed.name === r?.breed?.name ? `<span class="chip brand">우리 아이 ${H.ageLabel(ctx.dog.birth)}</span>` : ''}
          </div>
          <div class="tbl-wrap"><table>
            <thead><tr><th>질환</th><th>주의 시작</th><th>이런 신호를 보세요</th><th>예방·관리</th></tr></thead>
            <tbody>${browsed.risks.map(x => `<tr>
              <td><b>${esc(x.cond)}</b><br><span class="chip ${SEV[x.severity].c}">${SEV[x.severity].l}</span></td>
              <td style="white-space:nowrap">${x.from === 0 ? '전 연령' : `${x.from}세~`}${x.to ? ` ${x.to}세` : ''}</td>
              <td style="color:var(--ink-2)">${esc(x.signs)}</td>
              <td style="color:var(--ink-2)">${esc(x.care)}</td>
            </tr>`).join('')}</tbody></table></div>` : ''}
      </div>

      <div class="card">
        <div class="card-head"><h2>🚑 이럴 땐 바로 병원으로</h2></div>
        <div class="grid g2" style="gap:9px">
          ${['호흡이 가쁘고 잇몸·혀가 창백하거나 푸르게 변할 때',
             '배가 팽팽하게 부풀고 헛구역질을 반복할 때 (위확장 염전 의심)',
             '반복적인 구토·설사에 혈액이 섞일 때',
             '갑자기 뒷다리를 쓰지 못하거나 심한 통증으로 비명을 지를 때',
             '경련이 5분 이상 지속되거나 짧은 발작이 반복될 때',
             '소변을 보려 하는데 나오지 않을 때 (요로 폐색은 응급)',
             '초콜릿·자일리톨·포도·양파 등을 삼켰을 때',
             '체온이 40도 이상으로 오르고 헐떡임이 멈추지 않을 때'
            ].map(x => `<div class="alert bad" style="padding:9px 11px;font-size:12.5px">
              <span class="ai">🚨</span><span>${esc(x)}</span></div>`).join('')}
        </div>
      </div>

      <p class="disclaimer">${esc(BR.note)} 호발 질환은 “반드시 걸린다”는 뜻이 아니라 “같은 나이의 다른 견종보다 상대적으로 자주 보고된다”는 의미입니다.
      불필요한 불안 대신, 정기 검진 항목을 정할 때 참고 자료로 활용하세요.</p>
    </div>`;

    root.querySelector('[data-browse]')?.addEventListener('change', e => { browse = e.target.value; this.mount(root, ctx); });
  }
};

function riskCard(x) {
  const s = SEV[x.severity];
  return `<div style="border:1px solid var(--line);border-left:3px solid ${x.severity === 'high' ? 'var(--bad)' : x.severity === 'mid' ? 'var(--warn)' : 'var(--line-2)'};border-radius:var(--radius-sm);padding:14px">
    <div class="row"><b style="font-size:14.5px;flex:1">${esc(x.cond)}</b><span class="chip ${s.c}">${s.l}</span></div>
    <div class="grid g2" style="gap:10px;margin-top:10px">
      <div><div style="font-size:11.5px;font-weight:700;color:var(--ink-3);margin-bottom:3px">이런 신호를 보세요</div>
        <div style="font-size:13px;color:var(--ink-2)">${esc(x.signs)}</div></div>
      <div><div style="font-size:11.5px;font-weight:700;color:var(--ink-3);margin-bottom:3px">예방 · 관리</div>
        <div style="font-size:13px;color:var(--ink-2)">${esc(x.care)}</div></div>
    </div>
  </div>`;
}
