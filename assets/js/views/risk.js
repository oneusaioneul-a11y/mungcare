/* 견종 · 연령대별 질환 위험 사전 알림 */
import { esc, empty } from '../ui.js';
import * as H from '../health.js';
import { ICONS } from '../icons.js';

const SEV = { high: { c: 'bad', l: '주의' }, mid: { c: 'warn', l: '관찰' }, low: { c: '', l: '참고' } };
let browse = '';

export default {
  head: ctx => ({
    title: '이맘때 조심할 것',
    sub: ctx.risk?.breed ? `${ctx.risk.breed.name} · ${H.ageLabel(ctx.dog.birth)} 기준으로 봤어요` : '견종이랑 생일을 알려주시면 맞춤으로 챙겨드려요'
  }),

  mount(root, ctx) {
    const BR = ctx.DB.breeds;
    if (!BR) { root.innerHTML = `<div class="card">${empty(ICONS.alert, '견종 정보를 못 받아왔어요. 새로고침 해주실래요?')}</div>`; return; }
    if (!ctx.dog) { root.innerHTML = `<div class="card">${empty(ICONS.stethos, '먼저 우리 아이를 소개해주세요!', '<a class="btn btn-primary" href="#/profile">소개하러 가기</a>')}</div>`; return; }

    const r = ctx.risk;
    const stage = r?.stage;
    const ageY = H.ageYears(ctx.dog.birth);
    const bsel = browse || r?.breed?.name || '';
    const browsed = BR.breeds.find(b => b.name === bsel);

    root.innerHTML = `
    <div class="stack">
      ${!ctx.dog.birth ? `<div class="alert warn"><span class="ai">📅</span><span>
        <b>생일을 몰라서 나이별 안내는 아직이에요.</b><br>
        <span style="opacity:.85"><a href="#/profile">프로필에 생일만 적어주시면</a> 지금 나이에 맞는 것만 딱 골라서 보여드릴게요.</span></span></div>` : ''}

      ${stage ? `<div class="card">
        <div class="card-head"><h2>📌 지금은 ‘${esc(stage.label)}’ 시기예요</h2><div class="spacer"></div>
          <span class="chip brand">${H.ageLabel(ctx.dog.birth)}</span></div>
        <div class="grid g2" style="gap:9px">
          ${stage.checks.map(c => `<div class="row" style="gap:8px;align-items:flex-start;font-size:13px">
            <span style="color:var(--brand)">✓</span><span>${esc(c)}</span></div>`).join('')}
        </div>
      </div>` : ''}

      <div class="card">
        <div class="card-head"><h2>🩺 요즘 눈여겨볼 것들</h2><div class="spacer"></div>
          <span class="hint">${r?.breed ? esc(r.breed.name) : '견종 미등록'} 기준 ${r?.now?.length || 0}가지</span></div>
        ${r?.now?.length ? `<div class="stack" style="gap:11px">${r.now.map(x => riskCard(x)).join('')}</div>`
          : empty(ICONS.heart, '지금 나이엔 특별히 걱정할 게 없네요. 다행이에요!')}
      </div>

      ${r?.later?.length ? `<div class="card">
        <div class="card-head"><h2>⏳ 2년 안에 슬슬 챙겨야 할 것들</h2></div>
        <div class="grid g2">${r.later.map(x => `
          <div style="border:1px dashed var(--line-2);border-radius:var(--radius-sm);padding:12px">
            <div class="row"><b style="font-size:13.5px;flex:1">${esc(x.cond)}</b>
              <span class="chip info">약 ${x.inYears}년 뒤부터</span></div>
            <div style="font-size:12.5px;color:var(--ink-2);margin-top:5px">${esc(x.signs)}</div>
          </div>`).join('')}</div>
      </div>` : ''}

      <div class="card">
        <div class="card-head"><h2>📚 견종별로 자주 오는 질환들</h2><div class="spacer"></div>
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
            <thead><tr><th>질환</th><th>주의 시작</th><th>이런 신호가 보이면</th><th>이렇게 챙겨주세요</th></tr></thead>
            <tbody>${browsed.risks.map(x => `<tr>
              <td><b>${esc(x.cond)}</b><br><span class="chip ${SEV[x.severity].c}">${SEV[x.severity].l}</span></td>
              <td style="white-space:nowrap">${x.from === 0 ? '전 연령' : `${x.from}세~`}${x.to ? ` ${x.to}세` : ''}</td>
              <td style="color:var(--ink-2)">${esc(x.signs)}</td>
              <td style="color:var(--ink-2)">${esc(x.care)}</td>
            </tr>`).join('')}</tbody></table></div>` : ''}
      </div>

      <div class="card">
        <div class="card-head"><h2>🚑 이럴 땐 바로 병원으로 가주세요</h2></div>
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

      <p class="disclaimer">${esc(BR.note)} “이 병에 꼭 걸린다”는 얘기가 절대 아니에요. 같은 나이 다른 견종보다 조금 더 자주 보인다는 뜻이라,
      너무 걱정하지 마시고 검진 때 “이것도 한번 봐주세요” 하고 여쭤보는 용도로 쓰시면 딱 좋아요.</p>
    </div>`;

    root.querySelector('[data-browse]')?.addEventListener('change', e => { browse = e.target.value; this.mount(root, ctx); });
  }
};

function riskCard(x) {
  const s = SEV[x.severity];
  return `<div style="border:1px solid var(--line);border-left:3px solid ${x.severity === 'high' ? 'var(--bad)' : x.severity === 'mid' ? 'var(--warn)' : 'var(--line-2)'};border-radius:var(--radius-sm);padding:14px">
    <div class="row"><b style="font-size:14.5px;flex:1">${esc(x.cond)}</b><span class="chip ${s.c}">${s.l}</span></div>
    <div class="grid g2" style="gap:10px;margin-top:10px">
      <div><div style="font-size:11.5px;font-weight:700;color:var(--ink-3);margin-bottom:3px">이런 신호가 보이면</div>
        <div style="font-size:13px;color:var(--ink-2)">${esc(x.signs)}</div></div>
      <div><div style="font-size:11.5px;font-weight:700;color:var(--ink-3);margin-bottom:3px">이렇게 챙겨주세요</div>
        <div style="font-size:13px;color:var(--ink-2)">${esc(x.care)}</div></div>
    </div>
  </div>`;
}
