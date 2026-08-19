/* 용품 리뷰 — 크롤링 데이터 + 사용자 평가 */
import { community, auth } from '../store.js';
import { esc, won, relDate, empty, modal, field, inputEl, textareaEl, toast } from '../ui.js';
import { ICONS } from '../icons.js';

let cat = '전체';
let sort = 'reviews';

export default {
  head: ctx => ({
    title: '용품 이야기',
    sub: ctx.DB.products ? `${ctx.DB.products.items.length}가지 · ${ctx.DB.products.updated}에 새로 받아왔어요` : ''
  }),

  mount(root, ctx) {
    const P = ctx.DB.products;
    if (!P) { root.innerHTML = `<div class="card">${empty(ICONS.cart, '용품 정보를 못 받아왔어요. 새로고침 해주실래요?')}</div>`; return; }

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
        <b>가격이랑 평점은 자동으로 받아와요.</b><br><span style="opacity:.85">
        지금은 ${crawled}가지가 수집됐고, ${P.items.length - crawled}가지는 고르는 기준만 정리해뒀어요.
        <b>별점은 여기 계신 집사님들이 직접 남긴 것만</b> 보여드려요. 쇼핑몰 평점이랑 섞지 않았어요!</span></span></div>

      <div class="row">
        <div class="seg">${cats.map(c => `<button class="${c === cat ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>
        <div class="spacer"></div>
        <div class="seg">
          <button class="${sort === 'reviews' ? 'on' : ''}" data-sort="reviews">후기 많은 순</button>
          <button class="${sort === 'rating' ? 'on' : ''}" data-sort="rating">별점 높은 순</button>
          <button class="${sort === 'name' ? 'on' : ''}" data-sort="name">이름순</button>
        </div>
      </div>

      <div class="grid g3">${items.map(p => card(p)).join('')}</div>

      <div class="card">
        <div class="card-head"><h2>🙋 이거 써보신 분?</h2><div class="spacer"></div>
          <button class="btn btn-sm btn-primary" data-request>+ 물어보기</button></div>
        <p style="font-size:12.5px;color:var(--ink-3);margin:0 0 12px">
          찾는 제품이 없거나 실제로 써본 얘기가 궁금하면 남겨주세요. 다른 집사님들이 댓글로 알려주실 거예요.</p>
        ${requests.length ? requests.slice(0, 8).map(q => `
          <div class="item"><div class="body">
            <div class="ttl">${esc(q.title)}</div>
            <div class="meta">${esc(q.author)} · ${relDate(q.createdAt)} · 댓글 ${q.comments.length}</div>
            <div style="font-size:13px;color:var(--ink-2);margin-top:5px;white-space:pre-wrap">${esc(q.body)}</div>
          </div>
          <a class="btn btn-sm" href="#/community">답 달러 가기</a></div>`).join('')
          : empty(ICONS.chat, '아직 올라온 요청이 없어요.')}
      </div>
    </div>`;

    root.querySelectorAll('[data-cat]').forEach(b => b.addEventListener('click', () => { cat = b.dataset.cat; this.mount(root, ctx); }));
    root.querySelectorAll('[data-sort]').forEach(b => b.addEventListener('click', () => { sort = b.dataset.sort; this.mount(root, ctx); }));

    root.querySelectorAll('[data-review]').forEach(b => b.addEventListener('click', () => {
      const p = P.items.find(x => x.id === b.dataset.review);
      const mine = community.reviews(p.id).find(r => r.authorId === auth.current()?.id);
      const box = modal({
        title: `${p.name}, 어떠셨어요?`,
        body: `<div class="field"><label>별점</label>
            <div class="stars pick" data-pick>${[1, 2, 3, 4, 5].map(i => `<span data-star="${i}">${i <= (mine?.stars || 0) ? '★' : '☆'}</span>`).join('')}</div>
            <input type="hidden" name="stars" value="${mine?.stars || 0}"></div>`
          + field('써보니 어떠셨나요?', textareaEl('body', { value: mine?.body, rows: 4, required: true, placeholder: '좋았던 점, 아쉬웠던 점을 우리 아이 견종·나이랑 같이 적어주시면 다른 분들께 큰 도움이 돼요!' })),
        submitLabel: mine ? '후기 고치기' : '후기 남기기',
        onSubmit: f => {
          if (!+f.stars) throw new Error('별점도 같이 남겨주세요!');
          community.review(p.id, { stars: +f.stars, body: f.body });
          toast('후기 고마워요! 다른 집사님들께 큰 도움이 돼요 🙏');
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
            <div><div class="pl">👍 좋은 점</div><ul>${(p.pros || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
            <div><div class="cl">👎 아쉬운 점</div><ul>${(p.cons || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
          </div>
          ${p.url ? `<p style="font-size:12.5px"><a href="${esc(p.url)}" target="_blank" rel="noopener nofollow">사러 가기 ↗</a>
            ${p.price ? ` · ${won(p.price)}` : ''}${p.extRating ? ` · 쇼핑몰 평점 ${p.extRating}` : ''}</p>` : ''}
          <div style="border-top:1px solid var(--line);padding-top:14px">
            <h4 style="font-size:13.5px;margin-bottom:10px">집사님들 후기 ${rs.length}개</h4>
            ${rs.length ? rs.map(r => `
              <div class="cmt"><div class="ch">${esc(r.author)} · ${relDate(r.createdAt)}
                <span class="stars">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</span></div>
                <div class="cb">${esc(r.body)}</div>
                ${me && r.authorId === me.id ? `<button class="btn btn-sm btn-danger" style="margin-top:6px" data-delrv="${esc(r.id)}">내 후기 지우기</button>` : ''}
              </div>`).join('')
              : '<p style="font-size:13px;color:var(--ink-3)">아직 후기가 없어요. 첫 번째로 남겨주실래요?</p>'}
          </div>`,
        onSubmit: () => {}
      });
      document.querySelectorAll('[data-delrv]').forEach(x => x.addEventListener('click', () => {
        community.unreview(p.id, x.dataset.delrv); toast('지웠어요.');
      }));
    }));

    root.querySelector('[data-request]')?.addEventListener('click', () => modal({
      title: '이거 써보신 분 계세요?',
      body: field('뭐가 궁금하세요?', inputEl('title', { required: true, placeholder: '예: 슬개골 약한 아이용 계단, 어떤 게 좋을까요?' }))
        + field('자세히 알려주세요', textareaEl('body', { required: true, rows: 4, placeholder: '견종이랑 나이, 어떤 상황인지 같이 적어주시면 더 정확한 답을 받으실 수 있어요!' })),
      onSubmit: f => { community.post({ kind: 'request', ...f }); toast('요청 올렸어요! 곧 답이 달릴 거예요'); }
    }));
  }
};

function card(p) {
  const s = community.score(p.id);
  return `<div class="prod">
    <div class="row"><span class="cat">${esc(p.category)}</span><div class="spacer"></div>
      ${s ? `<span class="stars">${'★'.repeat(Math.round(s.avg))}${'☆'.repeat(5 - Math.round(s.avg))}</span>
        <span style="font-size:11.5px;color:var(--ink-3)">${s.avg.toFixed(1)} (${s.n})</span>`
        : '<span class="chip">후기 아직</span>'}</div>
    <div class="nm">${esc(p.name)}</div>
    <div class="gd">${esc(p.guide)}</div>
    <div class="tags">${(p.tags || []).slice(0, 4).map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>
    <div class="foot">
      <span style="font-size:12px;color:var(--ink-3)">${p.price ? won(p.price) : '가격은 곧 받아올게요'}</span>
      <div class="spacer"></div>
      <button class="btn btn-sm" data-detail="${esc(p.id)}">더 볼래요</button>
      <button class="btn btn-sm btn-primary" data-review="${esc(p.id)}">후기 남기기</button>
    </div>
  </div>`;
}
