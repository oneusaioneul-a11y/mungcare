/* 화식 레시피 등록 · 공유 */
import { community } from '../store.js';
import { esc, num, fmtDate, empty, modal, field, inputEl, textareaEl, selectEl, toast, confirmModal } from '../ui.js';

/* 반려견에게 위험한 식재료 — 레시피 저장 시 자동 검사 */
export const TOXIC = [
  { k: ['양파', '대파', '쪽파', '부추', '마늘'], why: '적혈구를 파괴해 용혈성 빈혈을 일으킵니다. 익혀도 독성이 남습니다.' },
  { k: ['포도', '건포도'], why: '소량으로도 급성 신부전을 유발할 수 있습니다.' },
  { k: ['초콜릿', '카카오', '코코아'], why: '테오브로민 중독 — 구토, 부정맥, 발작.' },
  { k: ['자일리톨'], why: '급격한 저혈당과 간부전을 일으킵니다. 극소량도 위험.' },
  { k: ['마카다미아'], why: '뒷다리 위약, 진전, 고열.' },
  { k: ['아보카도'], why: '페르신 성분이 구토·설사를 유발합니다.' },
  { k: ['알코올', '술', '맥주'], why: '소량으로도 중추신경 억제.' },
  { k: ['커피', '카페인', '녹차'], why: '심박수 증가, 발작 위험.' },
  { k: ['닭뼈', '갈비뼈', '익힌 뼈'], why: '익힌 뼈는 날카롭게 쪼개져 소화관을 찢을 수 있습니다.' },
  { k: ['소금', '간장', '된장'], why: '나트륨 과다는 신장에 부담을 줍니다. 화식은 무염이 원칙입니다.' }
];
export function checkToxic(text) {
  const s = String(text || '');
  return TOXIC.filter(t => t.k.some(w => s.includes(w)));
}

const RECIPE_TAGS = ['체중 관리', '노령견', '퍼피', '알러지 저자극', '신장 케어', '기호성 향상', '피부·피모'];

