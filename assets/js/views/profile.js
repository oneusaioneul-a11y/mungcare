/* 반려견 프로필 · 체중 기록 */
import { dogs } from '../store.js';
import { esc, num, fmtDate, empty, modal, field, inputEl, selectEl, textareaEl, checkEl, toast, confirmModal } from '../ui.js';
import * as H from '../health.js';
import { BREED_ICONS, dogIcon, iconKeyForBreed, ICONS } from '../icons.js';

const ICON_KEYS = Object.keys(BREED_ICONS);

/** 두들 아이콘 선택 그리드 */
function iconPicker(selected) {
  return `<div class="breedpick" data-iconpick>
    ${ICON_KEYS.map(k => `<button type="button" data-ik="${k}" class="${k === selected ? 'on' : ''}">
      ${dogIcon(k, 42)}<span>${BREED_ICONS[k].label}</span></button>`).join('')}
  </div>
  <input type="hidden" name="icon" value="${selected}">`;
}

function dogForm(ctx, d = {}) {
  const breeds = (ctx.DB.breeds?.breeds || []).map(b => b.name);
  return `
    ${field('이름이 뭐예요?', inputEl('name', { value: d.name, required: true, placeholder: '예: 몽이' }))}
    ${field('견종', selectEl('breed', ['', ...breeds, '직접 입력'], d.breed || ''), '목록에 없으면 “직접 입력”을 골라주세요')}
    <div class="field" data-custom-breed style="${d.breed && !breeds.includes(d.breed) ? '' : 'display:none'}">
      <label>견종 직접 입력</label>${inputEl('breedCustom', { value: breeds.includes(d.breed) ? '' : (d.breed || ''), placeholder: '예: 코카스파니엘' })}
      <span class="help">목록에 없는 아이는 “믹스견/기타” 기준으로 알려드려요</span>
    </div>
    ${field('닮은 얼굴을 골라주세요', iconPicker(d.icon || iconKeyForBreed(d.breed)))}
    <div class="inline">
      ${field('생일', inputEl('birth', { type: 'date', value: d.birth }), '접종일이랑 나이별 주의사항 계산에 써요')}
      ${field('성별', selectEl('sex', [{ value: 'M', label: '수컷' }, { value: 'F', label: '암컷' }], d.sex || 'M'))}
    </div>
    <div class="inline">
      ${field('몸무게(kg)', inputEl('weight', { type: 'number', step: '0.1', min: 0, value: d.weight, placeholder: '예: 4.2' }))}
      ${field('요즘 활동량', selectEl('activity', H.ACTIVITY.map(a => ({ value: a.key, label: a.label })), d.activity || H.suggestActivity(d)))}
    </div>
    <div style="margin:4px 0 12px">${checkEl('neutered', '중성화 했어요', d.neutered)}</div>
    <div class="inline">
      ${field('동물등록번호', inputEl('microchip', { value: d.microchip, placeholder: '없으면 비워두세요' }))}
      ${field('자주 가는 병원', inputEl('clinic', { value: d.clinic, placeholder: '없으면 비워두세요' }))}
    </div>
    ${field('가족이 된 날', inputEl('adoptedAt', { type: 'date', value: d.adoptedAt }))}
    ${field('이런 아이예요', textareaEl('notes', { value: d.notes, placeholder: '겁이 많아요, 청소기 소리를 무서워해요 …' }))}
  `;
}

function normalize(f) {
  const breed = f.breed === '직접 입력' ? (f.breedCustom || '').trim() : f.breed;
  return {
    name: f.name.trim(), icon: f.icon || iconKeyForBreed(breed), breed, birth: f.birth || null, sex: f.sex,
    weight: f.weight ? +f.weight : null, activity: f.activity, neutered: !!f.neutered,
    microchip: f.microchip?.trim() || null, clinic: f.clinic?.trim() || null,
    adoptedAt: f.adoptedAt || null, notes: f.notes?.trim() || ''
  };
}

