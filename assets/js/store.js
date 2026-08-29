/* store.js — 데이터 계층
 *
 * 화면 코드는 여기만 통해 읽고 씁니다. 두 가지 모드로 동작해요.
 *
 *   cloud  — config.js 에 Supabase 정보가 있으면. 정식 회원가입(이메일 인증·비밀번호 재설정),
 *            서버 저장, 기기 간 동기화. 메모리에 사본을 두고 화면은 예전처럼 동기적으로 읽습니다.
 *   local  — 설정이 비어 있으면. 이 브라우저에만 저장하는 예전 방식.
 *
 * 읽기는 항상 즉시(메모리), 쓰기는 화면에 먼저 반영하고 서버에는 뒤이어 보냅니다.
 */
import { isCloud } from './config.js';
import * as C from './drivers/cloud.js';

const KEY = 'mungcare.v2';
const PENDING_KEY = 'mungcare.pending';   // 이메일 인증 대기 중 잠시 보관할 동의·업체 정보
const listeners = new Set();
const errorHandlers = new Set();

export const MODE = isCloud() ? 'cloud' : 'local';
export const isCloudMode = () => MODE === 'cloud';

/* 개인정보처리방침 판번호 — 문구를 고치면 반드시 올리고, 동의도 다시 받으세요 */
export const PRIVACY_VERSION = '1.0 (2026-08-29)';

const blank = () => ({
  users: {}, session: null, data: {},
  community: { posts: [], reviews: {}, chat: [] },
  partners: { list: [], reviews: {} },
  meta: { createdAt: new Date().toISOString() }
});

let state = load();
let cloudUser = null;          // {id, email, nick}
let ready = MODE === 'local';  // 클라우드는 세션 복원이 끝나야 true

export const isReady = () => ready;

function load() {
  if (MODE === 'cloud') return blank();
  try {
    const raw = localStorage.getItem(KEY);
    const s = raw ? { ...blank(), ...JSON.parse(raw) } : blank();
    // 예전 버전 데이터에 새 영역 기본값을 채웁니다
    s.community = { posts: [], reviews: {}, chat: [], ...s.community };
    s.partners = { list: [], reviews: {}, ...s.partners };
    return s;
  } catch { return blank(); }
}

function persist() {
  if (MODE === 'local') {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch { fail(new Error('저장 공간이 꽉 찼어요. [설정 → 파일로 저장하기]로 백업하신 뒤 정리해주세요!')); }
  }
  listeners.forEach(fn => fn(state));
}

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function onError(fn) { errorHandlers.add(fn); return () => errorHandlers.delete(fn); }
function fail(err) { errorHandlers.forEach(fn => fn(err)); console.warn('[store]', err); }

/** 서버 쓰기를 화면과 분리해서 보냅니다. 실패하면 알림만 띄우고 화면은 유지합니다.
 *  반드시 함수를 넘기세요 — 로컬 모드에서 서버 호출이 아예 실행되지 않아야 합니다. */
function push(makePromise) {
  if (MODE !== 'cloud') return;
  try { Promise.resolve(makePromise()).catch(err => fail(err)); }
  catch (err) { fail(err); }
}

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => {
        const r = Math.random() * 16 | 0;
        return (ch === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      }));

/* ── 로컬 모드 비밀번호 해싱 (PBKDF2) ─────────────────────────── */
const ITER = 120000;
const enc = new TextEncoder();
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
async function hashPw(password, saltB64, iter = ITER) {
  const salt = Uint8Array.from(atob(saltB64), ch => ch.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, key, 256);
  return b64(bits);
}

/* ── 개인정보 동의 ────────────────────────────────────────────── */
function requireConsent(consent) {
  if (!consent?.age14) throw new Error('만 14세 이상만 가입할 수 있어요.');
  if (!consent?.privacy) throw new Error('개인정보 수집·이용 동의가 필요해요.');
}
const consentDocs = (partner = false) => ['privacy', 'age14', ...(partner ? ['partner_terms'] : [])];
const consentRows = (userId, partner = false) =>
  consentDocs(partner).map(doc => ({ user_id: userId, doc, version: PRIVACY_VERSION }));
const localConsents = (partner = false) =>
  consentDocs(partner).map(doc => ({ doc, version: PRIVACY_VERSION, agreedAt: new Date().toISOString() }));

