/* app.js — 애플리케이션 셸, 라우터, 부트스트랩 */
import { auth, dogs, col, settings, subscribe } from './store.js';
import { esc, toast, initials } from './ui.js';
import * as H from './health.js';

import authView from './views/auth.js';
import dashboard from './views/dashboard.js';
import profile from './views/profile.js';
import diet from './views/diet.js';
import recipes from './views/recipes.js';
import meds from './views/meds.js';
import walk from './views/walk.js';
import vaccine from './views/vaccine.js';
import medical from './views/medical.js';
import allergy from './views/allergy.js';
import risk from './views/risk.js';
import products from './views/products.js';
import community from './views/community.js';
import settingsView from './views/settings.js';

export const DB = { breeds: null, vaccines: null, products: null };

const ROUTES = {
  '/': dashboard, '/profile': profile, '/diet': diet, '/recipes': recipes,
  '/meds': meds, '/walk': walk, '/vaccine': vaccine, '/medical': medical,
  '/allergy': allergy, '/risk': risk, '/products': products,
  '/community': community, '/settings': settingsView
};

const NAV = [
  { group: '건강 관리' },
  { to: '/', ico: '🏠', label: '대시보드' },
  { to: '/profile', ico: '🐶', label: '반려견 프로필' },
  { to: '/risk', ico: '🩺', label: '견종·연령 위험 알림', alertKey: true },
  { group: '일상 기록' },
  { to: '/diet', ico: '🍚', label: '식단 관리' },
  { to: '/recipes', ico: '👩‍🍳', label: '화식 레시피' },
  { to: '/meds', ico: '💊', label: '약 관리' },
  { to: '/walk', ico: '🐾', label: '산책 관리' },
  { group: '의료 기록' },
  { to: '/vaccine', ico: '💉', label: '예방접종 · 구충' },
  { to: '/medical', ico: '🏥', label: '진료 기록' },
  { to: '/allergy', ico: '⚠️', label: '알러지' },
  { group: '커뮤니티' },
  { to: '/products', ico: '🛒', label: '용품 리뷰' },
  { to: '/community', ico: '💬', label: '이야기 나눔' },
  { group: '' },
  { to: '/settings', ico: '⚙️', label: '설정' }
];

/* ── 컨텍스트 ─────────────────────────────────────────── */
export function context() {
  const dog = dogs.active();
  const c = name => col(name, dog?.id);
  const ctx = {
    DB, dog, dogs: dogs.all(), user: auth.current(),
    meals: c('meals'), meds: c('meds'), walks: c('walks'), vaccines: c('vaccines'),
    medical: c('medical'), allergies: c('allergies'), recipes: c('recipes'), weights: c('weights')
  };
  if (dog && DB.vaccines) {
    const vrecs = ctx.vaccines.raw();
    ctx.vaxPlan = H.vaccinePlan(dog, vrecs, DB.vaccines);
    ctx.prevPlan = H.preventivePlan(vrecs, DB.vaccines);
    ctx.risk = DB.breeds ? H.riskList(DB.breeds, dog) : null;
    ctx.alerts = H.buildAlerts({
      dog, vax: ctx.vaxPlan, prev: ctx.prevPlan, meds: ctx.meds.raw(),
      weights: ctx.weights.raw(), allergies: ctx.allergies.raw(), walks: ctx.walks.raw()
    });
  } else {
    ctx.vaxPlan = []; ctx.prevPlan = []; ctx.risk = null; ctx.alerts = [];
  }
  return ctx;
}

/* ── 렌더 ─────────────────────────────────────────────── */
const app = () => document.getElementById('app');
let rendering = false;

export function navigate(hash) { location.hash = hash; }

export function render() {
  if (rendering) return; rendering = true;
  try { paint(); } finally { rendering = false; }
}

