/* 대시보드 */
import { esc, num, fmtDate, empty, modal, field, inputEl, selectEl, toast } from '../ui.js';
import * as H from '../health.js';
import { ICONS, dogIcon, iconKeyForBreed } from '../icons.js';

export default {
  head: ctx => ({
    title: ctx.dog ? `${ctx.dog.name}의 오늘` : '오늘 하루',
    sub: ctx.dog ? `${ctx.dog.breed || '견종은 아직'} · ${H.ageLabel(ctx.dog.birth)}${ctx.dog.weight ? ` · ${ctx.dog.weight}kg` : ''}` : '먼저 우리 아이를 소개해주세요'
  }),

  mount(root, ctx) {
    if (!ctx.dog) {
      root.innerHTML = `<div class="card">${empty(dogIcon('bichon', 62), '아직 소개받은 아이가 없어요!',
        '<a href="#/profile" class="btn btn-primary">우리 아이 소개하기</a>')}</div>`;
      return;
    }

    const d = ctx.dog;
    const t = H.today();
    const mealsToday = ctx.meals.raw().filter(m => m.date === t);
    const kcalToday = mealsToday.reduce((s, m) => s + (Number(m.kcal) || 0), 0);
    const actKey = ctx.dog.activity || H.suggestActivity(ctx.dog);
    const target = ctx.dog.weight ? H.mer(Number(ctx.dog.weight), actKey) : 0;
    const pct = target ? Math.min(140, kcalToday / target * 100) : 0;

    const walks7 = ctx.walks.raw().filter(w => H.daysBetween(w.date, t) < 7);
    const min7 = walks7.reduce((s, w) => s + (Number(w.minutes) || 0), 0);
    const km7 = walks7.reduce((s, w) => s + (Number(w.km) || 0), 0);
    const goal = H.walkGoal(ctx.risk?.size || 'medium', H.ageYears(ctx.dog.birth));

    const activeMeds = ctx.meds.raw().filter(m => m.active !== false &&
      (!m.until || H.daysBetween(t, m.until) >= 0));
    const nextVax = ctx.vaxPlan.filter(v => v.due).sort((a, b) => a.due.localeCompare(b.due))[0];

    const days = [...Array(7)].map((_, i) => {
      const d = H.addDays(t, i - 6);
      const mins = ctx.walks.raw().filter(w => w.date === d).reduce((s, w) => s + (Number(w.minutes) || 0), 0);
      return { d, mins, lb: ['일', '월', '화', '수', '목', '금', '토'][new Date(d + 'T00:00:00').getDay()] };
    });
    const maxMin = Math.max(goal, ...days.map(x => x.mins), 1);

    const hour = new Date().getHours();
    const hi = hour < 6 ? '아직 깜깜하네요' : hour < 11 ? '좋은 아침이에요' : hour < 14 ? '점심은 드셨어요?'
             : hour < 18 ? '나른한 오후네요' : hour < 22 ? '오늘 하루 어땠나요?' : '늦은 시간이네요';
    const streak = (() => { let n = 0; for (let i = 0; i < 400; i++) {
      const day = H.addDays(t, -i); if (ctx.walks.raw().some(w => w.date === day)) n++; else if (i > 0) break; } return n; })();

    root.innerHTML = `
    <div class="stack">
      <div class="card" style="display:flex;align-items:center;gap:15px">
        <div class="dogav md">${dogIcon(d.icon || iconKeyForBreed(d.breed), 56)}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:15px;font-weight:700">${esc(hi)} ${esc(d.name)} 집사님!</div>
          <div style="font-size:12.5px;color:var(--ink-3);margin-top:2px">
            ${streak >= 2 ? `${esc(d.name)}랑 ${streak}일째 매일 산책 중이에요 🐾`
              : kcalToday ? `오늘 ${esc(d.name)}는 ${num(kcalToday)}kcal 먹었어요`
              : `오늘 ${esc(d.name)} 밥이랑 산책, 잊지 않으셨죠?`}
          </div>
        </div>
        <div class="squiggle" style="width:70px;flex:none"></div>
      </div>

      ${ctx.alerts.length ? `
      <div class="card">
        <div class="card-head"><h2>🔔 이건 한 번 봐주세요</h2>
          <span class="chip ${ctx.alerts[0].level}">${ctx.alerts.length}건</span></div>
        <div class="stack" style="gap:8px">
          ${ctx.alerts.slice(0, 6).map(a => `
            <a class="alert ${a.level}" href="${a.to || '#/'}" style="text-decoration:none">
              <span class="ai">${a.icon}</span>
              <span><b>${esc(a.title)}</b><br><span style="opacity:.85">${esc(a.body || '')}</span></span>
              ${a.amt ? `<span class="amt">${esc(a.amt)}</span>` : ''}
            </a>`).join('')}
        </div>
      </div>` : `<div class="alert ok"><span class="ai">✅</span><span><b>지금은 급한 게 없어요. 좋아요!</b><br>
        <span style="opacity:.85">오늘 밥이랑 산책만 남겨두면 나중에 흐름이 한눈에 보여요.</span></span></div>`}

      <div class="grid g4">
        <div class="stat">
          <div class="k">오늘 먹은 양</div>
          <div class="v">${num(kcalToday)}<span class="u">kcal</span></div>
          <div class="bar ${pct > 115 ? 'bad' : pct > 100 ? 'warn' : 'ok'}" style="margin-top:7px"><i style="width:${Math.min(100, pct)}%"></i></div>
          <div class="d">${target ? '하루 ' + num(target) + ' kcal쯤이면 딱' : '몸무게부터 알려주세요'}</div>
        </div>
        <div class="stat">
          <div class="k">최근 7일 산책</div>
          <div class="v">${num(min7)}<span class="u">분</span></div>
          <div class="d">${num(km7, 1)}km · ${walks7.length}회 · 목표 ${num(goal * 7)}분</div>
        </div>
        <div class="stat">
          <div class="k">먹는 약</div>
          <div class="v">${activeMeds.length}<span class="u">종</span></div>
          <div class="d">${activeMeds.length ? esc(activeMeds.map(m => m.name).slice(0, 2).join(', ')) : '지금은 없어요'}</div>
        </div>
        <div class="stat">
          <div class="k">다음 접종</div>
          <div class="v" style="font-size:19px">${nextVax ? (nextVax.dday < 0 ? `${Math.abs(nextVax.dday)}일 지남` : `D-${nextVax.dday}`) : '—'}</div>
          <div class="d">${nextVax ? esc(nextVax.name) : '아직 잡힌 일정 없어요'}</div>
        </div>
      </div>

      <div class="grid g2">
        <div class="card">
          <div class="card-head"><h2>🐾 이번 주 산책</h2><div class="spacer"></div>
            <span class="hint">하루 ${goal}분이 목표예요</span></div>
          <div class="weekchart">
            ${days.map(x => `<div class="col" title="${x.d} · ${x.mins}분">
              <div class="bar2" style="height:${Math.max(4, x.mins / maxMin * 100)}%"><i style="height:100%"></i></div>
              <div class="lb">${x.lb}</div></div>`).join('')}
          </div>
          <div class="row" style="margin-top:12px">
            <button class="btn btn-sm btn-primary" data-quick-walk>+ 산책 기록</button>
            <a class="btn btn-sm" href="#/walk">전체 보기</a>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h2>🍚 오늘 먹은 것</h2><div class="spacer"></div>
            <button class="btn btn-sm btn-primary" data-quick-meal>+ 기록</button></div>
          ${mealsToday.length ? `<div>${mealsToday.map(m => `
            <div class="item"><div class="body">
              <div class="ttl">${esc(m.name)}</div>
              <div class="meta">${esc(m.type || '사료')} · ${m.grams ? num(m.grams) + 'g · ' : ''}${num(m.kcal)}kcal ${m.time ? '· ' + esc(m.time) : ''}</div>
            </div></div>`).join('')}</div>`
            : empty(ICONS.bowl, '오늘 밥 기록이 아직 없어요.')}
        </div>
      </div>

      ${ctx.risk?.now?.length ? `
      <div class="card">
        <div class="card-head"><h2>🩺 요즘 이런 걸 봐주세요</h2><div class="spacer"></div>
          <a class="btn btn-sm" href="#/risk">자세히</a></div>
        <div class="grid g3">
          ${ctx.risk.now.slice(0, 3).map(r => `
            <div style="border:1px solid var(--line);border-radius:var(--radius-sm);padding:12px">
              <span class="chip ${r.severity === 'high' ? 'bad' : r.severity === 'mid' ? 'warn' : ''}">${r.severity === 'high' ? '주의' : r.severity === 'mid' ? '관찰' : '참고'}</span>
              <div style="font-weight:700;margin:7px 0 4px;font-size:13.5px">${esc(r.cond)}</div>
              <div style="font-size:12.5px;color:var(--ink-2);line-height:1.55">${esc(r.signs)}</div>
            </div>`).join('')}
        </div>
      </div>` : ''}

      <div class="card">
        <div class="card-head"><h2>🕒 최근에 있었던 일</h2></div>
        ${recentTimeline(ctx)}
      </div>

      <p class="disclaimer">여기 정보는 참고용이에요. 아이가 평소와 다르다 싶으면 망설이지 말고 병원부터 가주세요.</p>
    </div>`;

    root.querySelector('[data-quick-walk]')?.addEventListener('click', () => {
      modal({
        title: '산책 다녀왔어요',
        body: field('날짜', inputEl('date', { type: 'date', value: t, required: true }))
            + `<div class="inline">${field('얼마나 걸었나요? (분)', inputEl('minutes', { type: 'number', min: 0, value: 30, required: true }))}
               ${field('거리(km)', inputEl('km', { type: 'number', step: '0.1', min: 0 }))}</div>`
            + field('한 줄 메모', inputEl('note', { placeholder: '컨디션은 어땠나요? 응가는요?' })),
        onSubmit: f => { ctx.walks.add({ ...f, minutes: +f.minutes, km: f.km ? +f.km : null }); toast('산책 잘 다녀왔네요! 🐾'); }
      });
    });

    root.querySelector('[data-quick-meal]')?.addEventListener('click', () => {
      modal({
        title: '밥 먹었어요',
        body: `<div class="inline">${field('날짜', inputEl('date', { type: 'date', value: t, required: true }))}
               ${field('시간', inputEl('time', { type: 'time' }))}</div>`
            + field('뭘 먹었나요?', inputEl('name', { required: true, placeholder: '예: 연어 사료, 닭가슴살 화식' }))
            + `<div class="inline3">
               ${field('구분', selectEl('type', ['사료', '화식', '간식', '영양제', '기타']))}
               ${field('급여량(g)', inputEl('grams', { type: 'number', min: 0 }))}
               ${field('칼로리', inputEl('kcal', { type: 'number', min: 0 }))}</div>`,
        onSubmit: f => { ctx.meals.add({ ...f, grams: f.grams ? +f.grams : null, kcal: f.kcal ? +f.kcal : 0 }); toast('밥 기록 완료!'); }
      });
    });
  }
};

