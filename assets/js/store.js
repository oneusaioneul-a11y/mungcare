/* store.js — 로컬 저장소 기반 데이터 계층.
   모든 읽기/쓰기가 이 파일 한 곳을 통과하므로, 추후 실제 백엔드(REST/Supabase 등)로
   옮길 때 이 모듈의 내부 구현만 교체하면 됩니다. */

const KEY = 'blancchou.v1';
const listeners = new Set();

const blank = () => ({
  users: {},          // email(소문자) -> {id,email,nick,salt,hash,iter,createdAt}
  session: null,      // 로그인된 userId
  data: {},           // userId -> {dogs:[], col:{dogId:{meals:[],...}}, settings:{}}
  community: { posts: [], reviews: {} },  // 이 브라우저에 저장되는 로컬 커뮤니티
  meta: { createdAt: new Date().toISOString() }
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const parsed = JSON.parse(raw);
    return { ...blank(), ...parsed };
  } catch (e) {
    console.warn('저장 데이터를 읽지 못해 초기화합니다.', e);
    return blank();
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    alert('저장 공간이 부족합니다. [설정 → 데이터 내보내기]로 백업 후 정리해 주세요.');
  }
  listeners.forEach(fn => fn(state));
}

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export const uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

/* ── 비밀번호 해싱 (PBKDF2-SHA256) ─────────────────────────── */
const ITER = 120000;
const enc = new TextEncoder();
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));

async function hashPw(password, saltB64, iter = ITER) {
  const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, key, 256);
  return b64(bits);
}

/* ── 인증 ──────────────────────────────────────────────────── */
export const auth = {
  current() {
    if (!state.session) return null;
    return Object.values(state.users).find(u => u.id === state.session) || null;
  },

  async signup({ email, password, nick }) {
    email = String(email || '').trim().toLowerCase();
    nick = String(nick || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('이메일 형식을 확인해 주세요.');
    if (!nick) throw new Error('닉네임을 입력해 주세요.');
    if (String(password).length < 8) throw new Error('비밀번호는 8자 이상이어야 합니다.');
    if (state.users[email]) throw new Error('이미 가입된 이메일입니다.');

    const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
    const hash = await hashPw(password, salt);
    const id = uid('u');
    state.users[email] = { id, email, nick, salt, hash, iter: ITER, createdAt: new Date().toISOString() };
    state.data[id] = { dogs: [], col: {}, settings: { theme: 'light' } };
    state.session = id;
    persist();
    return state.users[email];
  },

  async login({ email, password }) {
    email = String(email || '').trim().toLowerCase();
    const u = state.users[email];
    if (!u) throw new Error('가입되지 않은 이메일이거나 비밀번호가 올바르지 않습니다.');
    const hash = await hashPw(password, u.salt, u.iter || ITER);
    if (hash !== u.hash) throw new Error('가입되지 않은 이메일이거나 비밀번호가 올바르지 않습니다.');
    state.session = u.id;
    if (!state.data[u.id]) state.data[u.id] = { dogs: [], col: {}, settings: {} };
    persist();
    return u;
  },

  logout() { state.session = null; persist(); },

  updateNick(nick) {
    const u = this.current();
    if (!u) throw new Error('로그인이 필요합니다.');
    nick = String(nick || '').trim();
    if (!nick) throw new Error('닉네임을 입력해 주세요.');
    u.nick = nick; persist();
  },

  async changePassword(oldPw, newPw) {
    const u = this.current();
    if (!u) throw new Error('로그인이 필요합니다.');
    if (await hashPw(oldPw, u.salt, u.iter || ITER) !== u.hash) throw new Error('현재 비밀번호가 일치하지 않습니다.');
    if (String(newPw).length < 8) throw new Error('새 비밀번호는 8자 이상이어야 합니다.');
    u.salt = b64(crypto.getRandomValues(new Uint8Array(16)));
    u.hash = await hashPw(newPw, u.salt);
    u.iter = ITER;
    persist();
  }
};

/* ── 사용자 영역 ───────────────────────────────────────────── */
function mine() {
  const u = auth.current();
  if (!u) return null;
  if (!state.data[u.id]) state.data[u.id] = { dogs: [], col: {}, settings: {} };
  return state.data[u.id];
}

export const settings = {
  get(k, dflt) { const m = mine(); return m && k in (m.settings || {}) ? m.settings[k] : dflt; },
  set(k, v) { const m = mine(); if (!m) return; (m.settings ||= {})[k] = v; persist(); }
};

/* ── 반려견 ────────────────────────────────────────────────── */
export const dogs = {
  all() { return mine()?.dogs || []; },
  get(id) { return this.all().find(d => d.id === id) || null; },
  active() {
    const list = this.all();
    if (!list.length) return null;
    const id = settings.get('activeDog');
    return list.find(d => d.id === id) || list[0];
  },
  setActive(id) { settings.set('activeDog', id); },
  add(dog) {
    const m = mine(); if (!m) throw new Error('로그인이 필요합니다.');
    const d = { id: uid('dog'), createdAt: new Date().toISOString(), ...dog };
    m.dogs.push(d);
    m.col[d.id] = { meals: [], meds: [], walks: [], vaccines: [], medical: [], allergies: [], recipes: [], weights: [] };
    if (!settings.get('activeDog')) m.settings.activeDog = d.id;
    persist();
    return d;
  },
  update(id, patch) {
    const d = this.get(id); if (!d) return;
    Object.assign(d, patch); persist();
  },
  remove(id) {
    const m = mine(); if (!m) return;
    m.dogs = m.dogs.filter(d => d.id !== id);
    delete m.col[id];
    if (m.settings?.activeDog === id) m.settings.activeDog = m.dogs[0]?.id || null;
    persist();
  }
};

/* ── 기록 컬렉션 (meals/meds/walks/vaccines/medical/allergies/recipes/weights) ── */
const COLS = ['meals', 'meds', 'walks', 'vaccines', 'medical', 'allergies', 'recipes', 'weights'];

export function col(name, dogId) {
  const m = mine();
  const did = dogId || dogs.active()?.id;
  if (!m || !did) return { list: () => [], add() {}, update() {}, remove() {} };
  const bucket = (m.col[did] ||= {});
  COLS.forEach(c => bucket[c] ||= []);
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
    add(rec) { const r = { id: uid(name), createdAt: new Date().toISOString(), ...rec }; arr.push(r); persist(); return r; },
    update(id, patch) { const r = arr.find(x => x.id === id); if (r) { Object.assign(r, patch); persist(); } return r; },
    remove(id) { const i = arr.findIndex(x => x.id === id); if (i > -1) { arr.splice(i, 1); persist(); } }
  };
}

