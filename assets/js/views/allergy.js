/* 알러지 · 특이 반응 등록 */
import { esc, fmtDate, empty, modal, field, inputEl, selectEl, textareaEl, toast, confirmModal } from '../ui.js';
import * as H from '../health.js';

const TYPE = ['식품', '약물', '환경(꽃가루·집먼지)', '벌레·기생충', '접촉(샴푸·소재)', '기타'];
const SEV = [{ value: 'high', label: '중증 — 아나필락시스·응급 이력' }, { value: 'mid', label: '중등도 — 뚜렷한 증상' }, { value: 'low', label: '경증 — 가벼운 반응' }];
const COMMON_FOOD = ['닭고기', '소고기', '유제품', '밀(글루텐)', '계란', '콩', '옥수수', '양고기', '연어', '돼지고기'];

export default {
  head: () => ({ title: '알러지 관리', sub: '식품·약물·환경 알러지를 등록하면 식단 기록에서 자동 경고합니다' }),

  mount(root, ctx) {
    if (!ctx.dog) { root.innerHTML = `<div class="card">${empty('⚠️', '반려견을 먼저 등록해 주세요.', '<a class="btn btn-primary" href="#/profile">등록하기</a>')}</div>`; return; }
    const all = ctx.allergies.list('createdAt');
    const high = all.filter(a => a.severity === 'high');

    root.innerHTML = `
    <div class="stack">
      ${high.length ? `<div class="alert bad"><span class="ai">🚨</span><span>
        <b>중증 알러지: ${esc(high.map(a => a.name).join(', '))}</b><br><span style="opacity:.85">
        병원 방문 시 반드시 수의사에게 알리고, 간식·사료 구매 전 성분표를 확인하세요.
        아나필락시스(얼굴 부종, 호흡곤란, 갑작스러운 구토와 허탈)는 즉시 응급 진료가 필요합니다.</span></span></div>` : ''}

      <div class="card">
        <div class="card-head"><h2>⚠️ 등록된 알러지 (${all.length})</h2><div class="spacer"></div>
          <button class="btn btn-sm btn-primary" data-add>+ 알러지 등록</button></div>
        ${all.length ? `<div class="grid g2">${all.map(a => `
          <div style="border:1px solid var(--line);border-left:3px solid ${a.severity === 'high' ? 'var(--bad)' : a.severity === 'mid' ? 'var(--warn)' : 'var(--line-2)'};border-radius:var(--radius-sm);padding:13px">
            <div class="row">
              <div style="font-weight:700;font-size:14px;flex:1">${esc(a.name)}</div>
              <span class="chip ${a.severity === 'high' ? 'bad' : a.severity === 'mid' ? 'warn' : ''}">${esc(SEV.find(s => s.value === a.severity)?.label.split(' — ')[0] || '')}</span>
            </div>
            <div style="font-size:12px;color:var(--ink-3);margin-top:4px">
              ${esc(a.type || '기타')}${a.foundAt ? ` · ${fmtDate(a.foundAt)} 확인` : ''}${a.diagnosed ? ' · 검사로 확진' : ''}</div>
            ${a.symptoms ? `<div style="font-size:12.5px;margin-top:8px"><b>증상</b> ${esc(a.symptoms)}</div>` : ''}
            ${a.action ? `<div style="font-size:12.5px;margin-top:4px"><b>대처</b> ${esc(a.action)}</div>` : ''}
            <div class="row" style="margin-top:10px">
              <button class="btn btn-sm" data-edit="${esc(a.id)}">수정</button>
              <button class="btn btn-sm btn-danger" data-del="${esc(a.id)}">삭제</button>
            </div>
          </div>`).join('')}</div>`
          : empty('⚠️', '등록된 알러지가 없습니다.', '<button class="btn btn-primary" data-add>알러지 등록하기</button>')}
      </div>

      <div class="card">
        <div class="card-head"><h2>🔍 흔한 식품 알러젠</h2><span class="hint">클릭하면 바로 등록 창이 열립니다</span></div>
        <div class="row" style="gap:6px">
          ${COMMON_FOOD.map(f => `<button class="chip" style="cursor:pointer;border:1px solid var(--line-2)" data-quick="${esc(f)}">${esc(f)}</button>`).join('')}
        </div>
        <div class="disclaimer" style="margin-top:14px">
          식품 알러지는 혈액 검사만으로 확진하기 어렵고, 8~12주간의 <b>제한식이 시험(elimination diet)</b>이 표준입니다.
          이 기간에는 한 가지 단백질원과 탄수화물원만 급여하며 간식·영양제도 모두 중단해야 하므로 반드시 수의사와 함께 진행하세요.
        </div>
      </div>
    </div>`;

    const openForm = (a, preset) => modal({
      title: a ? '알러지 수정' : '알러지 등록', submitLabel: a ? '수정' : '등록',
      body: `<div class="inline">${field('알러젠 이름', inputEl('name', { value: a?.name || preset || '', required: true, placeholder: '예: 닭고기' }))}
             ${field('분류', selectEl('type', TYPE, a?.type))}</div>`
        + field('심각도', selectEl('severity', SEV, a?.severity || 'mid'))
        + field('증상', textareaEl('symptoms', { value: a?.symptoms, rows: 2, placeholder: '예: 발과 귀를 심하게 긁음, 급여 후 12시간 내 구토' }))
        + field('대처 방법', textareaEl('action', { value: a?.action, rows: 2, placeholder: '예: 즉시 급여 중단, 처방받은 항히스타민제 투약 후 병원 연락' }))
        + `<div class="inline">${field('확인한 날', inputEl('foundAt', { type: 'date', value: a?.foundAt }))}
           ${field('확진 여부', selectEl('diagnosed', [{ value: '', label: '의심 단계' }, { value: 'yes', label: '검사·시험으로 확진' }], a?.diagnosed))}</div>`,
      onSubmit: f => {
        if (a) ctx.allergies.update(a.id, f); else ctx.allergies.add(f);
        toast('저장했습니다. 식단 기록 시 자동으로 확인합니다.');
      }
    });

    root.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => openForm()));
    root.querySelectorAll('[data-quick]').forEach(b => b.addEventListener('click', () => openForm(null, b.dataset.quick)));
    root.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openForm(ctx.allergies.get(b.dataset.edit))));
    root.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () =>
      confirmModal('알러지 삭제', '이 항목을 삭제할까요?', () => ctx.allergies.remove(b.dataset.del))));
  }
};