function paint() {
  const root = app();
  const user = auth.current();
  applyTheme();

  if (!user) { authView.mount(root, { onDone: render }); return; }

  const path = (location.hash.replace(/^#/, '') || '/').split('?')[0];
  const view = ROUTES[path] || ROUTES['/'];
  const ctx = context();
  const urgent = ctx.alerts.filter(a => a.level === 'bad').length;

  const head = view.head ? view.head(ctx) : { title: view.title, sub: view.sub };

  root.innerHTML = `
  <div class="app">
    <aside class="sidebar" id="sidebar">
      <div class="brand">
        <div class="brand-mark">🐕</div>
        <div><div class="brand-name">멍케어</div><div class="brand-sub">반려견 통합 건강 관리</div></div>
      </div>
      ${dogSwitcher(ctx)}
      <nav class="nav">
        ${NAV.map(n => n.group !== undefined
          ? (n.group ? `<div class="nav-group">${esc(n.group)}</div>` : '<div style="height:10px"></div>')
          : `<a href="#${n.to}" class="${path === n.to ? 'active' : ''}">
               <span class="ico">${n.ico}</span>${esc(n.label)}
               ${n.alertKey && urgent ? `<span class="badge">${urgent}</span>` : ''}
             </a>`).join('')}
      </nav>
      <div class="side-foot">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <div class="avatar">${esc(initials(user.nick))}</div>
          <div style="min-width:0"><div style="font-weight:600;font-size:12.5px;color:var(--ink);overflow:hidden;text-overflow:ellipsis">${esc(user.nick)}</div>
          <div style="font-size:11px;overflow:hidden;text-overflow:ellipsis">${esc(user.email)}</div></div>
        </div>
        <button class="btn btn-sm btn-block" data-logout>로그아웃</button>
      </div>
    </aside>

    <div class="main">
      <header class="topbar">
        <button class="btn btn-ghost btn-sm menu-btn" data-menu>☰</button>
        <div><h1>${esc(head.title || '')}</h1>${head.sub ? `<div class="sub">${esc(head.sub)}</div>` : ''}</div>
        <div class="spacer"></div>
        <button class="btn btn-sm" data-theme-toggle title="화면 모드">${settings.get('theme') === 'dark' ? '☀️' : '🌙'}</button>
      </header>
      <div class="content" id="viewroot"></div>
    </div>
  </div>`;

  const vr = root.querySelector('#viewroot');
  view.mount(vr, ctx);

  root.querySelector('[data-logout]')?.addEventListener('click', () => { auth.logout(); location.hash = '#/'; render(); });
  root.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
    settings.set('theme', settings.get('theme') === 'dark' ? 'light' : 'dark');
  });
  root.querySelector('[data-menu]')?.addEventListener('click', () => {
    const sb = root.querySelector('#sidebar'); sb.classList.toggle('open');
    if (sb.classList.contains('open')) {
      const scrim = document.createElement('div');
      scrim.className = 'scrim';
      scrim.onclick = () => { sb.classList.remove('open'); scrim.remove(); };
      root.querySelector('.app').appendChild(scrim);
    } else root.querySelector('.scrim')?.remove();
  });
  root.querySelector('[data-dogpick]')?.addEventListener('change', e => {
    if (e.target.value === '__new') { location.hash = '#/profile'; setTimeout(() => document.querySelector('[data-add-dog]')?.click(), 60); render(); }
    else { dogs.setActive(e.target.value); }
  });
  root.querySelectorAll('.nav a').forEach(a => a.addEventListener('click', () => {
    root.querySelector('#sidebar')?.classList.remove('open'); root.querySelector('.scrim')?.remove();
  }));
}

function dogSwitcher(ctx) {
  if (!ctx.dogs.length) return `<a href="#/profile" class="btn btn-primary btn-sm btn-block">🐾 반려견 등록하기</a>`;
  return `<div class="dogpick">
    <div class="av">${ctx.dog?.emoji || '🐶'}</div>
    <select data-dogpick>
      ${ctx.dogs.map(d => `<option value="${esc(d.id)}" ${d.id === ctx.dog?.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}
      <option value="__new">+ 새 반려견 등록</option>
    </select>
  </div>`;
}

function applyTheme() {
  const t = auth.current() ? (settings.get('theme') || 'light') : (localStorage.getItem('bc.theme') || 'light');
  document.documentElement.setAttribute('data-theme', t);
}

/* ── 부트 ─────────────────────────────────────────────── */
async function loadJSON(path) {
  try { const r = await fetch(path, { cache: 'no-cache' }); if (!r.ok) throw new Error(r.status); return await r.json(); }
  catch (e) { console.warn('데이터 로드 실패:', path, e); return null; }
}

(async function boot() {
  const [b, v, p] = await Promise.all([
    loadJSON('data/breeds.json'), loadJSON('data/vaccines.json'), loadJSON('data/products.json')
  ]);
  DB.breeds = b; DB.vaccines = v; DB.products = p;
  if (!b || !v) toast('기준 데이터를 불러오지 못했습니다. 새로고침해 주세요.', 4000);
  subscribe(() => render());
  window.addEventListener('hashchange', render);
  render();
})();