function recentTimeline(ctx) {
  const items = [];
  const push = (arr, icon, fn) => arr.forEach(r => items.push({ date: r.date, icon, ...fn(r) }));
  push(ctx.meals.raw().slice(-12), ICONS.bowl, r => ({ t: r.name, b: `${r.type || '사료'} ${r.kcal ? '· ' + r.kcal + 'kcal' : ''}` }));
  push(ctx.walks.raw().slice(-12), ICONS.paw, r => ({ t: `산책 ${r.minutes}분`, b: r.km ? `${r.km}km ${r.note || ''}` : (r.note || '') }));
  push(ctx.medical.raw().slice(-12), ICONS.hospital, r => ({ t: r.title || '진료', b: `${r.hospital || ''} ${r.diagnosis || ''}`.trim() }));
  push(ctx.vaccines.raw().slice(-12), ICONS.syringe, r => ({ t: r.label || r.code, b: r.hospital || '' }));
  const sorted = items.filter(x => x.date).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  if (!sorted.length) return empty(ICONS.sparkle, '아직 기록이 없어요. 위 버튼으로 가볍게 시작해봐요!');
  return `<div class="tl">${sorted.map(x => `
    <div class="tl-item"><div class="dt">${fmtDate(x.date)}</div>
      <div class="tt" style="display:flex;align-items:center;gap:6px"><span style="color:var(--brand);display:inline-flex">${x.icon}</span>${esc(x.t)}</div>
      ${x.b ? `<div class="bd">${esc(x.b)}</div>` : ''}</div>`).join('')}</div>`;
}
