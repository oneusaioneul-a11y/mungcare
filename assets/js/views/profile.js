/* 반려견 프로필 · 체중 기록 */
import { dogs } from '../store.js';
import { esc, num, fmtDate, empty, modal, field, inputEl, selectEl, textareaEl, checkEl, toast, confirmModal } from '../ui.js';
import * as H from '../health.js';

const EMOJI = ['🐶', '🐕', '🦮', '🐩', '🐕‍🦺', '🌭', '🐺'];

function dogForm(ctx, d = {}) {
  const breeds = (ctx.DB.breeds?.breeds || []).map(b => b.name);
  return `
    <div class="inline">
      ${field('이름', inputEl('name', { value: d.name, required: true, placeholder: '예: 몽이' }))}
      ${field('프로필 아이콘', selectEl('emoji', EMOJI, d.emoji || '🐶'))}
    </div>
    ${field('견종', selectEl('breed', ['', ...breeds, '직접 입력'], d.breed || ''), '목록에 없으면 “직접 입력”을 선택하세요.')}
    <div class="field" data-custom-breed style="${d.breed && !breeds.includes(d.breed) ? '' : 'display:none'}">
      <label>견종 직접 입력</label>${inputEl('breedCustom', { value: breeds.includes(d.breed) ? '' : (d.breed || ''), placeholder: '예: 코카스파니엘' })}
      <span class="help">목록에 없는 견종은 “믹스견/기타” 기준으로 위험 알림이 제공됩니다.</span>
    </div>
    <div class="inline">
      ${field('생년월일', inputEl('birth', { type: 'date', value: d.birth }), '접종·연령 위험 계산에 사용됩니다.')}
      ${field('성별', selectEl('sex', [{ value: 'M', label: '수컷' }, { value: 'F', label: '암컷' }], d.sex || 'M'))}
    </div>
    <div class="inline">
      ${field('체중(kg)', inputEl('weight', { type: 'number', step: '0.1', min: 0, value: d.weight, placeholder: '예: 4.2' }))}
      ${field('활동량 · 상태', selectEl('activity', H.ACTIVITY.map(a => ({ value: a.key, label: a.label })), d.activity || H.suggestActivity(d)))}
    </div>
    <div style="margin:4px 0 12px">${checkEl('neutered', '중성화 완료', d.neutered)}</div>
    <div class="inline">
      ${field('동물등록번호', inputEl('microchip', { value: d.microchip, placeholder: '선택 사항' }))}
      ${field('단골 병원', inputEl('clinic', { value: d.clinic, placeholder: '선택 사항' }))}
    </div>
    ${field('입양·가족이 된 날', inputEl('adoptedAt', { type: 'date', value: d.adoptedAt }))}
    ${field('특이사항 메모', textareaEl('notes', { value: d.notes, placeholder: '겁이 많음, 특정 소리에 예민함 등' }))}
  `;
}

function normalize(f) {
  const breed = f.breed === '직접 입력' ? (f.breedCustom || '').trim() : f.breed;
  return {
    name: f.name.trim(), emoji: f.emoji, breed, birth: f.birth || null, sex: f.sex,
    weight: f.weight ? +f.weight : null, activity: f.activity, neutered: !!f.neutered,
    microchip: f.microchip?.trim() || null, clinic: f.clinic?.trim() || null,
    adoptedAt: f.adoptedAt || null, notes: f.notes?.trim() || ''
  };
}

function bindBreedToggle(box) {
  const sel = box.querySelector('select[name=breed]');
  const cus = box.querySelector('[data-custom-breed]');
  sel?.addEventListener('change', () => { cus.style.display = sel.value === '직접 입력' ? '' : 'none'; });
}

export function openDogForm(ctx, dog) {
  const box = modal({
    title: dog ? '반려견 정보 수정' : '반려견 등록',
    submitLabel: dog ? '수정' : '등록',
    body: dogForm(ctx, dog || {}),
    onSubmit: f => {
      const data = normalize(f);
      if (!data.name) throw new Error('이름을 입력해 주세요.');
      if (dog) { dogs.update(dog.id, data); toast('수정되었습니다.'); }
      else {
        const nd = dogs.add(data);
        dogs.setActive(nd.id);
        if (data.weight) { /* 첫 체중 기록 */ }
        toast(`${data.name} 등록 완료!`);
      }
    }
  });
  bindBreedToggle(box);
}

