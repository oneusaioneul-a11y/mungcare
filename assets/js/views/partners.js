/* 동물병원 · 용품점 디렉터리 — partners 영역(회원 데이터와 분리)의 업체 정보 */
import { partners, auth } from '../store.js';
import { esc, relDate, empty, modal, field, inputEl, selectEl, textareaEl, toast } from '../ui.js';
import { ICONS } from '../icons.js';

export const PARTNER_KINDS = [
  { v: 'hospital', l: '동물병원', e: '🏥' },
  { v: 'store', l: '용품점', e: '🛒' },
  { v: 'grooming', l: '미용', e: '✂️' },
  { v: 'hotel', l: '호텔·유치원', e: '🏨' },
  { v: 'training', l: '훈련', e: '🎾' },
  { v: 'etc', l: '기타', e: '🐾' }
];
export const kindLabel = v => PARTNER_KINDS.find(k => k.v === v)?.l || '기타';
const kindEmoji = v => PARTNER_KINDS.find(k => k.v === v)?.e || '🐾';

let filterKind = '';

export default {
  head: () => ({ title: '동물병원 · 용품점', sub: '가입한 업체들을 한 곳에서 봐요. 별점은 집사님들이 직접 남긴 거예요' }),

  mount(root, ctx) {
    const mine = partners.mine();
    const list = partners.list(filterKind || undefined);

    root.innerHTML = `
    <div class="stack">
      ${mine ? this.mineCard(mine) : `
      <div class="card" style="display:flex;align-items:center;gap:15px">
        <div style="font-size:34px">🤝</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:15px;font-weight:700">동물병원이나 용품점을 운영하시나요?</div>
          <div style="font-size:12.5px;color:var(--ink-3);margin-top:2px">
            파트너로 가입하면 여기 디렉터리에 업체가 소개돼요. 가입은 로그인 화면의
            <b>[파트너로 함께하기]</b>에서 할 수 있어요 (사업자등록번호 필요).
          </div>
        </div>
      </div>`}

      <div class="row">
        <div class="seg">
          <button class="${filterKind === '' ? 'on' : ''}" data-kind="">전체</button>
          ${PARTNER_KINDS.map(k => `<button class="${filterKind === k.v ? 'on' : ''}" data-kind="${k.v}">${k.l}</button>`).join('')}
        </div>
        <div class="spacer"></div>
        <span class="hint">${list.length}곳</span>
      </div>

      ${list.length ? `<div class="grid g3">${list.map(p => this.card(p)).join('')}</div>`
        : `<div class="card">${empty(ICONS.heart, filterKind ? '이 분야는 아직 가입한 업체가 없어요.' : '아직 가입한 업체가 없어요. 첫 파트너를 기다리고 있어요!')}</div>`}

      <p class="disclaimer">업체 정보는 각 업체가 직접 등록한 내용이에요. ✓ 표시는 운영자가 사업자등록을 확인한 업체예요.
      진료·구매 전에 꼭 직접 연락해서 확인해주세요.</p>
    </div>`;

    root.querySelectorAll('[data-kind]').forEach(b => b.addEventListener('click', () => {
      filterKind = b.dataset.kind; this.mount(root, ctx);
    }));
    root.querySelectorAll('[data-open]').forEach(el => el.addEventListener('click', () => this.detail(el.dataset.open, ctx)));
    root.querySelector('[data-edit-mine]')?.addEventListener('click', () => this.editMine(root, ctx));
  },

  mineCard(p) {
    return `<div class="card" style="border-color:var(--brand)">
      <div class="card-head"><h2>${kindEmoji(p.kind)} 내 업체 — ${esc(p.name)}</h2><div class="spacer"></div>
        ${p.verified ? '<span class="chip ok">✓ 확인된 업체</span>' : '<span class="chip warn">확인 대기 중</span>'}
        <button class="btn btn-sm" data-edit-mine>정보 고치기</button></div>
      <div style="font-size:12.5px;color:var(--ink-2)">
        ${esc(kindLabel(p.kind))} · ${esc(p.region || '지역 미입력')} ${p.tel ? `· ${esc(p.tel)}` : ''}<br>
        ${p.intro ? esc(p.intro) : '<span style="color:var(--ink-3)">소개글을 적으면 디렉터리에 보여요.</span>'}
      </div>
    </div>`;
  },

  card(p) {
    return `<div class="prod" data-open="${esc(p.id)}" style="cursor:pointer">
      <div class="row"><span class="cat">${kindEmoji(p.kind)} ${esc(kindLabel(p.kind))}</span><div class="spacer"></div>
        ${p.verified ? '<span class="chip ok">✓</span>' : ''}
        ${p.reviewCount ? `<span class="stars">${'★'.repeat(Math.round(p.reviewAvg))}${'☆'.repeat(5 - Math.round(p.reviewAvg))}</span>
          <span style="font-size:11.5px;color:var(--ink-3)">${p.reviewAvg} (${p.reviewCount})</span>`
          : '<span class="chip">후기 아직</span>'}</div>
      <div class="nm">${esc(p.name)}</div>
      <div class="gd">${esc(p.intro || '소개글이 아직 없어요.')}</div>
      <div class="foot">
        <span style="font-size:12px;color:var(--ink-3)">📍 ${esc(p.region || '지역 미입력')}</span>
        <div class="spacer"></div>
        <button class="btn btn-sm">자세히</button>
      </div>
    </div>`;
  },

  async detail(id, ctx) {
    const p = partners.get(id);
    if (!p) return;
    await partners.loadReviews(id);
    const rs = partners.reviews(id);
    const me = auth.current();
    const isMine = partners.mine()?.id === id;

    const box = modal({
      title: `${kindEmoji(p.kind)} ${p.name}`, wide: true, footer: false,
      body: `
        <div class="row" style="gap:6px;margin-bottom:10px">
          <span class="chip brand">${esc(kindLabel(p.kind))}</span>
          ${p.verified ? '<span class="chip ok">✓ 확인된 업체</span>' : '<span class="chip">확인 대기 중</span>'}
          ${p.reviewCount ? `<span class="chip">★ ${p.reviewAvg} · ${p.reviewCount}개</span>` : ''}
        </div>
        <div class="tbl-wrap"><table><tbody>
          <tr><th style="width:82px">지역</th><td>${esc(p.region || '—')}</td></tr>
          <tr><th>주소</th><td>${esc(p.addr || '—')}</td></tr>
          <tr><th>전화</th><td>${p.tel ? `<a href="tel:${esc(String(p.tel).replace(/[^0-9-+]/g, ''))}"><b>${esc(p.tel)}</b></a>` : '—'}</td></tr>
          <tr><th>홈페이지</th><td>${p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener nofollow">${esc(p.url)} ↗</a>` : '—'}</td></tr>
          ${p.intro ? `<tr><th>소개</th><td style="white-space:pre-wrap">${esc(p.intro)}</td></tr>` : ''}
        </tbody></table></div>

        <div style="border-top:1px solid var(--line);margin-top:14px;padding-top:14px">
          <div class="row" style="margin-bottom:10px">
            <h4 style="font-size:13.5px;margin:0">집사님들 후기 ${rs.length}개</h4>
            <div class="spacer"></div>
            ${me && !isMine ? `<button class="btn btn-sm btn-primary" data-write-review>후기 남기기</button>` : ''}
          </div>
          ${rs.length ? rs.map(r => `
            <div class="cmt"><div class="ch">${esc(r.author)} · ${relDate(r.createdAt)}
              <span class="stars">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</span></div>
              <div class="cb">${esc(r.body)}</div>
              ${me && r.authorId === me.id ? `<button class="btn btn-sm btn-danger" style="margin-top:6px" data-delrv="${esc(r.id)}">내 후기 지우기</button>` : ''}
            </div>`).join('')
            : '<p style="font-size:13px;color:var(--ink-3)">아직 후기가 없어요. 다녀오셨다면 첫 후기를 남겨주세요!</p>'}
        </div>`,
      onSubmit: () => {}
    });

    box.querySelector('[data-write-review]')?.addEventListener('click', () => {
      const mineReview = rs.find(r => r.authorId === me.id);
      const rv = modal({
        title: `${p.name}, 어떠셨어요?`,
        body: `<div class="field"><label>별점</label>
            <div class="stars pick" data-pick>${[1, 2, 3, 4, 5].map(i => `<span data-star="${i}">${i <= (mineReview?.stars || 0) ? '★' : '☆'}</span>`).join('')}</div>
            <input type="hidden" name="stars" value="${mineReview?.stars || 0}"></div>`
          + field('다녀와 보니 어땠나요?', textareaEl('body', { value: mineReview?.body, rows: 4, required: true,
              placeholder: '어떤 일로 갔는지, 좋았던 점과 아쉬웠던 점을 적어주시면 다른 집사님들께 큰 도움이 돼요!' })),
        submitLabel: mineReview ? '후기 고치기' : '후기 남기기',
        onSubmit: f => {
          if (!+f.stars) throw new Error('별점도 같이 남겨주세요!');
          partners.review(p.id, { stars: +f.stars, body: f.body });
          toast('후기 고마워요! 🙏');
        }
      });
      rv.querySelectorAll('[data-star]').forEach(s => s.addEventListener('click', () => {
        const v = +s.dataset.star;
        rv.querySelector('input[name=stars]').value = v;
        rv.querySelectorAll('[data-star]').forEach(x => { x.textContent = +x.dataset.star <= v ? '★' : '☆'; });
      }));
    });
    box.querySelectorAll('[data-delrv]').forEach(x => x.addEventListener('click', () => {
      partners.unreview(p.id, x.dataset.delrv); toast('지웠어요.');
    }));
  },

  editMine(root, ctx) {
    const p = partners.mine();
    modal({
      title: '업체 정보 고치기', wide: true, submitLabel: '고쳤어요',
      body: `<div class="inline">
          ${field('상호명', inputEl('name', { value: p.name, required: true }))}
          ${field('업종', selectEl('kind', PARTNER_KINDS.map(k => ({ value: k.v, label: k.l })), p.kind))}</div>`
        + `<div class="inline">
          ${field('지역 (시/도)', inputEl('region', { value: p.region, placeholder: '예: 서울' }))}
          ${field('전화', inputEl('tel', { value: p.tel, placeholder: '02-1234-5678' }))}</div>`
        + field('주소', inputEl('addr', { value: p.addr }))
        + field('홈페이지', inputEl('url', { value: p.url, placeholder: 'https://…' }))
        + field('소개 (디렉터리에 보여요)', textareaEl('intro', { value: p.intro, rows: 3,
            placeholder: '진료 과목, 주력 상품, 영업시간 등을 적어주세요' })),
      onSubmit: async f => { await partners.updateMine(f); toast('업체 정보를 고쳤어요!'); }
    });
  }
};
