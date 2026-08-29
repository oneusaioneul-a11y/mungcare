/* app.js — 애플리케이션 셸, 라우터, 부트스트랩 */
import { auth, dogs, col, settings, subscribe, onError, initAuth, isCloudMode, isReady } from './store.js';
import { esc, toast, initials } from './ui.js';
import * as H from './health.js';
import { ICONS, dogIcon, iconKeyForBreed } from './icons.js';

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
import adopt from './views/adopt.js';
import partnersView from './views/partners.js';
import privacyView from './views/privacy.js';
import settingsView from './views/settings.js';

export const DB = { breeds: null, vaccines: null, products: null };

const ROUTES = {
  '/': dashboard, '/profile': profile, '/diet': diet, '/recipes': recipes,
  '/meds': meds, '/walk': walk, '/vaccine': vaccine, '/medical': medical,
  '/allergy': allergy, '/risk': risk, '/products': products,
  '/community': community, '/adopt': adopt, '/partners': partnersView,
  '/privacy': privacyView, '/settings': settingsView
};

const NAV = [
  { group: '우리 아이' },
  { to: '/', ico: ICONS.home, label: '오늘 하루', alertKey: true },
  { to: '/profile', ico: ICONS.dog, label: '아이 프로필' },
  { to: '/risk', ico: ICONS.stethos, label: '이맘때 조심할 것' },
  { group: '매일매일' },
  { to: '/diet', ico: ICONS.bowl, label: '밥 기록' },
  { to: '/recipes', ico: ICONS.chef, label: '화식 레시피' },
  { to: '/meds', ico: ICONS.pill, label: '약 챙기기' },
  { to: '/walk', ico: ICONS.paw, label: '산책 기록' },
  { group: '병원 · 건강' },
  { to: '/vaccine', ico: ICONS.syringe, label: '접종 · 구충' },
  { to: '/medical', ico: ICONS.hospital, label: '진료 기록' },
  { to: '/allergy', ico: ICONS.alert, label: '알러지' },
  { group: '같이 나눠요' },
  { to: '/products', ico: ICONS.cart, label: '용품 리뷰' },
  { to: '/community', ico: ICONS.chat, label: '수다방' },
  { to: '/adopt', ico: ICONS.heart, label: '유기견 입양' },
  { to: '/partners', ico: ICONS.hospital, label: '동물병원 · 용품점' },
  { group: '' },
  { to: '/settings', ico: ICONS.gear, label: '설정' }
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
let recoveryMode = false;
export const setRecovery = v => { recoveryMode = v; };

export function navigate(hash) { location.hash = hash; }

export function render() {
  if (rendering) return; rendering = true;
  try {
    paint();
  } catch (err) {
    console.error('화면을 그리는 중 오류가 났어요.', err);
    showFatal(err);
  } finally { rendering = false; }
}

/** 렌더가 실패해도 흰 화면/무한 로딩으로 남지 않도록 오류를 화면에 드러냅니다. */
function showFatal(err) {
  const root = app();
  if (!root) return;
  root.innerHTML = `
    <div style="min-height:100vh;display:grid;place-items:center;padding:24px">
      <div style="max-width:620px;background:var(--surface,#fff);border:1px solid var(--line,#e6e0d6);
                  border-radius:14px;padding:22px 24px">
        <div style="font-size:30px;margin-bottom:8px">⚠️</div>
        <h1 style="margin:0 0 8px;font-size:17px">화면을 못 그렸어요 😥</h1>
        <p style="margin:0 0 14px;font-size:13.5px;line-height:1.7;color:var(--ink-2,#5c5348)">
          아래 내용을 알려주시면 바로 고칠게요. 그동안 쌓은 기록은 그대로 있으니 걱정 마세요!</p>
        <pre style="margin:0 0 14px;background:var(--surface-2,#f2efe9);border-radius:9px;padding:12px 14px;
                    font-size:12.5px;overflow-x:auto;white-space:pre-wrap">${esc(err?.stack || err?.message || String(err))}</pre>
        <button class="btn" onclick="location.hash='#/';location.reload()">처음부터 다시 열기</button>
      </div>
    </div>`;
}

function paint() {
  const root = app();
  const user = auth.current();
  applyTheme();

  if (!user) { authView.mount(root, { onDone: render, recovery: recoveryMode }); return; }

  const path = (location.hash.replace(/^#/, '') || '/').split('?')[0];
  const view = ROUTES[path] || ROUTES['/'];
  const ctx = context();
  const urgent = ctx.alerts.filter(a => a.level === 'bad').length;

  const head = view.head ? view.head(ctx) : { title: view.title, sub: view.sub };

  root.innerHTML = `
  <div class="app">
    <aside class="sidebar" id="sidebar">
      <div class="brand">
        <div class="brand-mark">${dogIcon('bichon', 34)}</div>
        <div><div class="brand-name">멍케어</div><div class="brand-sub">우리 아이 건강 수첩</div></div>
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
        <button class="btn btn-sm btn-block" data-logout>나가기</button>
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

  root.querySelector('[data-logout]')?.addEventListener('click', async () => {
    await auth.logout(); authView.reset(); location.hash = '#/'; render();
  });
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
  if (!ctx.dogs.length) return `<a href="#/profile" class="btn btn-primary btn-sm btn-block">우리 아이 소개하기</a>`;
  return `<div class="dogpick">
    <div class="dogav sm">${dogIcon(ctx.dog?.icon || iconKeyForBreed(ctx.dog?.breed), 30)}</div>
    <select data-dogpick>
      ${ctx.dogs.map(d => `<option value="${esc(d.id)}" ${d.id === ctx.dog?.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}
      <option value="__new">+ 다른 아이 추가</option>
    </select>
  </div>`;
}

function applyTheme() {
  let fallback = 'light';
  try { fallback = localStorage.getItem('bc.theme') || 'light'; } catch { /* 저장소 차단 환경 */ }
  const user = auth.current();
  const t = user ? (settings.get('theme') || 'light') : fallback;
  /* 로그아웃 후의 인증 화면도 마지막 테마를 따르도록 남겨둡니다 */
  if (user && t !== fallback) { try { localStorage.setItem('bc.theme', t); } catch { /* 저장소 차단 환경 */ } }
  document.documentElement.setAttribute('data-theme', t);
}

/* ── 부트 ─────────────────────────────────────────────── */
async function loadJSON(path) {
  try { const r = await fetch(path, { cache: 'no-cache' }); if (!r.ok) throw new Error(r.status); return await r.json(); }
  catch (e) { console.warn('데이터 로드 실패:', path, e); return null; }
}

(async function boot() {
  try {
    onError(err => toast(err.message || '서버에 저장하지 못했어요.', 4000));

    const [[b, v, p], sessionState] = await Promise.all([
      Promise.all([loadJSON('data/breeds.json'), loadJSON('data/vaccines.json'), loadJSON('data/products.json')]),
      initAuth().catch(err => { console.warn('세션 복원 실패', err); return null; })
    ]);
    DB.breeds = b; DB.vaccines = v; DB.products = p;
    if (sessionState === 'recovery') recoveryMode = true;

    subscribe(() => render());
    window.addEventListener('hashchange', render);
    render();
    if (!b || !v) toast('기준 정보를 못 받아왔어요. 새로고침 한 번만 해주세요!', 4000);
  } catch (err) {
    console.error('앱을 시작하지 못했어요.', err);
    showFatal(err);
  }
})();