export default {
  head: ctx => ({ title: '반려견 프로필', sub: ctx.dog ? `${ctx.dog.name} · ${ctx.dog.breed || '견종 미등록'}` : '반려견을 등록해 주세요' }),

  mount(root, ctx) {
    const d = ctx.dog;
    if (!d) {
      root.innerHTML = `<div class="card">${empty('🐾', '등록된 반려견이 없습니다.',
        '<button class="btn btn-primary" data-add-dog>반려견 등록하기</button>')}</div>`;
      root.querySelector('[data-add-dog]').addEventListener('click', () => openDogForm(ctx));
      return;
    }

    const ageY = H.ageYears(d.birth);
    const hAge = H.humanAge(d.birth, ctx.risk?.size);
    const actKey = d.activity || H.suggestActivity(d);
    const kcal = d.weight ? H.mer(+d.weight, actKey) : null;
    const ws = ctx.weights.list('date', false);
    const maxW = Math.max(...ws.map(w => w.kg), 1);
    const minW = Math.min(...ws.map(w => w.kg), maxW);

    root.innerHTML = `
    <div class="stack">
      <div class="card">
        <div class="row" style="align-items:flex-start">
          <div style="width:66px;height:66px;border-radius:20px;background:var(--brand-soft);display:grid;place-items:center;font-size:34px">${d.emoji || '🐶'}</div>
          <div style="flex:1;min-width:180px">
            <div style="font-size:21px;font-weight:800;letter-spacing:-.02em">${esc(d.name)}</div>
            <div style="color:var(--ink-3);font-size:13px;margin-top:2px">
              ${esc(d.breed || '견종 미등록')} · ${d.sex === 'F' ? '암컷' : '수컷'}${d.neutered ? ' (중성화)' : ''}
            </div>
            <div class="row" style="margin-top:9px;gap:6px">
              <span class="chip brand">${H.ageLabel(d.birth)}</span>
              ${hAge ? `<span class="chip">사람 나이 약 ${hAge}세</span>` : ''}
              ${ctx.risk?.stage ? `<span class="chip info">${esc(ctx.risk.stage.label)}</span>` : ''}
              ${d.weight ? `<span class="chip">${d.weight}kg</span>` : ''}
            </div>
          </div>
          <div class="spacer"></div>
          <div class="row">
            <button class="btn btn-sm" data-edit>정보 수정</button>
            <button class="btn btn-sm" data-add-dog>+ 반려견 추가</button>
          </div>
        </div>
      </div>

      <div class="grid g4">
        <div class="stat"><div class="k">하루 권장 칼로리</div><div class="v">${kcal ? num(kcal) : '—'}<span class="u">kcal</span></div>
          <div class="d">${esc(H.ACTIVITY.find(a => a.key === actKey)?.label || '')}</div></div>
        <div class="stat"><div class="k">휴식기 필요 열량(RER)</div><div class="v">${d.weight ? num(H.rer(+d.weight)) : '—'}<span class="u">kcal</span></div>
          <div class="d">체중 ${d.weight || '—'}kg 기준</div></div>
        <div class="stat"><div class="k">권장 산책</div><div class="v">${H.walkGoal(ctx.risk?.size || 'medium', ageY)}<span class="u">분/일</span></div>
          <div class="d">${esc(ctx.DB.breeds?.sizes?.[ctx.risk?.size] || '')}</div></div>
        <div class="stat"><div class="k">예상 수명</div><div class="v" style="font-size:19px">${ctx.risk?.breed ? ctx.risk.breed.lifespan.join('~') + '세' : '—'}</div>
          <div class="d">${ctx.risk?.breed ? esc(ctx.risk.breed.name) + ' 평균' : '견종 등록 시 표시'}</div></div>
      </div>

      <div class="grid g2">
        <div class="card">
          <div class="card-head"><h2>⚖️ 체중 기록</h2><div class="spacer"></div>
            <button class="btn btn-sm btn-primary" data-add-weight>+ 기록</button></div>
          ${ws.length ? `
            <div class="weekchart" style="height:110px">
              ${ws.slice(-12).map(w => {
                const pct = maxW === minW ? 60 : 18 + (w.kg - minW) / (maxW - minW) * 78;
                return `<div class="col" title="${w.date} · ${w.kg}kg">
                  <div class="bar2" style="height:${pct}%"><i style="height:100%"></i></div>
                  <div class="lb">${esc(w.date.slice(5).replace('-', '/'))}</div></div>`;
              }).join('')}
            </div>
            <div class="tbl-wrap" style="margin-top:14px"><table>
              <thead><tr><th>날짜</th><th>체중</th><th>변화</th><th>메모</th><th></th></tr></thead>
              <tbody>${[...ws].reverse().slice(0, 8).map((w, i, arr) => {
                const prev = arr[i + 1];
                const diff = prev ? +(w.kg - prev.kg).toFixed(2) : null;
                return `<tr><td>${fmtDate(w.date)}</td><td><b>${w.kg}kg</b></td>
                  <td>${diff == null ? '—' : `<span class="chip ${Math.abs(diff) / (prev.kg || 1) > .07 ? 'bad' : ''}">${diff > 0 ? '+' : ''}${diff}kg</span>`}</td>
                  <td style="color:var(--ink-3)">${esc(w.note || '')}</td>
                  <td style="text-align:right"><button class="btn btn-sm btn-danger" data-del-weight="${esc(w.id)}">삭제</button></td></tr>`;
              }).join('')}</tbody></table></div>`
            : empty('⚖️', '체중을 주기적으로 기록하면 급격한 변화를 자동으로 감지합니다.')}
        </div>

        <div class="card">
          <div class="card-head"><h2>📋 상세 정보</h2></div>
          <div class="tbl-wrap"><table><tbody>
            <tr><th style="width:118px">생년월일</th><td>${d.birth ? fmtDate(d.birth) : '<span style="color:var(--ink-3)">미등록 — 접종 계산에 필요합니다</span>'}</td></tr>
            <tr><th>가족이 된 날</th><td>${d.adoptedAt ? fmtDate(d.adoptedAt) : '—'}</td></tr>
            <tr><th>동물등록번호</th><td>${esc(d.microchip || '—')}</td></tr>
            <tr><th>단골 병원</th><td>${esc(d.clinic || '—')}</td></tr>
            <tr><th>알러지</th><td>${ctx.allergies.raw().length
              ? ctx.allergies.raw().map(a => `<span class="chip ${a.severity === 'high' ? 'bad' : 'warn'}">${esc(a.name)}</span>`).join(' ')
              : '<span style="color:var(--ink-3)">등록 없음</span>'}</td></tr>
            <tr><th>메모</th><td style="white-space:pre-wrap">${esc(d.notes || '—')}</td></tr>
          </tbody></table></div>
          <div class="row" style="margin-top:14px">
            <a class="btn btn-sm" href="#/allergy">알러지 관리</a>
            <a class="btn btn-sm" href="#/medical">진료 기록</a>
            <div class="spacer"></div>
            <button class="btn btn-sm btn-danger" data-del-dog>${esc(d.name)} 삭제</button>
          </div>
        </div>
      </div>

      ${ctx.dogs.length > 1 ? `
      <div class="card">
        <div class="card-head"><h2>🐕 등록된 반려견 (${ctx.dogs.length})</h2></div>
        <div class="grid g3">${ctx.dogs.map(x => `
          <div style="border:1px solid var(--line);border-radius:var(--radius-sm);padding:12px;display:flex;gap:10px;align-items:center;${x.id === d.id ? 'border-color:var(--brand);background:var(--brand-soft)' : ''}">
            <div style="font-size:26px">${x.emoji || '🐶'}</div>
            <div style="flex:1;min-width:0"><div style="font-weight:700">${esc(x.name)}</div>
              <div style="font-size:12px;color:var(--ink-3)">${esc(x.breed || '견종 미등록')} · ${H.ageLabel(x.birth)}</div></div>
            ${x.id !== d.id ? `<button class="btn btn-sm" data-switch="${esc(x.id)}">선택</button>` : '<span class="chip brand">보는 중</span>'}
          </div>`).join('')}</div>
      </div>` : ''}
    </div>`;

    root.querySelector('[data-edit]')?.addEventListener('click', () => openDogForm(ctx, d));
    root.querySelector('[data-add-dog]')?.addEventListener('click', () => openDogForm(ctx));
    root.querySelectorAll('[data-switch]').forEach(b => b.addEventListener('click', () => dogs.setActive(b.dataset.switch)));
    root.querySelector('[data-del-dog]')?.addEventListener('click', () =>
      confirmModal(`${d.name} 삭제`, `${d.name}의 모든 기록(식단·약·산책·의료)이 함께 삭제되며 되돌릴 수 없습니다. 계속할까요?`,
        () => { dogs.remove(d.id); toast('삭제되었습니다.'); }));

    root.querySelector('[data-add-weight]')?.addEventListener('click', () => {
      modal({
        title: '체중 기록',
        body: `<div class="inline">${field('날짜', inputEl('date', { type: 'date', value: H.today(), required: true }))}
               ${field('체중(kg)', inputEl('kg', { type: 'number', step: '0.01', min: 0, value: d.weight, required: true }))}</div>`
            + field('메모', inputEl('note', { placeholder: '측정 조건, 식사 전/후 등' })),
        onSubmit: f => {
          ctx.weights.add({ date: f.date, kg: +f.kg, note: f.note });
          dogs.update(d.id, { weight: +f.kg });
          toast('체중을 기록했습니다.');
        }
      });
    });
    root.querySelectorAll('[data-del-weight]').forEach(b => b.addEventListener('click', () => ctx.weights.remove(b.dataset.delWeight)));
  }
};
