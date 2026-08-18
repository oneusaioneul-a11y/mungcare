/* 식단 관리 — 칼로리 계산 + 급여 기록 */
import { esc, num, fmtDate, empty, modal, field, inputEl, selectEl, textareaEl, toast, confirmModal } from '../ui.js';
import * as H from '../health.js';

export default {
  head: ctx => ({ title: '식단 관리', sub: ctx.dog ? `${ctx.dog.name} · 하루 권장 칼로리와 급여 기록` : '' }),

  mount(root, ctx) {
    if (!ctx.dog) { root.innerHTML = `<div class="card">${empty('🍚', '반려견을 먼저 등록해 주세요.', '<a class="btn btn-primary" href="#/profile">등록하기</a>')}</div>`; return; }

    const d = ctx.dog;
    const actKey = d.activity || H.suggestActivity(d);
    const kg = Number(d.weight) || 0;
    const RER = H.rer(kg), MER = H.mer(kg, actKey);
    const kcalPerKgFood = Number(d.foodKcal) || 3600;
    const gday = H.gramsPerDay(MER, kcalPerKgFood);

    const t = H.today();
    const all = ctx.meals.list('date');
    const todayMeals = all.filter(m => m.date === t);
    const kcalToday = todayMeals.reduce((s, m) => s + (+m.kcal || 0), 0);
    const pct = MER ? kcalToday / MER * 100 : 0;

    const days = [...Array(7)].map((_, i) => {
      const day = H.addDays(t, i - 6);
      const k = all.filter(m => m.date === day).reduce((s, m) => s + (+m.kcal || 0), 0);
      return { day, k, lb: ['일', '월', '화', '수', '목', '금', '토'][new Date(day + 'T00:00:00').getDay()] };
    });
    const maxK = Math.max(MER || 1, ...days.map(x => x.k), 1);
    const allergyNames = ctx.allergies.raw().map(a => a.name);

    root.innerHTML = `
    <div class="stack">
      ${!kg ? `<div class="alert warn"><span class="ai">⚖️</span><span><b>체중이 등록되지 않았습니다.</b><br>
        <span style="opacity:.85">칼로리 계산에는 체중이 필요합니다. <a href="#/profile">프로필에서 등록</a>해 주세요.</span></span></div>` : ''}

      <div class="grid g4">
        <div class="stat"><div class="k">하루 권장(MER)</div><div class="v">${num(MER)}<span class="u">kcal</span></div>
          <div class="d">RER ${num(RER)} × ${H.ACTIVITY.find(a => a.key === actKey)?.f}</div></div>
        <div class="stat"><div class="k">권장 급여량</div><div class="v">${gday ? num(gday) : '—'}<span class="u">g/일</span></div>
          <div class="d">사료 ${num(kcalPerKgFood)}kcal/kg 기준</div></div>
        <div class="stat"><div class="k">오늘 섭취</div><div class="v">${num(kcalToday)}<span class="u">kcal</span></div>
          <div class="bar ${pct > 115 ? 'bad' : pct > 100 ? 'warn' : 'ok'}" style="margin-top:7px"><i style="width:${Math.min(100, pct)}%"></i></div>
          <div class="d">권장 대비 ${num(pct)}%</div></div>
        <div class="stat"><div class="k">간식 허용치</div><div class="v">${num(MER * 0.1)}<span class="u">kcal</span></div>
          <div class="d">하루 총 칼로리의 10% 이내</div></div>
      </div>

      <div class="grid g2">
        <div class="card">
          <div class="card-head"><h2>📊 최근 7일 섭취</h2><div class="spacer"></div><span class="hint">점선 = 권장 ${num(MER)}kcal</span></div>
          <div class="weekchart">
            ${days.map(x => `<div class="col" title="${x.day} · ${num(x.k)}kcal">
              <div class="bar2" style="height:${Math.max(4, x.k / maxK * 100)}%">
                <i style="height:100%;background:${x.k > MER * 1.15 ? 'var(--bad)' : 'var(--brand)'}"></i></div>
              <div class="lb">${x.lb}</div></div>`).join('')}
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h2>🥫 급여 중인 사료</h2><div class="spacer"></div>
            <button class="btn btn-sm" data-food>사료 정보 설정</button></div>
          ${d.foodName ? `
            <div class="item"><div class="body">
              <div class="ttl">${esc(d.foodName)}</div>
              <div class="meta">${num(kcalPerKgFood)}kcal/kg · 하루 ${gday ? num(gday) + 'g' : '—'} · 1일 ${d.mealsPerDay || 2}회 급여 시 ${gday ? num(gday / (d.mealsPerDay || 2)) : '—'}g씩</div>
            </div></div>
            ${d.foodNote ? `<p style="font-size:12.5px;color:var(--ink-2);margin:10px 0 0;white-space:pre-wrap">${esc(d.foodNote)}</p>` : ''}`
            : empty('🥫', '급여 중인 사료를 등록하면 하루 급여량(g)을 자동 계산합니다.')}
          <div class="disclaimer" style="margin-top:14px">사료 kcal/kg 값은 제품 포장의 “대사 에너지(ME)” 표기를 참고하세요. 향후 사료 제품 DB 연계를 통해 자동 입력을 지원할 예정입니다.</div>
        </div>
      </div>

      ${allergyNames.length ? `<div class="alert warn"><span class="ai">⚠️</span><span>
        <b>등록된 알러지: ${esc(allergyNames.join(', '))}</b><br>
        <span style="opacity:.85">식사 기록 시 해당 성분이 메뉴명에 포함되면 자동으로 경고합니다.</span></span></div>` : ''}

      <div class="card">
        <div class="card-head"><h2>🍽️ 급여 기록</h2><div class="spacer"></div>
          <button class="btn btn-sm btn-primary" data-add>+ 식사 기록</button></div>
        ${all.length ? `<div class="tbl-wrap"><table>
          <thead><tr><th>날짜</th><th>시간</th><th>구분</th><th>메뉴</th><th>양</th><th>칼로리</th><th>메모</th><th></th></tr></thead>
          <tbody>${all.slice(0, 60).map(m => `<tr>
            <td>${fmtDate(m.date)}</td><td>${esc(m.time || '—')}</td>
            <td><span class="chip ${m.type === '간식' ? 'warn' : m.type === '화식' ? 'ok' : ''}">${esc(m.type || '사료')}</span></td>
            <td><b>${esc(m.name)}</b>${allergyNames.some(a => m.name?.includes(a)) ? ' <span class="chip bad">알러지 성분</span>' : ''}</td>
            <td>${m.grams ? num(m.grams) + 'g' : '—'}</td><td>${m.kcal ? num(m.kcal) : '—'}</td>
            <td style="color:var(--ink-3);max-width:200px">${esc(m.note || '')}</td>
            <td style="text-align:right"><button class="btn btn-sm btn-danger" data-del="${esc(m.id)}">삭제</button></td>
          </tr>`).join('')}</tbody></table></div>`
          : empty('🍽️', '급여 기록이 없습니다.', '<button class="btn btn-primary" data-add>첫 기록 남기기</button>')}
      </div>
    </div>`;

    const addMeal = () => modal({
      title: '식사 기록',
      body: `<div class="inline">${field('날짜', inputEl('date', { type: 'date', value: t, required: true }))}
             ${field('시간', inputEl('time', { type: 'time' }))}</div>`
          + field('메뉴', inputEl('name', { required: true, placeholder: '예: 오리 사료, 소고기 화식' }))
          + `<div class="inline3">
             ${field('구분', selectEl('type', ['사료', '화식', '간식', '영양제', '기타']))}
             ${field('급여량(g)', inputEl('grams', { type: 'number', min: 0, step: '1' }))}
             ${field('칼로리', inputEl('kcal', { type: 'number', min: 0 }))}</div>`
          + field('메모', textareaEl('note', { placeholder: '기호성, 배변 상태, 소화 상태 등', rows: 2 })),
      onSubmit: f => {
        const grams = f.grams ? +f.grams : null;
        let kcal = f.kcal ? +f.kcal : null;
        if (!kcal && grams && f.type === '사료') kcal = Math.round(grams / 1000 * kcalPerKgFood);
        if (allergyNames.some(a => f.name.includes(a))) toast('⚠️ 등록된 알러지 성분이 포함된 메뉴입니다.', 3500);
        ctx.meals.add({ ...f, grams, kcal: kcal || 0 });
        toast('기록했습니다.');
      }
    });

    root.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', addMeal));
    root.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () =>
      confirmModal('기록 삭제', '이 급여 기록을 삭제할까요?', () => ctx.meals.remove(b.dataset.del))));

    root.querySelector('[data-food]')?.addEventListener('click', () => {
      import('../store.js').then(({ dogs }) => modal({
        title: '급여 사료 설정',
        body: field('사료 이름', inputEl('foodName', { value: d.foodName, placeholder: '예: 오리&고구마 어덜트' }))
            + `<div class="inline">
               ${field('열량(kcal/kg)', inputEl('foodKcal', { type: 'number', min: 0, value: d.foodKcal || 3600 }), '포장의 ME 표기 참고')}
               ${field('1일 급여 횟수', inputEl('mealsPerDay', { type: 'number', min: 1, max: 6, value: d.mealsPerDay || 2 }))}</div>`
            + field('메모', textareaEl('foodNote', { value: d.foodNote, placeholder: '구매처, 로트, 전환 일정 등', rows: 2 })),
        onSubmit: f => {
          dogs.update(d.id, {
            foodName: f.foodName.trim(), foodKcal: +f.foodKcal || 3600,
            mealsPerDay: +f.mealsPerDay || 2, foodNote: f.foodNote
          });
          toast('사료 정보를 저장했습니다.');
        }
      }));
    });
  }
};
