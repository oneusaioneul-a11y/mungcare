/* 화식 레시피 등록 · 공유 */
import { community } from '../store.js';
import { esc, num, fmtDate, empty, modal, field, inputEl, textareaEl, selectEl, toast, confirmModal } from '../ui.js';
import { ICONS } from '../icons.js';

/* 반려견에게 위험한 식재료 — 레시피 저장 시 자동 검사 */
export const TOXIC = [
  { k: ['양파', '대파', '쪽파', '부추', '마늘'], why: '적혈구를 깨뜨려서 빈혈이 와요. 익혀도 독성이 안 없어져요!' },
  { k: ['포도', '건포도'], why: '조금만 먹어도 갑자기 신장이 망가질 수 있어요.' },
  { k: ['초콜릿', '카카오', '코코아'], why: '토하고, 심장이 이상하게 뛰고, 발작까지 올 수 있어요.' },
  { k: ['자일리톨'], why: '혈당이 뚝 떨어지고 간이 상해요. 정말 조금만 먹어도 위험해요.' },
  { k: ['마카다미아'], why: '뒷다리에 힘이 빠지고 덜덜 떨면서 열이 나요.' },
  { k: ['아보카도'], why: '토하고 설사해요. 씨앗은 목에 걸릴 수도 있고요.' },
  { k: ['알코올', '술', '맥주'], why: '한 모금도 안 돼요. 정신을 잃을 수 있어요.' },
  { k: ['커피', '카페인', '녹차'], why: '심장이 빨리 뛰고 발작이 올 수 있어요.' },
  { k: ['닭뼈', '갈비뼈', '익힌 뼈'], why: '익힌 뼈는 날카롭게 쪼개져서 장을 찢을 수 있어요. 생뼈랑 달라요!' },
  { k: ['소금', '간장', '된장'], why: '짠 건 신장에 부담이에요. 화식은 간 안 하는 게 원칙이에요.' }
];
export function checkToxic(text) {
  const s = String(text || '');
  return TOXIC.filter(t => t.k.some(w => s.includes(w)));
}

const RECIPE_TAGS = ['체중 관리', '노령견', '퍼피', '알러지 저자극', '신장 케어', '기호성 향상', '피부·피모'];