export default {
  head: () => ({ title: '화식 레시피', sub: '직접 만든 레시피를 기록하고 다른 보호자와 공유하세요' }),

  mount(root, ctx) {
    if (!ctx.dog) { root.innerHTML = `<div class="card">${empty('👩‍🍳', '반려견을 먼저 등록해 주세요.', '<a class="btn btn-primary" href="#/profile">등록하기</a>')}</div>`; return; }
    const list = ctx.recipes.list('createdAt');

    root.innerHTML = `
    <div class="stack">
      <div class="alert info"><span class="ai">🥗</span><span>
        <b>화식은 균형이 핵심입니다.</b><br><span style="opacity:.85">
        장기 급여 시에는 칼슘·필수지방산·비타민 균형이 맞지 않으면 결핍이 생길 수 있습니다.
        주식으로 전환하려면 반드시 수의영양 상담을 받으세요. 아래 레시피 저장 시 위험 식재료는 자동으로 검사합니다.</span></span></div>

      <div class="card">
        <div class="card-head"><h2>📕 내 레시피 (${list.length})</h2><div class="spacer"></div>
          <button class="btn btn-sm btn-primary" data-add>+ 레시피 등록</button></div>
        ${list.length ? `<div class="grid g2">${list.map(r => card(r)).join('')}</div>`
          : empty('👩‍🍳', '등록된 레시피가 없습니다.', '<button class="btn btn-primary" data-add>첫 레시피 등록하기</button>')}
      </div>

      <div class="card">
        <div class="card-head"><h2>🚫 화식에 넣으면 안 되는 재료</h2></div>
        <div class="grid g2" style="gap:10px">
          ${TOXIC.map(t => `<div style="border:1px solid var(--line);border-radius:var(--radius-sm);padding:10px 12px">
            <div style="font-weight:700;font-size:13px;color:var(--bad)">${esc(t.k.join(' · '))}</div>
            <div style="font-size:12.5px;color:var(--ink-2);margin-top:3px">${esc(t.why)}</div></div>`).join('')}
        </div>
      </div>
    </div>`;

    const openForm = (r) => {
      const box = modal({
        title: r ? '레시피 수정' : '화식 레시피 등록', wide: true, submitLabel: r ? '수정' : '등록',
        body: field('레시피 이름', inputEl('title', { value: r?.title, required: true, placeholder: '예: 닭가슴살 단호박 화식' }))
          + `<div class="inline3">
             ${field('총 완성량(g)', inputEl('totalG', { type: 'number', min: 0, value: r?.totalG, placeholder: '600' }))}
             ${field('총 칼로리', inputEl('totalKcal', { type: 'number', min: 0, value: r?.totalKcal, placeholder: '750' }))}
             ${field('보관 가능', selectEl('storage', ['냉장 3일', '냉장 5일', '냉동 2주', '냉동 1개월'], r?.storage))}</div>`
          + field('재료 (한 줄에 하나: 재료명 / 그램)', textareaEl('ingredients', {
              value: r?.ingredients, required: true, rows: 6,
              placeholder: '닭가슴살 / 300g\n단호박 / 100g\n브로콜리 / 50g\n당근 / 50g\n올리브유 / 5g' }))
          + field('만드는 법', textareaEl('steps', { value: r?.steps, rows: 5, placeholder: '1. 닭가슴살을 끓는 물에 삶는다...' }))
          + field('태그', selectEl('tag', ['', ...RECIPE_TAGS], r?.tag))
          + field('메모', inputEl('note', { value: r?.note, placeholder: '아이 반응, 배변 상태 변화 등' })),
        onSubmit: f => {
          const hits = checkToxic(f.ingredients + ' ' + f.title + ' ' + (f.steps || ''));
          const data = {
            ...f, totalG: f.totalG ? +f.totalG : null, totalKcal: f.totalKcal ? +f.totalKcal : null,
            toxic: hits.map(x => x.k[0])
          };
          if (r) ctx.recipes.update(r.id, data); else ctx.recipes.add(data);
          if (hits.length) {
            toast(`⚠️ 위험 식재료 감지: ${hits.map(x => x.k[0]).join(', ')}`, 5000);
            setTimeout(() => modal({
              title: '⚠️ 위험 식재료가 포함되어 있습니다', submitLabel: '확인', cancelLabel: '',
              body: hits.map(x => `<div class="alert bad" style="margin-bottom:8px"><span class="ai">🚫</span>
                <span><b>${esc(x.k.join(', '))}</b><br><span style="opacity:.9">${esc(x.why)}</span></span></div>`).join('')
                + '<p style="font-size:12.5px;color:var(--ink-2);margin:6px 0 0">레시피는 저장되었지만, 급여 전 해당 재료를 반드시 제외해 주세요.</p>',
              onSubmit: () => {}
            }), 250);
          } else toast('레시피를 저장했습니다.');
        }
      });
      return box;
    };

    root.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => openForm()));
    root.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openForm(ctx.recipes.get(b.dataset.edit))));
    root.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () =>
      confirmModal('레시피 삭제', '이 레시피를 삭제할까요?', () => ctx.recipes.remove(b.dataset.del))));
    root.querySelectorAll('[data-share]').forEach(b => b.addEventListener('click', () => {
      const r = ctx.recipes.get(b.dataset.share);
      community.post({
        kind: 'recipe', title: `[화식 레시피] ${r.title}`,
        body: `재료\n${r.ingredients}\n\n만드는 법\n${r.steps || '—'}\n\n총 ${r.totalG || '?'}g · ${r.totalKcal || '?'}kcal · 보관 ${r.storage || '—'}`,
        tags: r.tag ? [r.tag] : []
      });
      toast('커뮤니티에 공유했습니다.');
      location.hash = '#/community';
    }));
  }
};

function card(r) {
  const per = r.totalG && r.totalKcal ? (r.totalKcal / r.totalG * 100) : null;
  return `<div style="border:1px solid var(--line);border-radius:var(--radius);padding:15px;display:flex;flex-direction:column;gap:8px">
    <div class="row">
      <div style="font-weight:700;font-size:14.5px;flex:1">${esc(r.title)}</div>
      ${r.tag ? `<span class="chip brand">${esc(r.tag)}</span>` : ''}
    </div>
    ${r.toxic?.length ? `<div class="alert bad" style="padding:8px 10px;font-size:12px"><span class="ai">🚫</span>
      <span>위험 식재료 포함: <b>${esc(r.toxic.join(', '))}</b></span></div>` : ''}
    <div style="font-size:12.5px;color:var(--ink-2);white-space:pre-wrap;line-height:1.6;max-height:110px;overflow:hidden">${esc(r.ingredients)}</div>
    <div class="row" style="gap:6px">
      ${r.totalG ? `<span class="chip">${num(r.totalG)}g</span>` : ''}
      ${r.totalKcal ? `<span class="chip">${num(r.totalKcal)}kcal</span>` : ''}
      ${per ? `<span class="chip info">100g당 ${num(per)}kcal</span>` : ''}
      ${r.storage ? `<span class="chip">${esc(r.storage)}</span>` : ''}
    </div>
    <div class="row" style="margin-top:auto;padding-top:9px;border-top:1px solid var(--line)">
      <span style="font-size:11.5px;color:var(--ink-3)">${fmtDate(r.createdAt)}</span>
      <div class="spacer"></div>
      <button class="btn btn-sm" data-share="${esc(r.id)}">공유</button>
      <button class="btn btn-sm" data-edit="${esc(r.id)}">수정</button>
      <button class="btn btn-sm btn-danger" data-del="${esc(r.id)}">삭제</button>
    </div>
  </div>`;
}