function bindBreedToggle(box) {
  const sel = box.querySelector('select[name=breed]');
  const cus = box.querySelector('[data-custom-breed]');
  const hidden = box.querySelector('input[name=icon]');
  const marks = [...box.querySelectorAll('[data-ik]')];
  const select = key => {
    hidden.value = key;
    marks.forEach(b => b.classList.toggle('on', b.dataset.ik === key));
    box.querySelector(`[data-ik="${key}"]`)?.scrollIntoView({ block: 'nearest' });
  };
  sel?.addEventListener('change', () => {
    cus.style.display = sel.value === '직접 입력' ? '' : 'none';
    if (sel.value && sel.value !== '직접 입력') select(iconKeyForBreed(sel.value));
  });
  marks.forEach(b => b.addEventListener('click', () => select(b.dataset.ik)));
}

export function openDogForm(ctx, dog) {
  const box = modal({
    title: dog ? '아이 정보 고치기' : '우리 아이 소개하기',
    submitLabel: dog ? '고쳤어요' : '소개 완료!',
    body: dogForm(ctx, dog || {}),
    onSubmit: f => {
      const data = normalize(f);
      if (!data.name) throw new Error('아이 이름을 알려주세요!');
      if (dog) { dogs.update(dog.id, data); toast('고쳐뒀어요!'); }
      else {
        const nd = dogs.add(data);
        dogs.setActive(nd.id);
        if (data.weight) { /* 첫 체중 기록 */ }
        toast(`${data.name}, 반가워요! 🐾`);
      }
    }
  });
  bindBreedToggle(box);
}