export default {
  head: () => ({ title: '화식 레시피', sub: '직접 만든 레시피, 기록해두고 다른 집사님들이랑 나눠봐요' }),

  mount(root, ctx) {
    if (!ctx.dog) { root.innerHTML = `<div class="card">${empty(ICONS.chef, '먼저 우리 아이를 소개해주세요!', '<a class="btn btn-primary" href="#/profile">소개하러 가기</a>')}</div>`; return; }
    const list = ctx.recipes.list('createdAt');

    root.innerHTML = `
    <div class="stack">
      <div class="alert info"><span class="ai">🥗</span><span>
        <b>화식은 균형이 제일 중요해요.</b><br><span style="opacity:.85">
        오래 먹이다 보면 칼슘이나 지방산, 비타민이 모자라기 쉬워요. 주식으로 바꾸실 거면 영양 상담을 꼭 한 번 받아보세요.
        참, 레시피 저장할 때 위험한 재료가 있으면 저희가 바로 알려드릴게요!</span></span></div>

      <div class="card">
        <div class="card-head"><h2>📕 내가 만든 레시피 (${list.length})</h2><div class="spacer"></div>
          <button class="btn btn-sm btn-primary" data-add>+ 레시피 만들기</button></div>
        ${list.length ? `<div class="grid g2">${list.map(r => card(r)).join('')}</div>`
          : empty(ICONS.chef, '아직 저장한 레시피가 없어요.', '<button class="btn btn-primary" data-add>첫 레시피 만들기</button>')}
      </div>

      <div class="card">
        <div class="card-head"><h2>🚫 절대 넣으면 안 되는 재료</h2></div>
        <div class="grid g2" style="gap:10px">
          ${TOXIC.map(t => `<div style="border:1px solid var(--line);border-radius:var(--radius-sm);padding:10px 12px">
            <div style="font-weight:700;font-size:13px;color:var(--bad)">${esc(t.k.join(' · '))}</div>
            <div style="font-size:12.5px;color:var(--ink-2);margin-top:3px">${esc(t.why)}</div></div>`).join('')}
        </div>
      </div>
    </div>`;

    const openForm = (r) => {
      const box = modal({
        title: r ? '레시피 고치기' : '레시피 만들기', wide: true, submitLabel: r ? '고쳤어요' : '저장할게요',
        body: field('레시피 이름을 붙여주세요', inputEl('title', { value: r?.title, required: true, placeholder: '예: 닭가슴살 단호박 화식' }))
          + `<div class="inline3">
             ${field('다 만들면 몇 g?', inputEl('totalG', { type: 'number', min: 0, value: r?.totalG, placeholder: '600' }))}
             ${field('총 칼로리는요?', inputEl('totalKcal', { type: 'number', min: 0, value: r?.totalKcal, placeholder: '750' }))}
             ${field('얼마나 두고 먹나요?', selectEl('storage', ['냉장 3일', '냉장 5일', '냉동 2주', '냉동 1개월'], r?.storage))}</div>`
          + field('뭐가 들어가나요? (한 줄에 하나씩)', textareaEl('ingredients', {
              value: r?.ingredients, required: true, rows: 6,
              placeholder: '닭가슴살 / 300g\n단호박 / 100g\n브로콜리 / 50g\n당근 / 50g\n올리브유 / 5g' }))
          + field('어떻게 만드나요?', textareaEl('steps', { value: r?.steps, rows: 5, placeholder: '1. 닭가슴살을 끓는 물에 삶아요...' }))
          + field('어떤 아이한테 좋아요?', selectEl('tag', ['', ...RECIPE_TAGS], r?.tag))
          + field('먹여보니 어땠나요?', inputEl('note', { value: r?.note, placeholder: '잘 먹던가요? 응가는 괜찮았나요?' })),
        onSubmit: f => {
          const hits = checkToxic(f.ingredients + ' ' + f.title + ' ' + (f.steps || ''));
          const data = {
            ...f, totalG: f.totalG ? +f.totalG : null, totalKcal: f.totalKcal ? +f.totalKcal : null,
            toxic: hits.map(x => x.k[0])
          };
          if (r) ctx.recipes.update(r.id, data); else ctx.recipes.add(data);
          if (hits.length) {
            toast(`⚠️ 잠깐! ${hits.map(x => x.k[0]).join(', ')} 는 위험해요`, 5000);
            setTimeout(() => modal({
              title: '⚠️ 이 재료는 빼주세요!', submitLabel: '알겠어요', cancelLabel: '',
              body: hits.map(x => `<div class="alert bad" style="margin-bottom:8px"><span class="ai">🚫</span>
                <span><b>${esc(x.k.join(', '))}</b><br><span style="opacity:.9">${esc(x.why)}</span></span></div>`).join('')
                + '<p style="font-size:12.5px;color:var(--ink-2);margin:6px 0 0">레시피는 저장해뒀어요. 다만 먹이기 전에 이 재료는 꼭 빼주세요!</p>',
              onSubmit: () => {}
            }), 250);
          } else toast('레시피 저장했어요! 👩‍🍳');
        }
      });
      return box;
    };

    root.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => openForm()));
    root.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openForm(ctx.recipes.get(b.dataset.edit))));
    root.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () =>
      confirmModal('레시피 지우기', '이 레시피를 지울까요?', () => ctx.recipes.remove(b.dataset.del))));
    root.querySelectorAll('[data-share]').forEach(b => b.addEventListener('click', () => {
      const r = ctx.recipes.get(b.dataset.share);
      community.post({
        kind: 'recipe', title: `[화식 레시피] ${r.title}`,
        body: `재료\n${r.ingredients}\n\n만드는 법\n${r.steps || '—'}\n\n총 ${r.totalG || '?'}g · ${r.totalKcal || '?'}kcal · 보관 ${r.storage || '—'}`,
        tags: r.tag ? [r.tag] : []
      });
      toast('수다방에 공유했어요!');
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
      <span><b>${esc(r.toxic.join(', '))}</b> — 이건 빼주세요!</span></div>` : ''}
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