/* ── 커뮤니티 (이 브라우저 로컬. giscus 연동 시 실서비스 전환) ── */
export const community = {
  posts(kind) {
    const list = state.community.posts || [];
    const f = kind ? list.filter(p => p.kind === kind) : list;
    return [...f].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.createdAt.localeCompare(a.createdAt));
  },
  get(id) { return (state.community.posts || []).find(p => p.id === id) || null; },
  post({ kind, title, body, tags = [], productId = null }) {
    const u = auth.current(); if (!u) throw new Error('로그인이 필요합니다.');
    const p = {
      id: uid('post'), kind, title, body, tags, productId,
      author: u.nick, authorId: u.id, createdAt: new Date().toISOString(),
      likes: [], comments: []
    };
    (state.community.posts ||= []).push(p); persist(); return p;
  },
  remove(id) {
    const u = auth.current(); const p = this.get(id);
    if (!u || !p || p.authorId !== u.id) return;
    state.community.posts = state.community.posts.filter(x => x.id !== id); persist();
  },
  comment(postId, body) {
    const u = auth.current(); const p = this.get(postId);
    if (!u || !p) return;
    p.comments.push({ id: uid('c'), body, author: u.nick, authorId: u.id, createdAt: new Date().toISOString() });
    persist();
  },
  uncomment(postId, cid) {
    const u = auth.current(); const p = this.get(postId); if (!u || !p) return;
    p.comments = p.comments.filter(c => !(c.id === cid && c.authorId === u.id)); persist();
  },
  toggleLike(postId) {
    const u = auth.current(); const p = this.get(postId); if (!u || !p) return;
    p.likes = p.likes || [];
    const i = p.likes.indexOf(u.id);
    i > -1 ? p.likes.splice(i, 1) : p.likes.push(u.id);
    persist();
  },
  /* 제품 평가 */
  reviews(productId) { return (state.community.reviews?.[productId] || []); },
  review(productId, { stars, body }) {
    const u = auth.current(); if (!u) throw new Error('로그인이 필요합니다.');
    const bucket = ((state.community.reviews ||= {})[productId] ||= []);
    const existing = bucket.find(r => r.authorId === u.id);
    if (existing) Object.assign(existing, { stars, body, updatedAt: new Date().toISOString() });
    else bucket.push({ id: uid('rv'), stars, body, author: u.nick, authorId: u.id, createdAt: new Date().toISOString() });
    persist();
  },
  unreview(productId, id) {
    const u = auth.current(); const b = state.community.reviews?.[productId]; if (!u || !b) return;
    state.community.reviews[productId] = b.filter(r => !(r.id === id && r.authorId === u.id)); persist();
  },
  score(productId) {
    const rs = this.reviews(productId);
    if (!rs.length) return null;
    return { avg: rs.reduce((s, r) => s + r.stars, 0) / rs.length, n: rs.length };
  }
};

/* ── 백업 / 복원 ───────────────────────────────────────────── */
export const backup = {
  export() {
    const u = auth.current(); if (!u) return null;
    return JSON.stringify({
      kind: 'blancchou-backup', version: 1, exportedAt: new Date().toISOString(),
      user: { email: u.email, nick: u.nick }, data: state.data[u.id]
    }, null, 2);
  },
  import(json) {
    const u = auth.current(); if (!u) throw new Error('로그인이 필요합니다.');
    const parsed = JSON.parse(json);
    if (parsed.kind !== 'blancchou-backup') throw new Error('이 사이트의 백업 파일이 아닙니다.');
    if (!parsed.data?.dogs) throw new Error('백업 파일에 반려견 데이터가 없습니다.');
    state.data[u.id] = parsed.data;
    persist();
  },
  wipeAccount() {
    const u = auth.current(); if (!u) return;
    delete state.data[u.id];
    delete state.users[u.email];
    state.session = null;
    persist();
  }
};

export const _debug = { state: () => state, reset() { state = blank(); persist(); } };
