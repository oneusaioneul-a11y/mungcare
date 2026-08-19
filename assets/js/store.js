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
const listeners = new Set();
const errorHandlers = new Set();

export const MODE = isCloud() ? 'cloud' : 'local';
export const isCloudMode = () => MODE === 'cloud';

const blank = () => ({
  users: {}, session: null, data: {},
  community: { posts: [], reviews: {} },
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
    return raw ? { ...blank(), ...JSON.parse(raw) } : blank();
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

/* ── 인증 ─────────────────────────────────────────────────────── */
export const auth = {
  current() {
    if (MODE === 'cloud') return cloudUser;
    if (!state.session) return null;
    return Object.values(state.users).find(u => u.id === state.session) || null;
  },

  /** @returns {{needsConfirm:boolean}} */
  async signup({ email, password, nick }) {
    email = String(email || '').trim().toLowerCase();
    nick = String(nick || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('이메일 주소를 다시 한 번 봐주세요!');
    if (!nick) throw new Error('뭐라고 불러드릴까요? 닉네임을 적어주세요');
    if (nick.length > 20) throw new Error('닉네임은 20자까지만 가능해요');
    if (String(password).length < 8) throw new Error('비밀번호는 8자 이상으로 해주세요');

    if (MODE === 'cloud') {
      const { needsConfirm, user } = await C.cloudAuth.signUp({ email, password, nick });
      if (!needsConfirm && user) await hydrate();
      return { needsConfirm };
    }

    if (state.users[email]) throw new Error('이미 가입된 이메일이에요');
    const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
    const id = uid();
    state.users[email] = { id, email, nick, salt, hash: await hashPw(password, salt), iter: ITER, createdAt: new Date().toISOString() };
    state.data[id] = { dogs: [], col: {}, settings: { theme: 'light' } };
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
  let profile = null;
  try { profile = await C.loadProfile(u.id); } catch (e) { fail(e); }
  cloudUser = {
    id: u.id, email: u.email,
    nick: profile?.nick || u.user_metadata?.nick || '집사',
    createdAt: u.created_at
  };

  try {
    const { dogs, col, settings } = await C.loadAll(u.id);
    state.data[u.id] = { dogs, col, settings };
  } catch (e) { fail(e); state.data[u.id] ||= { dogs: [], col: {}, settings: {} }; }

  try { state.community = await C.loadCommunity(u.id); }
  catch (e) { fail(e); state.community = { posts: [], reviews: {} }; }

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
    if (!settings.get('activeDog')) (m.settings ||= {}).activeDog = d.id;
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
    if (m.settings?.activeDog === id) m.settings.activeDog = m.dogs[0]?.id || null;
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
export const community = {
  posts(kind) {
    const list = state.community.posts || [];
    const f = kind ? list.filter(p => p.kind === kind) : list;
    return [...f].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  },
  get(id) { return (state.community.posts || []).find(p => p.id === id) || null; },

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
    state.session = null;
    persist();
  }
};

export const _debug = { state: () => state, reset() { state = blank(); persist(); } };
