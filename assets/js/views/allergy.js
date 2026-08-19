/* 알러지 · 특이 반응 등록 */
import { esc, fmtDate, empty, modal, field, inputEl, selectEl, textareaEl, toast, confirmModal } from '../ui.js';
import * as H from '../health.js';
import { ICONS } from '../icons.js';

const TYPE = ['식품', '약물', '환경(꽃가루·집먼지)', '벌레·기생충', '접촉(샴푸·소재)', '기타'];
const SEV = [{ value: 'high', label: '중증 — 아나필락시스·응급 이력' }, { value: 'mid', label: '중등도 — 뚜렷한 증상' }, { value: 'low', label: '경증 — 가벼운 반응' }];
const COMMON_FOOD = ['닭고기', '소고기', '유제품', '밀(글루텐)', '계란', '콩', '옥수수', '양고기', '연어', '돼지고기'];

export default {
  head: () => ({ title: '알러지', sub: '한 번 적어두면 밥 기록할 때 저희가 챙겨서 알려드려요' }),

  mount(root, ctx) {
    if (!ctx.dog) { root.innerHTML = `<div class="card">${empty(ICONS.alert, '먼저 우리 아이를 소개해주세요!', '<a class="btn btn-primary" href="#/profile">소개하러 가기</a>')}</div>`; return; }
    const all = ctx.allergies.list('createdAt');
    const high = all.filter(a => a.severity === 'high');

    root.innerHTML = `
    <div class="stack">
      ${high.length ? `<div class="alert bad"><span class="ai">🚨</span><span>
        <b>${esc(high.map(a => a.name).join(', '))} — 심한 알러지가 있어요</b><br><span style="opacity:.85">
        병원 가시면 꼭 말씀해주시고, 간식이나 사료 살 때 성분표를 한 번 더 봐주세요.
        얼굴이 붓거나 숨을 힘들어하고 갑자기 토하면서 축 늘어지면, 그건 응급이에요. 바로 병원으로 가주세요.</span></span></div>` : ''}

      <div class="card">
        <div class="card-head"><h2>⚠️ 우리 아이 알러지 (${all.length})</h2><div class="spacer"></div>
          <button class="btn btn-sm btn-primary" data-add>+ 알러지 추가</button></div>
        ${all.length ? `<div class="grid g2">${all.map(a => `
          <div style="border:1px solid var(--line);border-left:3px solid ${a.severity === 'high' ? 'var(--bad)' : a.severity === 'mid' ? 'var(--warn)' : 'var(--line-2)'};border-radius:var(--radius-sm);padding:13px">
            <div class="row">
              <div style="font-weight:700;font-size:14px;flex:1">${esc(a.name)}</div>
              <span class="chip ${a.severity === 'high' ? 'bad' : a.severity === 'mid' ? 'warn' : ''}">${esc(SEV.find(s => s.value === a.severity)?.label.split(' — ')[0] || '')}</span>
            </div>
            <div style="font-size:12px;color:var(--ink-3);margin-top:4px">
              ${esc(a.type || '기타')}${a.foundAt ? ` · ${fmtDate(a.foundAt)} 확인` : ''}${a.diagnosed ? ' · 검사로 확인했어요' : ''}</div>
            ${a.symptoms ? `<div style="font-size:12.5px;margin-top:8px"><b>이럴 때</b> ${esc(a.symptoms)}</div>` : ''}
            ${a.action ? `<div style="font-size:12.5px;margin-top:4px"><b>이렇게</b> ${esc(a.action)}</div>` : ''}
            <div class="row" style="margin-top:10px">
              <button class="btn btn-sm" data-edit="${esc(a.id)}">수정</button>
              <button class="btn btn-sm btn-danger" data-del="${esc(a.id)}">삭제</button>
            </div>
          </div>`).join('')}</div>`
          : empty(ICONS.heart, '등록된 알러지가 없어요. 다행이에요!', '<button class="btn btn-primary" data-add>알러지 등록하기</button>')}
      </div>

      <div class="card">
        <div class="card-head"><h2>🔍 흔히 문제되는 재료들</h2><span class="hint">눌러보세요, 바로 등록할 수 있어요</span></div>
        <div class="row" style="gap:6px">
          ${COMMON_FOOD.map(f => `<button class="chip" style="cursor:pointer;border:1px solid var(--line-2)" data-quick="${esc(f)}">${esc(f)}</button>`).join('')}
        </div>
        <div class="disclaimer" style="margin-top:14px">
          식품 알러지는 피검사만으로는 정확히 알기 어려워요. 8~12주 동안 <b>제한식이</b>를 해보는 게 가장 확실한 방법인데,
          그동안은 단백질 한 가지랑 탄수화물 한 가지만 주고 간식이랑 영양제도 다 끊어야 해요. 혼자 하시면 힘드니까 꼭 선생님이랑 같이 해주세요!
        </div>
      </div>
    </div>`;

    const openForm = (a, preset) => modal({
      title: a ? '알러지 고치기' : '알러지 등록하기', submitLabel: a ? '고쳤어요' : '등록할게요',
      body: `<div class="inline">${field('뭐에 반응하나요?', inputEl('name', { value: a?.name || preset || '', required: true, placeholder: '예: 닭고기' }))}
             ${field('어떤 종류예요?', selectEl('type', TYPE, a?.type))}</div>`
        + field('얼마나 심한가요?', selectEl('severity', SEV, a?.severity || 'mid'))
        + field('어떤 증상이 나와요?', textareaEl('symptoms', { value: a?.symptoms, rows: 2, placeholder: '예: 발이랑 귀를 엄청 긁어요, 먹고 반나절 뒤에 토해요' }))
        + field('그럴 땐 이렇게', textareaEl('action', { value: a?.action, rows: 2, placeholder: '예: 바로 급여 중단하고, 받아둔 약 먹인 뒤 병원에 연락' }))
        + `<div class="inline">${field('언제 알았나요?', inputEl('foundAt', { type: 'date', value: a?.foundAt }))}
           ${field('확실한가요?', selectEl('diagnosed', [{ value: '', label: '아직 의심만 하는 중' }, { value: 'yes', label: '검사로 확인했어요' }], a?.diagnosed))}</div>`,
      onSubmit: f => {
        if (a) ctx.allergies.update(a.id, f); else ctx.allergies.add(f);
        toast('등록했어요! 이제 밥 기록할 때 자동으로 확인해드릴게요');
      }
    });

    root.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => openForm()));
    root.querySelectorAll('[data-quick]').forEach(b => b.addEventListener('click', () => openForm(null, b.dataset.quick)));
    root.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openForm(ctx.allergies.get(b.dataset.edit))));
    root.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () =>
      confirmModal('알러지 지우기', '이 항목을 지울까요?', () => ctx.allergies.remove(b.dataset.del))));
  }
};