function stashPending(data) { try { localStorage.setItem(PENDING_KEY, JSON.stringify(data)); } catch { /* 무시 */ } }

/* ── 인증 ─────────────────────────────────────────────────────── */
export const auth = {
  current() {
    if (MODE === 'cloud') return cloudUser;
    if (!state.session) return null;
    return Object.values(state.users).find(u => u.id === state.session) || null;
  },

  /** 내 동의 이력 (로컬은 즉시, 클라우드는 hydrate 때 채워둔 사본) */
  consents() {
    const u = this.current();
    return (MODE === 'cloud' ? cloudUser?.consents : u?.consents) || [];
  },

  /** @returns {{needsConfirm:boolean}} */
  async signup({ email, password, nick, consent }) {
    email = String(email || '').trim().toLowerCase();
    nick = String(nick || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('이메일 주소를 다시 한 번 봐주세요!');
    if (!nick) throw new Error('뭐라고 불러드릴까요? 닉네임을 적어주세요');
    if (nick.length > 20) throw new Error('닉네임은 20자까지만 가능해요');
    if (String(password).length < 8) throw new Error('비밀번호는 8자 이상으로 해주세요');
    requireConsent(consent);

    if (MODE === 'cloud') {
      const { needsConfirm, user } = await C.cloudAuth.signUp({ email, password, nick });
      if (!needsConfirm && user) {
        await C.addConsents(consentRows(user.id)).catch(err => fail(err));
        await hydrate();
      } else {
        // 인증 전에는 RLS 때문에 못 쓰므로, 첫 로그인 때 동의 이력을 넣습니다
        stashPending({ consent: true });
      }
      return { needsConfirm };
    }

    if (state.users[email]) throw new Error('이미 가입된 이메일이에요');
    const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
    const id = uid();
    state.users[email] = { id, email, nick, salt, hash: await hashPw(password, salt), iter: ITER,
      consents: localConsents(), createdAt: new Date().toISOString() };
    state.data[id] = { dogs: [], col: {}, settings: { theme: 'light' } };
    state.session = id;
    persist();
    return { needsConfirm: false };
  },

  /** 사업자(동물병원·용품점) 가입 — 계정은 공용 인증, 업체 정보는 partners 영역에 분리 저장 */
  async signupPartner({ email, password, business, consent }) {
    email = String(email || '').trim().toLowerCase();
    const biz = {
      kind: business?.kind || 'etc',
      name: String(business?.name || '').trim(),
      bizNo: String(business?.bizNo || '').trim(),
      tel: String(business?.tel || '').trim() || null,
      region: String(business?.region || '').trim() || null,
      addr: String(business?.addr || '').trim() || null,
      url: String(business?.url || '').trim() || null,
      intro: String(business?.intro || '').trim() || null
    };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('이메일 주소를 다시 한 번 봐주세요!');
    if (String(password).length < 8) throw new Error('비밀번호는 8자 이상으로 해주세요');
    if (!biz.name) throw new Error('상호명을 적어주세요!');
    if (biz.name.length > 60) throw new Error('상호명은 60자까지만 가능해요');
    if (!/^[0-9]{3}-?[0-9]{2}-?[0-9]{5}$/.test(biz.bizNo)) throw new Error('사업자등록번호 10자리를 확인해주세요 (예: 123-45-67890)');
    requireConsent(consent);
    if (!consent?.partnerTerms) throw new Error('파트너 운영 안내 동의가 필요해요.');
    const nick = biz.name.slice(0, 20);

    if (MODE === 'cloud') {
      const { needsConfirm, user } = await C.cloudAuth.signUp({ email, password, nick });
      if (!needsConfirm && user) {
        await C.addConsents(consentRows(user.id, true)).catch(err => fail(err));
        await C.upsertPartner({ id: user.id, ...biz });
        await hydrate();
      } else {
        stashPending({ consent: true, partner: true, business: biz });
      }
      return { needsConfirm };
    }

    if (state.users[email]) throw new Error('이미 가입된 이메일이에요');
    const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
    const id = uid();
    state.users[email] = { id, email, nick, role: 'partner', salt, hash: await hashPw(password, salt), iter: ITER,
      consents: localConsents(true), createdAt: new Date().toISOString() };
    state.data[id] = { dogs: [], col: {}, settings: { theme: 'light' } };
    state.partners.list.unshift({ id, ...biz, verified: false, reviewCount: 0, reviewAvg: null,
      createdAt: new Date().toISOString() });
    state.session = id;
    persist();
    return { needsConfirm: false };
  },

  async login({ email, password }) {
    email = String(email || '').trim().toLowerCase();
    if (MODE === 'cloud') {
      await C.cloudAuth.signIn({ email, password });
      await hydrate();
      return cloudUser;
    }
    const u = state.users[email];
    if (!u) throw new Error('이메일이나 비밀번호가 맞지 않아요');
    if (await hashPw(password, u.salt, u.iter || ITER) !== u.hash) throw new Error('이메일이나 비밀번호가 맞지 않아요');
    state.session = u.id;
    state.data[u.id] ||= { dogs: [], col: {}, settings: {} };
    persist();
    return u;
  },

  async logout() {
    if (MODE === 'cloud') {
      await C.cloudAuth.signOut().catch(() => {});
      cloudUser = null;
      state = blank();
    } else {
      state.session = null;
    }
    persist();
  },

  async updateNick(nick) {
    nick = String(nick || '').trim();
    if (!nick) throw new Error('닉네임을 적어주세요!');
    if (nick.length > 20) throw new Error('닉네임은 20자까지만 가능해요');
    if (MODE === 'cloud') {
      await C.updateNick(cloudUser.id, nick);
      cloudUser = { ...cloudUser, nick };
    } else {
      const u = this.current();
      if (!u) throw new Error('먼저 로그인해주세요!');
      u.nick = nick;
    }
    persist();
  },

  async changePassword(oldPw, newPw) {
    if (String(newPw).length < 8) throw new Error('새 비밀번호는 8자 이상으로 해주세요');
    if (MODE === 'cloud') {
      // 현재 비밀번호가 맞는지 재로그인으로 확인합니다
      await C.cloudAuth.signIn({ email: cloudUser.email, password: oldPw })
        .catch(() => { throw new Error('지금 비밀번호가 맞지 않아요'); });
      await C.cloudAuth.updatePassword(newPw);
      return;
    }
    const u = this.current();
    if (!u) throw new Error('먼저 로그인해주세요!');
    if (await hashPw(oldPw, u.salt, u.iter || ITER) !== u.hash) throw new Error('지금 비밀번호가 맞지 않아요');
    u.salt = b64(crypto.getRandomValues(new Uint8Array(16)));
    u.hash = await hashPw(newPw, u.salt);
    u.iter = ITER;
    persist();
  },

  /** 이메일 인증 메일 다시 보내기 (클라우드 모드 전용) */
  async resendConfirm(email) {
    if (MODE !== 'cloud') throw new Error('서버 연결이 필요한 기능이에요.');
    await C.cloudAuth.resendConfirm(String(email).trim().toLowerCase());
  },

  /** 비밀번호 재설정 메일 보내기 (클라우드 모드 전용) */
  async sendReset(email) {
    if (MODE !== 'cloud') throw new Error('서버 연결이 필요한 기능이에요.');
    await C.cloudAuth.sendReset(String(email).trim().toLowerCase());
  },

  /** 재설정 링크로 들어온 뒤 새 비밀번호 지정 */
  async setNewPassword(pw) {
    if (MODE !== 'cloud') throw new Error('서버 연결이 필요한 기능이에요.');
    if (String(pw).length < 8) throw new Error('비밀번호는 8자 이상으로 해주세요');
    await C.cloudAuth.updatePassword(pw);
  }
};

/* ── 세션 복원 · 데이터 로드 ──────────────────────────────────── */
async function hydrate() {
  const session = await C.cloudAuth.session();
  if (!session) { cloudUser = null; state = blank(); ready = true; persist(); return; }

  const u = session.user;

  // 이메일 인증 대기 중에 못 넣었던 동의·업체 정보를 이제 넣습니다
  try {
    const pending = JSON.parse(localStorage.getItem(PENDING_KEY) || 'null');
    if (pending) {
      await C.addConsents(consentRows(u.id, !!pending.partner)).catch(() => { /* 이미 있음 */ });
      if (pending.business) await C.upsertPartner({ id: u.id, ...pending.business }).catch(e => fail(e));
      localStorage.removeItem(PENDING_KEY);
    }
  } catch { /* 무시 */ }

  let profile = null, consents = [];
  try { profile = await C.loadProfile(u.id); } catch (e) { fail(e); }
  try { consents = await C.loadConsents(u.id); } catch { /* 표시용이라 조용히 */ }
  cloudUser = {
    id: u.id, email: u.email,
    nick: profile?.nick || u.user_metadata?.nick || '집사',
    role: profile?.role || 'user',
    consents: consents.map(c => ({ doc: c.doc, version: c.version, agreedAt: c.agreed_at })),
    createdAt: u.created_at
  };

  try {
    const { dogs, col, settings } = await C.loadAll(u.id);
    state.data[u.id] = { dogs, col, settings };
  } catch (e) { fail(e); state.data[u.id] ||= { dogs: [], col: {}, settings: {} }; }

  try { state.community = await C.loadCommunity(u.id); }
  catch (e) { fail(e); state.community = { posts: [], reviews: {}, chat: [] }; }

  try { state.partners.list = await C.loadPartners(); }
  catch (e) { fail(e); state.partners.list = []; }

  ready = true;
  persist();
}

/** 앱 시작 시 1회 호출. 재설정 링크로 들어온 경우 'recovery' 를 반환합니다. */
export async function initAuth() {
  if (MODE !== 'cloud') { ready = true; return null; }
  let recovery = false;
  C.cloudAuth.onChange((event) => {
    if (event === 'PASSWORD_RECOVERY') recovery = true;
    if (event === 'SIGNED_OUT') { cloudUser = null; state = blank(); persist(); }
  });
  try { await hydrate(); } catch (e) { fail(e); ready = true; }
  // PKCE 교환 후 URL 에 남은 code 파라미터 정리
  if (location.search.includes('code=') || location.search.includes('error=')) {
    history.replaceState(null, '', location.pathname + location.hash);
  }
  return recovery ? 'recovery' : null;
}

/* ── 사용자 영역 ──────────────────────────────────────────────── */
function mine() {
  const u = auth.current();
  if (!u) return null;
  state.data[u.id] ||= { dogs: [], col: {}, settings: {} };
  return state.data[u.id];
}

let settingsTimer = null;
export const settings = {
  get(k, dflt) { const m = mine(); return m && k in (m.settings || {}) ? m.settings[k] : dflt; },
  set(k, v) {
    const m = mine(); if (!m) return;
    (m.settings ||= {})[k] = v;
    if (MODE === 'cloud') {
      clearTimeout(settingsTimer);
      const snapshot = { ...m.settings }, uidNow = auth.current()?.id;
      settingsTimer = setTimeout(() => push(() => C.saveSettings(uidNow, snapshot)), 600);
    }
    persist();
  }
};

/* ── 반려견 ───────────────────────────────────────────────────── */
const RECORD_TABLES = ['meals', 'walks', 'meds', 'vaccines', 'medical', 'allergies', 'recipes', 'weights'];

export const dogs = {
  all() { return mine()?.dogs || []; },
  get(id) { return this.all().find(d => d.id === id) || null; },
  active() {
    const list = this.all();
    if (!list.length) return null;
    return list.find(d => d.id === settings.get('activeDog')) || list[0];
  },
  setActive(id) { settings.set('activeDog', id); },

  add(dog) {
    const m = mine(); if (!m) throw new Error('먼저 로그인해주세요!');
    const u = auth.current();
    const d = { id: uid(), userId: u.id, createdAt: new Date().toISOString(), ...dog };
    m.dogs.push(d);
    m.col[d.id] = Object.fromEntries(RECORD_TABLES.map(t => [t, []]));
    // settings.set 을 거쳐야 클라우드 settings 에도 반영됩니다
    if (!settings.get('activeDog')) settings.set('activeDog', d.id);
    push(() => C.insert('dogs', d));
    persist();
    return d;
  },
  update(id, patch) {
    const d = this.get(id); if (!d) return;
    Object.assign(d, patch);
    push(() => C.update('dogs', id, patch));
    persist();
  },
  remove(id) {
    const m = mine(); if (!m) return;
    m.dogs = m.dogs.filter(d => d.id !== id);
    delete m.col[id];
    if (m.settings?.activeDog === id) settings.set('activeDog', m.dogs[0]?.id || null);
    push(() => C.remove('dogs', id));   // 기록은 DB의 on delete cascade 로 함께 정리됩니다
    persist();
  }
};

/* ── 기록 컬렉션 ──────────────────────────────────────────────── */
export function col(name, dogId) {
  const m = mine();
  const did = dogId || dogs.active()?.id;
  if (!m || !did) return { list: () => [], raw: () => [], get: () => null, add() {}, update() {}, remove() {} };
  const bucket = (m.col[did] ||= {});
  RECORD_TABLES.forEach(t => bucket[t] ||= []);
  const arr = bucket[name] ||= [];
  return {
    list(sortKey = 'date', desc = true) {
      return [...arr].sort((a, b) => {
        const x = a[sortKey] ?? '', y = b[sortKey] ?? '';
        return desc ? String(y).localeCompare(String(x)) : String(x).localeCompare(String(y));
      });
    },
    raw: () => arr,
    get: id => arr.find(r => r.id === id) || null,
    add(rec) {
      const r = { id: uid(), dogId: did, userId: auth.current()?.id, createdAt: new Date().toISOString(), ...rec };
      arr.push(r);
      push(() => C.insert(name, r));
      persist();
      return r;
    },
    update(id, patch) {
      const r = arr.find(x => x.id === id);
      if (!r) return null;
      Object.assign(r, patch);
      push(() => C.update(name, id, patch));
      persist();
      return r;
    },
    remove(id) {
      const i = arr.findIndex(x => x.id === id);
      if (i < 0) return;
      arr.splice(i, 1);
      push(() => C.remove(name, id));
      persist();
    }
  };
}

/* ── 커뮤니티 ─────────────────────────────────────────────────── */
/* 로컬 모드는 별점을 글 안(p.ratings)에 두므로, 화면용 집계를 여기서 계산합니다 */
function withRating(p) {
  if (!p || MODE === 'cloud') return p;
  const rs = p.ratings || [];
  const me = auth.current();
  return Object.assign(p, {
    ratingCount: rs.length,
    ratingAvg: rs.length ? +(rs.reduce((s, r) => s + r.stars, 0) / rs.length).toFixed(1) : null,
    myStars: rs.find(r => r.userId === me?.id)?.stars ?? null
  });
}

export const community = {
  posts(kind) {
    const list = state.community.posts || [];
    const f = kind ? list.filter(p => p.kind === kind) : list;
    return [...f].map(withRating).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  },
  get(id) { return withRating((state.community.posts || []).find(p => p.id === id) || null); },

  post({ kind, title, body, tags = [], productId = null }) {
    const u = auth.current(); if (!u) throw new Error('먼저 로그인해주세요!');
    const p = {
      id: uid(), kind, title, body, tags, productId,
      author: u.nick, authorId: u.id, createdAt: new Date().toISOString(),
      likeCount: 0, liked: false, comments: []
    };
    (state.community.posts ||= []).unshift(p);
    push(() => C.addPost({ id: p.id, userId: u.id, kind, title, body, tags, productId }));
    persist();
    return p;
  },
  remove(id) {
    const u = auth.current(); const p = this.get(id);
    if (!u || !p || p.authorId !== u.id) return;
    state.community.posts = state.community.posts.filter(x => x.id !== id);
    push(() => C.delPost(id));
    persist();
  },
  comment(postId, body) {
    const u = auth.current(); const p = this.get(postId);
    if (!u || !p) return;
    const c = { id: uid(), body, author: u.nick, authorId: u.id, createdAt: new Date().toISOString() };
    p.comments.push(c);
    push(() => C.addComment({ id: c.id, postId, userId: u.id, body }));
    persist();
  },
  uncomment(postId, cid) {
    const u = auth.current(); const p = this.get(postId); if (!u || !p) return;
    p.comments = p.comments.filter(c => !(c.id === cid && c.authorId === u.id));
    push(() => C.delComment(cid));
    persist();
  },
  toggleLike(postId) {
    const u = auth.current(); const p = this.get(postId); if (!u || !p) return;
    p.liked = !p.liked;
    p.likeCount = Math.max(0, (p.likeCount || 0) + (p.liked ? 1 : -1));
    push(() => (p.liked ? C.like(postId, u.id) : C.unlike(postId, u.id)));
    persist();
  },

  /** 별점 — 1인 1표, 다시 누르면 갱신 (제안·의견 글에 사용) */
  rate(postId, stars) {
    const u = auth.current(); const p = this.get(postId); if (!u || !p) return;
    stars = Math.min(5, Math.max(1, Math.round(+stars || 0)));
    if (MODE === 'cloud') {
      // 화면에 먼저 반영 (서버 집계는 다음 새로고침 때 맞춰집니다)
      const total = (p.ratingAvg || 0) * (p.ratingCount || 0);
      if (p.myStars == null) {
        p.ratingCount = (p.ratingCount || 0) + 1;
        p.ratingAvg = +((total + stars) / p.ratingCount).toFixed(1);
      } else {
        p.ratingAvg = +((total - p.myStars + stars) / (p.ratingCount || 1)).toFixed(1);
      }
      p.myStars = stars;
      push(() => C.ratePost(postId, u.id, stars));
    } else {
      const rs = (p.ratings ||= []);
      const mine = rs.find(r => r.userId === u.id);
      if (mine) mine.stars = stars; else rs.push({ userId: u.id, stars });
    }
    persist();
  },

  /* ── 대화창 (라운지) ── */
  chat() { return state.community.chat || []; },
  chatSend(body) {
    const u = auth.current(); if (!u) throw new Error('먼저 로그인해주세요!');
    body = String(body || '').trim();
    if (!body) return null;
    if (body.length > 500) throw new Error('한 번에 500자까지만 보낼 수 있어요.');
    const m = { id: uid(), body, author: u.nick, authorId: u.id, createdAt: new Date().toISOString() };
    (state.community.chat ||= []).push(m);
    push(() => C.sendChat({ id: m.id, userId: u.id, body }));
    persist();
    return m;
  },
  chatRemove(id) {
    const u = auth.current(); if (!u) return;
    state.community.chat = (state.community.chat || []).filter(m => !(m.id === id && m.authorId === u.id));
    push(() => C.delChat(id));
    persist();
  },

  reviews(productId) { return state.community.reviews?.[productId] || []; },
  review(productId, { stars, body }) {
    const u = auth.current(); if (!u) throw new Error('먼저 로그인해주세요!');
    const bucket = ((state.community.reviews ||= {})[productId] ||= []);
    const existing = bucket.find(r => r.authorId === u.id);
    const id = existing?.id || uid();
    if (existing) Object.assign(existing, { stars, body, updatedAt: new Date().toISOString() });
    else bucket.unshift({ id, stars, body, author: u.nick, authorId: u.id, createdAt: new Date().toISOString() });
    push(() => C.upsertReview({ id, product_id: productId, user_id: u.id, stars, body, updated_at: new Date().toISOString() }));
    persist();
  },
  unreview(productId, id) {
    const u = auth.current(); const b = state.community.reviews?.[productId]; if (!u || !b) return;
    state.community.reviews[productId] = b.filter(r => !(r.id === id && r.authorId === u.id));
    push(() => C.delReview(id));
    persist();
  },
  score(productId) {
    const rs = this.reviews(productId);
    if (!rs.length) return null;
    return { avg: rs.reduce((s, r) => s + r.stars, 0) / rs.length, n: rs.length };
  },
  /** 부적절한 글 신고 */
  report(targetType, targetId, reason) {
    const u = auth.current(); if (!u) throw new Error('먼저 로그인해주세요!');
    if (MODE !== 'cloud') throw new Error('서버 연결이 필요한 기능이에요.');
    return C.report({ reporter_id: u.id, target_type: targetType, target_id: targetId, reason });
  }
};

/* ── 파트너 (동물병원·용품점) — 회원 건강 데이터와 분리된 영역 ── */
const PARTNER_FIELDS = ['kind', 'name', 'bizNo', 'tel', 'region', 'addr', 'url', 'intro'];

export const partners = {
  list(kind) {
    const all = state.partners.list || [];
    return kind ? all.filter(p => p.kind === kind) : [...all];
  },
  get(id) { return (state.partners.list || []).find(p => p.id === id) || null; },
  /** 지금 로그인한 계정이 파트너면 그 업체 정보 */
  mine() { const u = auth.current(); return u ? this.get(u.id) : null; },

  async updateMine(patch) {
    const u = auth.current(); const p = this.mine();
    if (!u || !p) throw new Error('파트너 계정이 아니에요.');
    const clean = {};
    PARTNER_FIELDS.forEach(k => { if (patch[k] !== undefined) clean[k] = String(patch[k] || '').trim() || null; });
    if (clean.name === null) throw new Error('상호명을 적어주세요!');
    if (clean.bizNo && !/^[0-9]{3}-?[0-9]{2}-?[0-9]{5}$/.test(clean.bizNo)) throw new Error('사업자등록번호 10자리를 확인해주세요');
    Object.assign(p, clean);
    if (MODE === 'cloud') {
      const row = { id: u.id };
      PARTNER_FIELDS.forEach(k => { row[k] = p[k] ?? null; });
      row.updated_at = new Date().toISOString();
      await C.upsertPartner(row);
    }
    persist();
  },

  reviews(partnerId) { return state.partners.reviews?.[partnerId] || []; },
  /** 클라우드에서는 업체 후기를 열 때 한 번 불러옵니다 */
  async loadReviews(partnerId) {
    if (MODE === 'cloud') {
      try { (state.partners.reviews ||= {})[partnerId] = await C.loadPartnerReviews(partnerId); persist(); }
      catch (e) { fail(e); }
    }
    return this.reviews(partnerId);
  },
  review(partnerId, { stars, body }) {
    const u = auth.current(); if (!u) throw new Error('먼저 로그인해주세요!');
    if (this.mine()?.id === partnerId) throw new Error('내 업체에는 후기를 남길 수 없어요.');
    const bucket = ((state.partners.reviews ||= {})[partnerId] ||= []);
    const existing = bucket.find(r => r.authorId === u.id);
    const id = existing?.id || uid();
    if (existing) Object.assign(existing, { stars, body, updatedAt: new Date().toISOString() });
    else bucket.unshift({ id, stars, body, author: u.nick, authorId: u.id, createdAt: new Date().toISOString() });
    const item = this.get(partnerId);
    if (item) {
      const rs = bucket;
      item.reviewCount = rs.length;
      item.reviewAvg = +(rs.reduce((s, r) => s + r.stars, 0) / rs.length).toFixed(1);
    }
    push(() => C.upsertPartnerReview({ id, partner_id: partnerId, user_id: u.id, stars, body,
      updated_at: new Date().toISOString() }));
    persist();
  },
  unreview(partnerId, id) {
    const u = auth.current(); const b = state.partners.reviews?.[partnerId]; if (!u || !b) return;
    state.partners.reviews[partnerId] = b.filter(r => !(r.id === id && r.authorId === u.id));
    const item = this.get(partnerId);
    if (item) {
      const rs = state.partners.reviews[partnerId];
      item.reviewCount = rs.length;
      item.reviewAvg = rs.length ? +(rs.reduce((s, r) => s + r.stars, 0) / rs.length).toFixed(1) : null;
    }
    push(() => C.delPartnerReview(id));
    persist();
  },
  score(partnerId) {
    const p = this.get(partnerId);
    if (!p || !p.reviewCount) return null;
    return { avg: p.reviewAvg, n: p.reviewCount };
  }
};

/* ── 운영자 도구 — 신고 처리 · 파트너 확인 · 회원 현황 ─────────────
   승격은 앱에 없음: cloud 는 Table Editor 에서 members.profiles.role='admin',
   local(개발)은 _debug.makeAdmin(email). 서버 강제는 RLS(members.is_admin())가 담당. */
const REPORT_TABLE = { post: 'posts', comment: 'comments', review: 'product_reviews', chat: 'chat_messages' };
let adminReports = [];   // 세션 내 사본 (localStorage 미저장)

export const admin = {
  isAdmin() { return auth.current()?.role === 'admin'; },
  requireAdmin() { if (!this.isAdmin()) throw new Error('운영자 계정이 아니에요.'); },

  reports(status) {
    return status ? adminReports.filter(r => r.status === status) : [...adminReports];
  },
  async loadReports() {
    this.requireAdmin();
    if (MODE !== 'cloud') throw new Error('신고함은 서버 연결(cloud 모드)에서만 쓸 수 있어요.');
    adminReports = await C.loadReports();
    return this.reports();
  },
  async setReportStatus(id, status) {
    this.requireAdmin();
    const r = adminReports.find(x => x.id === id); if (!r) return;
    r.status = status;
    r.resolvedAt = status === 'open' ? null : new Date().toISOString();
    if (MODE === 'cloud') await C.updateReport(id, status);
  },

  /** 신고 대상 원문 찾기 (화면 미리보기용 — 세션에 로드된 사본에서 탐색) */
  findTarget(targetType, targetId) {
    const cm = state.community;
    if (targetType === 'post') return cm.posts?.find(p => p.id === targetId)?.title || null;
    if (targetType === 'comment') {
      for (const p of cm.posts || []) {
        const c = (p.comments || []).find(c => c.id === targetId);
        if (c) return c.body;
      }
      return null;
    }
    if (targetType === 'chat') return cm.chat?.find(m => m.id === targetId)?.body || null;
    if (targetType === 'review') {
      for (const rs of Object.values(cm.reviews || {})) {
        const r = rs.find(r => r.id === targetId);
        if (r) return r.body;
      }
      return null;
    }
    if (targetType === 'partner') return partners.get(targetId)?.name || null;
    return null;
  },

  /** 신고된 콘텐츠 삭제 (partner 는 삭제 대상 아님 — verified 해제로 대응) */
  async removeTarget(targetType, targetId) {
    this.requireAdmin();
    const table = REPORT_TABLE[targetType];
    if (!table) throw new Error('이 종류는 삭제로 처리할 수 없어요.');
    if (MODE !== 'cloud') throw new Error('서버 연결이 필요한 기능이에요.');
    await C.remove(table, targetId);
    // 세션 사본에서도 지워 화면에 바로 반영
    const cm = state.community;
    if (targetType === 'post') cm.posts = (cm.posts || []).filter(p => p.id !== targetId);
    if (targetType === 'comment') (cm.posts || []).forEach(p => { p.comments = (p.comments || []).filter(c => c.id !== targetId); });
    if (targetType === 'chat') cm.chat = (cm.chat || []).filter(m => m.id !== targetId);
    if (targetType === 'review') Object.keys(cm.reviews || {}).forEach(k => { cm.reviews[k] = cm.reviews[k].filter(r => r.id !== targetId); });
    persist();
  },

  async setPartnerVerified(partnerId, verified) {
    this.requireAdmin();
    const p = partners.get(partnerId); if (!p) throw new Error('업체를 찾을 수 없어요.');
    p.verified = !!verified;
    if (MODE === 'cloud') await C.setPartnerVerified(partnerId, !!verified);
    persist();
  },

  async members() {
    this.requireAdmin();
    if (MODE === 'cloud') return C.loadProfiles();
    return Object.values(state.users).map(u => ({
      id: u.id, nick: u.nick, role: u.role || 'user', createdAt: u.createdAt, email: u.email
    }));
  }
};

/* ── 백업 / 복원 (로컬 모드용. 클라우드에서도 내려받기는 됩니다) ── */
export const backup = {
  export() {
    const u = auth.current(); if (!u) return null;
    return JSON.stringify({
      kind: 'mungcare-backup', version: 2, exportedAt: new Date().toISOString(),
      user: { email: u.email, nick: u.nick }, data: state.data[u.id]
    }, null, 2);
  },
  import(json) {
    const u = auth.current(); if (!u) throw new Error('먼저 로그인해주세요!');
    if (MODE === 'cloud') throw new Error('서버에 저장되는 계정에서는 덮어쓰기를 지원하지 않아요.');
    const parsed = JSON.parse(json);
    if (!['mungcare-backup', 'blancchou-backup'].includes(parsed.kind)) throw new Error('멍케어 백업 파일이 아닌 것 같아요');
    if (!parsed.data?.dogs) throw new Error('백업 파일에 아이 정보가 없네요');
    state.data[u.id] = parsed.data;
    persist();
  },
  async wipeAccount() {
    const u = auth.current(); if (!u) return;
    if (MODE === 'cloud') {
      // 반려견을 지우면 기록은 cascade 로 함께 사라집니다. 계정 자체 삭제는 서버 권한이 필요해요.
      for (const d of [...(state.data[u.id]?.dogs || [])]) {
        try { await C.remove('dogs', d.id); } catch (e) { fail(e); }
      }
      await auth.logout();
      return;
    }
    delete state.data[u.id];
    delete state.users[u.email];
    state.partners.list = (state.partners.list || []).filter(p => p.id !== u.id);
    state.session = null;
    persist();
  }
};

export const _debug = {
  state: () => state,
  reset() { state = blank(); persist(); },
  /** 로컬(개발) 모드 전용 운영자 승격 — cloud 는 Supabase Table Editor 에서 role 변경 */
  makeAdmin(email) {
    if (MODE === 'cloud') throw new Error('cloud 모드에서는 DB에서 role 을 바꿔주세요.');
    const u = state.users[String(email).toLowerCase()];
    if (!u) throw new Error('없는 계정이에요.');
    u.role = 'admin'; persist();
  }
};