export default {
  head: ctx => ({ title: '아이 프로필', sub: ctx.dog ? `${ctx.dog.name} · ${ctx.dog.breed || '견종은 아직'}` : '우리 아이를 소개해주세요' }),

  mount(root, ctx) {
    const d = ctx.dog;
    if (!d) {
      root.innerHTML = `<div class="card">${empty(dogIcon('maltese', 62), '아직 소개받은 아이가 없어요!',
        '<button class="btn btn-primary" data-add-dog>우리 아이 소개하기</button>')}</div>`;
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
          <div class="dogav lg">${dogIcon(d.icon || iconKeyForBreed(d.breed), 74)}</div>
          <div style="flex:1;min-width:180px">
            <div style="font-size:21px;font-weight:800;letter-spacing:-.02em">${esc(d.name)}</div>
            <div style="color:var(--ink-3);font-size:13px;margin-top:2px">
              ${esc(d.breed || '견종은 아직')} · ${d.sex === 'F' ? '여자아이' : '남자아이'}${d.neutered ? ' · 중성화 완료' : ''}
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
            <button class="btn btn-sm" data-edit>정보 고치기</button>
            <button class="btn btn-sm" data-add-dog>+ 다른 아이 추가</button>
          </div>
        </div>
      </div>

      <div class="grid g4">
        <div class="stat"><div class="k">하루에 이만큼</div><div class="v">${kcal ? num(kcal) : '—'}<span class="u">kcal</span></div>
          <div class="d">${esc(H.ACTIVITY.find(a => a.key === actKey)?.label || '')}</div></div>
        <div class="stat"><div class="k">가만히 있어도 이만큼</div><div class="v">${d.weight ? num(H.rer(+d.weight)) : '—'}<span class="u">kcal</span></div>
          <div class="d">체중 ${d.weight || '—'}kg 기준</div></div>
        <div class="stat"><div class="k">산책은 하루</div><div class="v">${H.walkGoal(ctx.risk?.size || 'medium', ageY)}<span class="u">분/일</span></div>
          <div class="d">${esc(ctx.DB.breeds?.sizes?.[ctx.risk?.size] || '')}</div></div>
        <div class="stat"><div class="k">보통 이만큼 살아요</div><div class="v" style="font-size:19px">${ctx.risk?.breed ? ctx.risk.breed.lifespan.join('~') + '세' : '—'}</div>
          <div class="d">${ctx.risk?.breed ? esc(ctx.risk.breed.name) + ' 평균이에요' : '견종을 알려주시면 보여드려요'}</div></div>
      </div>

      <div class="grid g2">
        <div class="card">
          <div class="card-head"><h2>⚖️ 몸무게 변화</h2><div class="spacer"></div>
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
            : empty(ICONS.scale, '몸무게를 가끔 적어두면 갑자기 변할 때 저희가 알려드려요.')}
        </div>

        <div class="card">
          <div class="card-head"><h2>📋 자세한 정보</h2></div>
          <div class="tbl-wrap"><table><tbody>
            <tr><th style="width:118px">생년월일</th><td>${d.birth ? fmtDate(d.birth) : '<span style="color:var(--ink-3)">아직이에요 — 접종일 계산에 필요해요</span>'}</td></tr>
            <tr><th>가족이 된 날</th><td>${d.adoptedAt ? fmtDate(d.adoptedAt) : '—'}</td></tr>
            <tr><th>동물등록번호</th><td>${esc(d.microchip || '—')}</td></tr>
            <tr><th>자주 가는 병원</th><td>${esc(d.clinic || '—')}</td></tr>
            <tr><th>알러지</th><td>${ctx.allergies.raw().length
              ? ctx.allergies.raw().map(a => `<span class="chip ${a.severity === 'high' ? 'bad' : 'warn'}">${esc(a.name)}</span>`).join(' ')
              : '<span style="color:var(--ink-3)">없어요</span>'}</td></tr>
            <tr><th>이런 아이예요</th><td style="white-space:pre-wrap">${esc(d.notes || '—')}</td></tr>
          </tbody></table></div>
          <div class="row" style="margin-top:14px">
            <a class="btn btn-sm" href="#/allergy">알러지 보기</a>
            <a class="btn btn-sm" href="#/medical">진료 기록</a>
            <div class="spacer"></div>
            <button class="btn btn-sm btn-danger" data-del-dog>${esc(d.name)} 삭제</button>
          </div>
        </div>
      </div>

      ${ctx.dogs.length > 1 ? `
      <div class="card">
        <div class="card-head"><h2>🐕 우리 아이들 (${ctx.dogs.length})</h2></div>
        <div class="grid g3">${ctx.dogs.map(x => `
          <div style="border:1px solid var(--line);border-radius:var(--radius-sm);padding:12px;display:flex;gap:10px;align-items:center;${x.id === d.id ? 'border-color:var(--brand);background:var(--brand-soft)' : ''}">
            <div class="dogav sm">${dogIcon(x.icon || iconKeyForBreed(x.breed), 30)}</div>
            <div style="flex:1;min-width:0"><div style="font-weight:700">${esc(x.name)}</div>
              <div style="font-size:12px;color:var(--ink-3)">${esc(x.breed || '견종은 아직')} · ${H.ageLabel(x.birth)}</div></div>
            ${x.id !== d.id ? `<button class="btn btn-sm" data-switch="${esc(x.id)}">선택</button>` : '<span class="chip brand">지금 보는 중</span>'}
          </div>`).join('')}</div>
      </div>` : ''}
    </div>`;

    root.querySelector('[data-edit]')?.addEventListener('click', () => openDogForm(ctx, d));
    root.querySelector('[data-add-dog]')?.addEventListener('click', () => openDogForm(ctx));
    root.querySelectorAll('[data-switch]').forEach(b => b.addEventListener('click', () => dogs.setActive(b.dataset.switch)));
    root.querySelector('[data-del-dog]')?.addEventListener('click', () =>
      confirmModal(`${d.name} 보내주기`, `${d.name}의 밥·약·산책·병원 기록이 전부 같이 사라져요. 되돌릴 수 없는데, 그래도 지울까요?`,
        () => { dogs.remove(d.id); toast('지웠어요.'); }));

    root.querySelector('[data-add-weight]')?.addEventListener('click', () => {
      modal({
        title: '몸무게 쟀어요',
        body: `<div class="inline">${field('날짜', inputEl('date', { type: 'date', value: H.today(), required: true }))}
               ${field('몇 kg이에요?', inputEl('kg', { type: 'number', step: '0.01', min: 0, value: d.weight, required: true }))}</div>`
            + field('메모', inputEl('note', { placeholder: '밥 먹기 전인가요, 후인가요?' })),
        onSubmit: f => {
          ctx.weights.add({ date: f.date, kg: +f.kg, note: f.note });
          dogs.update(d.id, { weight: +f.kg });
          toast('몸무게 적어뒀어요!');
        }
      });
    });
    root.querySelectorAll('[data-del-weight]').forEach(b => b.addEventListener('click', () => ctx.weights.remove(b.dataset.delWeight)));
  }
};
