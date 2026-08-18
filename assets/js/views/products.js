/* 용품 리뷰 — 크롤링 데이터 + 사용자 평가 */
import { community, auth } from '../store.js';
import { esc, won, relDate, empty, modal, field, inputEl, textareaEl, toast } from '../ui.js';

let cat = '전체';
let sort = 'reviews';

export default {
  head: ctx => ({
    title: '용품 리뷰',
    sub: ctx.DB.products ? `${ctx.DB.products.items.length}개 품목 · 데이터 갱신 ${ctx.DB.products.updated}` : ''
  }),

  mount(root, ctx) {
    const P = ctx.DB.products;
    if (!P) { root.innerHTML = `<div class="card">${empty('🛒', '용품 데이터를 불러오지 못했습니다.')}</div>`; return; }

    const cats = ['전체', ...new Set(P.items.map(i => i.category))];
    let items = cat === '전체' ? P.items : P.items.filter(i => i.category === cat);
    items = [...items].sort((a, b) => {
      const sa = community.score(a.id), sb = community.score(b.id);
      if (sort === 'reviews') return (sb?.n || 0) - (sa?.n || 0) || (sb?.avg || 0) - (sa?.avg || 0);
      if (sort === 'rating') return (sb?.avg || 0) - (sa?.avg || 0);
      return String(a.name).localeCompare(String(b.name));
    });

    const requests = community.posts('request');
    const crawled = P.items.filter(i => i.source !== 'seed').length;

    root.innerHTML = `
    <div class="stack">
      <div class="alert info"><span class="ai">🔄</span><span>
        <b>가격·평점 데이터는 자동 수집으로 갱신됩니다.</b><br><span style="opacity:.85">
        GitHub Actions 크롤러가 주기적으로 <code>data/products.json</code>을 갱신합니다.
        현재 수집 완료 ${crawled}건 / 기준 정보 ${P.items.length - crawled}건.
        <b>별점은 이 사이트 사용자들이 직접 남긴 평가만</b> 반영하며, 판매처 평점과 별개로 표시됩니다.</span></span></div>

      <div class="row">
        <div class="seg">${cats.map(c => `<button class="${c === cat ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>
        <div class="spacer"></div>
        <div class="seg">
          <button class="${sort === 'reviews' ? 'on' : ''}" data-sort="reviews">리뷰 많은 순</button>
          <button class="${sort === 'rating' ? 'on' : ''}" data-sort="rating">평점순</button>
          <button class="${sort === 'name' ? 'on' : ''}" data-sort="name">이름순</button>
        </div>
      </div>

      <div class="grid g3">${items.map(p => card(p)).join('')}</div>

      <div class="card">
        <div class="card-head"><h2>🙋 리뷰 요청 게시판</h2><div class="spacer"></div>
          <button class="btn btn-sm btn-primary" data-request>+ 리뷰 요청하기</button></div>
        <p style="font-size:12.5px;color:var(--ink-3);margin:0 0 12px">
          궁금한 제품이 목록에 없거나 실사용 후기가 필요하면 요청을 남겨 주세요. 다른 보호자들이 댓글로 경험을 공유합니다.</p>
        ${requests.length ? requests.slice(0, 8).map(q => `
          <div class="item"><div class="body">
            <div class="ttl">${esc(q.title)}</div>
            <div class="meta">${esc(q.author)} · ${relDate(q.createdAt)} · 댓글 ${q.comments.length}</div>
            <div style="font-size:13px;color:var(--ink-2);margin-top:5px;white-space:pre-wrap">${esc(q.body)}</div>
          </div>
          <a class="btn btn-sm" href="#/community">답변하기</a></div>`).join('')
          : empty('🙋', '아직 리뷰 요청이 없습니다.')}
      </div>
    </div>`;

    root.querySelectorAll('[data-cat]').forEach(b => b.addEventListener('click', () => { cat = b.dataset.cat; this.mount(root, ctx); }));
    root.querySelectorAll('[data-sort]').forEach(b => b.addEventListener('click', () => { sort = b.dataset.sort; this.mount(root, ctx); }));

    root.querySelectorAll('[data-review]').forEach(b => b.addEventListener('click', () => {
      const p = P.items.find(x => x.id === b.dataset.review);
      const mine = community.reviews(p.id).find(r => r.authorId === auth.current()?.id);
      const box = modal({
        title: `${p.name} 평가`,
        body: `<div class="field"><label>별점</label>
            <div class="stars pick" data-pick>${[1, 2, 3, 4, 5].map(i => `<span data-star="${i}">${i <= (mine?.stars || 0) ? '★' : '☆'}</span>`).join('')}</div>
            <input type="hidden" name="stars" value="${mine?.stars || 0}"></div>`
          + field('사용 후기', textareaEl('body', { value: mine?.body, rows: 4, required: true, placeholder: '어떤 점이 좋았고 아쉬웠는지, 우리 아이 견종·나이와 함께 적어주시면 큰 도움이 됩니다.' })),
        submitLabel: mine ? '평가 수정' : '평가 등록',
        onSubmit: f => {
          if (!+f.stars) throw new Error('별점을 선택해 주세요.');
          community.review(p.id, { stars: +f.stars, body: f.body });
          toast('평가를 등록했습니다. 감사합니다!');
        }
      });
      box.querySelectorAll('[data-star]').forEach(s => s.addEventListener('click', () => {
        const v = +s.dataset.star;
        box.querySelector('input[name=stars]').value = v;
        box.querySelectorAll('[data-star]').forEach(x => { x.textContent = +x.dataset.star <= v ? '★' : '☆'; });
      }));
    }));

    root.querySelectorAll('[data-detail]').forEach(b => b.addEventListener('click', () => {
      const p = P.items.find(x => x.id === b.dataset.detail);
      const rs = community.reviews(p.id);
      const me = auth.current();
      modal({
        title: p.name, wide: true, footer: false,
        body: `
          <div class="row" style="gap:6px;margin-bottom:10px">
            <span class="chip brand">${esc(p.category)}</span>
            ${(p.tags || []).map(t => `<span class="chip">${esc(t)}</span>`).join('')}
          </div>
          <p style="font-size:13.5px;color:var(--ink-2);line-height:1.65;margin:0 0 14px">${esc(p.guide)}</p>
          <div class="grid g2" style="gap:12px;margin-bottom:16px">
            <div><div class="pl">👍 장점</div><ul>${(p.pros || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
            <div><div class="cl">👎 단점 · 주의</div><ul>${(p.cons || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
          </div>
          ${p.url ? `<p style="font-size:12.5px"><a href="${esc(p.url)}" target="_blank" rel="noopener nofollow">판매처에서 보기 ↗</a>
            ${p.price ? ` · 수집 가격 ${won(p.price)}` : ''}${p.extRating ? ` · 판매처 평점 ${p.extRating}` : ''}</p>` : ''}
          <div style="border-top:1px solid var(--line);padding-top:14px">
            <h4 style="font-size:13.5px;margin-bottom:10px">사용자 평가 ${rs.length}건</h4>
            ${rs.length ? rs.map(r => `
              <div class="cmt"><div class="ch">${esc(r.author)} · ${relDate(r.createdAt)}
                <span class="stars">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</span></div>
                <div class="cb">${esc(r.body)}</div>
                ${me && r.authorId === me.id ? `<button class="btn btn-sm btn-danger" style="margin-top:6px" data-delrv="${esc(r.id)}">내 평가 삭제</button>` : ''}
              </div>`).join('')
              : '<p style="font-size:13px;color:var(--ink-3)">아직 평가가 없습니다. 첫 후기를 남겨 주세요.</p>'}
          </div>`,
        onSubmit: () => {}
      });
      document.querySelectorAll('[data-delrv]').forEach(x => x.addEventListener('click', () => {
        community.unreview(p.id, x.dataset.delrv); toast('삭제했습니다.');
      }));
    }));

    root.querySelector('[data-request]')?.addEventListener('click', () => modal({
      title: '리뷰 요청하기',
      body: field('요청 제목', inputEl('title', { required: true, placeholder: '예: 슬개골 약한 소형견용 계단, 어떤 게 좋나요?' }))
        + field('내용', textareaEl('body', { required: true, rows: 4, placeholder: '견종·나이·상황을 함께 적어주시면 더 정확한 답변을 받을 수 있습니다.' })),
      onSubmit: f => { community.post({ kind: 'request', ...f }); toast('요청을 등록했습니다.'); }
    }));
  }
};

function card(p) {
  const s = community.score(p.id);
  return `<div class="prod">
    <div class="row"><span class="cat">${esc(p.category)}</span><div class="spacer"></div>
      ${s ? `<span class="stars">${'★'.repeat(Math.round(s.avg))}${'☆'.repeat(5 - Math.round(s.avg))}</span>
        <span style="font-size:11.5px;color:var(--ink-3)">${s.avg.toFixed(1)} (${s.n})</span>`
        : '<span class="chip">평가 없음</span>'}</div>
    <div class="nm">${esc(p.name)}</div>
    <div class="gd">${esc(p.guide)}</div>
    <div class="tags">${(p.tags || []).slice(0, 4).map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>
    <div class="foot">
      <span style="font-size:12px;color:var(--ink-3)">${p.price ? won(p.price) : '가격 수집 예정'}</span>
      <div class="spacer"></div>
      <button class="btn btn-sm" data-detail="${esc(p.id)}">자세히</button>
      <button class="btn btn-sm btn-primary" data-review="${esc(p.id)}">평가하기</button>
    </div>
  </div>`;
}
