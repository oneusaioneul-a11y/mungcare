/* cloud.js — Supabase 기반 저장소 드라이버
 *
 * 화면 코드는 예전과 똑같이 동기적으로 읽고 씁니다.
 * 이 드라이버가 메모리에 사본을 들고 있다가, 변경분을 서버에 비동기로 밀어 넣습니다.
 * (낙관적 업데이트 — 실패하면 토스트로 알리고 다음 새로고침 때 서버 값으로 맞춰집니다.)
 */
import { CONFIG } from '../config.js';

let sb = null;

export function client() {
  if (sb) return sb;
  if (!window.supabase?.createClient) throw new Error('Supabase 라이브러리를 불러오지 못했어요.');
  sb = window.supabase.createClient(CONFIG.url, CONFIG.anonKey, {
    auth: {
      flowType: 'pkce',            // 토큰이 URL 해시에 실리지 않아 앱 라우팅과 충돌하지 않습니다
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'mungcare.auth'
    }
  });
  return sb;
}

/* ── 테이블 → 스키마 라우팅 (영역별 DB 분리) ───────────────────── */
const SCHEMA = {
  profiles: 'members', consents: 'members',
  dogs: 'care', meals: 'care', walks: 'care', meds: 'care', vaccines: 'care',
  medical: 'care', allergies: 'care', recipes: 'care', weights: 'care', settings: 'care',
  posts: 'community', comments: 'community', post_likes: 'community',
  post_ratings: 'community', chat_messages: 'community',
  product_reviews: 'community', reports: 'community',
  posts_view: 'community', comments_view: 'community', chat_view: 'community', reviews_view: 'community',
  reports_view: 'community',
  partners: 'partners', partner_reviews: 'partners',
  partners_view: 'partners', partner_reviews_view: 'partners'
};
export function from(table) {
  return client().schema(SCHEMA[table] || 'public').from(table);
}

/* ── 컬럼 이름 매핑 (앱: camelCase ↔ DB: snake_case) ───────────── */
const MAPS = {
  dogs:      { adoptedAt: 'adopted_at', foodName: 'food_name', foodKcal: 'food_kcal',
               mealsPerDay: 'meals_per_day', foodNote: 'food_note' },
  meds:      { perDay: 'per_day' },
  recipes:   { totalG: 'total_g', totalKcal: 'total_kcal' },
  allergies: { foundAt: 'found_at' },
  meals: {}, walks: {}, vaccines: {}, medical: {}, weights: {},
  posts:     { productId: 'product_id', likeCount: 'like_count', commentCount: 'comment_count' },
  comments:  { postId: 'post_id' },
  post_ratings: { postId: 'post_id' },
  chat_messages: {},
  partners:  { bizNo: 'biz_no' },
  partner_reviews: { partnerId: 'partner_id' },
  reports:   {}
};
const COMMON = { createdAt: 'created_at', dogId: 'dog_id', userId: 'user_id' };

const flip = m => Object.fromEntries(Object.entries(m).map(([k, v]) => [v, k]));

export function toRow(table, obj) {
  const map = { ...COMMON, ...(MAPS[table] || {}) };
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[map[k] || k] = v === '' ? null : v;
  }
  return out;
}
export function fromRow(table, row) {
  const map = flip({ ...COMMON, ...(MAPS[table] || {}) });
  const out = {};
  for (const [k, v] of Object.entries(row)) out[map[k] || k] = v;
  return out;
}

/* 날짜/숫자 정리 — 빈 문자열은 null 로, 숫자 문자열은 숫자로 */
const NUMERIC = new Set(['weight', 'kcal', 'grams', 'minutes', 'km', 'stock', 'perDay',
                         'kg', 'cost', 'totalG', 'totalKcal', 'foodKcal', 'mealsPerDay', 'stars']);
export function clean(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (v === '') { out[k] = null; continue; }
    out[k] = NUMERIC.has(k) && v !== null ? Number(v) : v;
  }
  return out;
}

/* ── 인증 ─────────────────────────────────────────────────────── */
export const cloudAuth = {
  async signUp({ email, password, nick }) {
    const { data, error } = await client().auth.signUp({
      email, password,
      options: { data: { nick }, emailRedirectTo: location.origin + location.pathname }
    });
    if (error) throw new Error(translate(error.message));
    // 이메일 확인이 켜져 있으면 session 이 null 로 옵니다
    return { needsConfirm: !data.session, user: data.user };
  },

  async signIn({ email, password }) {
    const { data, error } = await client().auth.signInWithPassword({ email, password });
    if (error) throw new Error(translate(error.message));
    return data.user;
  },

  async signOut() { await client().auth.signOut(); },

  async session() {
    const { data } = await client().auth.getSession();
    return data.session || null;
  },

  async resendConfirm(email) {
    const { error } = await client().auth.resend({
      type: 'signup', email,
      options: { emailRedirectTo: location.origin + location.pathname }
    });
    if (error) throw new Error(translate(error.message));
  },

  async sendReset(email) {
    const { error } = await client().auth.resetPasswordForEmail(email, {
      redirectTo: location.origin + location.pathname
    });
    if (error) throw new Error(translate(error.message));
  },

  async updatePassword(newPassword) {
    const { error } = await client().auth.updateUser({ password: newPassword });
    if (error) throw new Error(translate(error.message));
  },

  onChange(fn) { client().auth.onAuthStateChange((event, session) => fn(event, session)); }
};

/* 영어 오류 메시지를 사람 말로 */
function translate(msg = '') {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return '이메일이나 비밀번호가 맞지 않아요.';
  if (m.includes('email not confirmed')) return '아직 이메일 인증 전이에요. 메일함을 확인해주세요!';
  if (m.includes('user already registered')) return '이미 가입된 이메일이에요.';
  if (m.includes('password should be at least')) return '비밀번호는 8자 이상으로 해주세요.';
  if (m.includes('unable to validate email') || m.includes('invalid email')) return '이메일 주소를 다시 봐주세요.';
  if (m.includes('rate limit') || m.includes('too many')) return '요청이 조금 잦아요. 잠시 후 다시 시도해주세요.';
  if (m.includes('for security purposes')) return '잠시 후에 다시 시도해주세요.';
  if (m.includes('failed to fetch') || m.includes('network')) return '서버에 연결하지 못했어요. 인터넷 연결을 확인해주세요.';
  if (m.includes('same password')) return '지금 쓰는 비밀번호와 같아요. 다른 걸로 해주세요.';
  return msg || '알 수 없는 오류가 났어요.';
}
export { translate };

/* ── 프로필 · 개인정보 동의 (members 스키마) ──────────────────── */
export async function loadProfile(userId) {
  const { data, error } = await from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw new Error(translate(error.message));
  return data;
}
export async function updateNick(userId, nick) {
  const { error } = await from('profiles')
    .update({ nick, updated_at: new Date().toISOString() }).eq('id', userId);
  if (error) throw new Error(translate(error.message));
}
/** 동의 이력 저장 — rows: [{user_id, doc, version}] */
export async function addConsents(rows) {
  const { error } = await from('consents').insert(rows);
  if (error) throw new Error(translate(error.message));
}
export async function loadConsents(userId) {
  const { data, error } = await from('consents').select('*')
    .eq('user_id', userId).order('agreed_at', { ascending: false });
  if (error) throw new Error(translate(error.message));
  return data || [];
}

/* ── 개인 데이터 일괄 로드 ────────────────────────────────────── */
const RECORD_TABLES = ['meals', 'walks', 'meds', 'vaccines', 'medical', 'allergies', 'recipes', 'weights'];

export async function loadAll(userId) {
  const [dogsRes, settingsRes, ...rest] = await Promise.all([
    from('dogs').select('*').order('created_at'),
    from('settings').select('data').eq('user_id', userId).maybeSingle(),
    ...RECORD_TABLES.map(t => from(t).select('*'))
  ]);
  if (dogsRes.error) throw new Error(translate(dogsRes.error.message));

  const dogs = (dogsRes.data || []).map(r => fromRow('dogs', r));
  const col = {};
  dogs.forEach(d => {
    col[d.id] = Object.fromEntries(RECORD_TABLES.map(t => [t, []]));
  });
  RECORD_TABLES.forEach((t, i) => {
    const res = rest[i];
    if (res.error) { console.warn(t, res.error.message); return; }
    (res.data || []).forEach(row => {
      const rec = fromRow(t, row);
      if (col[rec.dogId]) col[rec.dogId][t].push(rec);
    });
  });
  return { dogs, col, settings: settingsRes.data?.data || {} };
}

/* ── 쓰기 ─────────────────────────────────────────────────────── */
export async function insert(table, obj) {
  const { error } = await from(table).insert(toRow(table, clean(obj)));
  if (error) throw new Error(translate(error.message));
}
export async function update(table, id, patch) {
  const { error } = await from(table).update(toRow(table, clean(patch))).eq('id', id);
  if (error) throw new Error(translate(error.message));
}
export async function remove(table, id) {
  const { error } = await from(table).delete().eq('id', id);
  if (error) throw new Error(translate(error.message));
}
export async function saveSettings(userId, data) {
  const { error } = await from('settings')
    .upsert({ user_id: userId, data, updated_at: new Date().toISOString() });
  if (error) throw new Error(translate(error.message));
}

/* ── 커뮤니티 ─────────────────────────────────────────────────── */
export async function loadCommunity(userId) {
  const [postsRes, likesRes, ratingsRes, reviewsRes, chatRes] = await Promise.all([
    from('posts_view').select('*').order('created_at', { ascending: false }).limit(200),
    userId ? from('post_likes').select('post_id').eq('user_id', userId) : Promise.resolve({ data: [] }),
    userId ? from('post_ratings').select('post_id, stars').eq('user_id', userId) : Promise.resolve({ data: [] }),
    from('reviews_view').select('*').order('created_at', { ascending: false }).limit(500),
    from('chat_view').select('*').order('created_at', { ascending: false }).limit(100)
  ]);
  if (postsRes.error) throw new Error(translate(postsRes.error.message));

  const posts = (postsRes.data || []).map(p => ({
    id: p.id, kind: p.kind, title: p.title, body: p.body, tags: p.tags || [],
    productId: p.product_id, author: p.author || '알 수 없음', authorId: p.user_id,
    createdAt: p.created_at, likeCount: Number(p.like_count) || 0,
    commentCount: Number(p.comment_count) || 0, liked: false, comments: [],
    ratingCount: Number(p.rating_count) || 0,
    ratingAvg: p.rating_avg != null ? Number(p.rating_avg) : null, myStars: null
  }));

  const liked = new Set((likesRes.data || []).map(r => r.post_id));
  const myRating = new Map((ratingsRes.data || []).map(r => [r.post_id, r.stars]));
  posts.forEach(p => { p.liked = liked.has(p.id); p.myStars = myRating.get(p.id) ?? null; });

  if (posts.length) {
    const { data: cs } = await from('comments_view').select('*')
      .in('post_id', posts.map(p => p.id)).order('created_at');
    const byPost = new Map(posts.map(p => [p.id, p]));
    (cs || []).forEach(x => byPost.get(x.post_id)?.comments.push({
      id: x.id, body: x.body, author: x.author || '알 수 없음',
      authorId: x.user_id, createdAt: x.created_at
    }));
  }

  const reviews = {};
  (reviewsRes.data || []).forEach(r => {
    (reviews[r.product_id] ||= []).push({
      id: r.id, stars: r.stars, body: r.body, author: r.author || '알 수 없음',
      authorId: r.user_id, createdAt: r.created_at
    });
  });

  const chat = (chatRes.data || []).map(m => ({
    id: m.id, body: m.body, author: m.author || '알 수 없음',
    authorId: m.user_id, createdAt: m.created_at
  })).reverse();

  return { posts, reviews, chat };
}

export async function addPost(p)         { return insert('posts', p); }
export async function delPost(id)        { return remove('posts', id); }
export async function addComment(row)    { return insert('comments', row); }
export async function delComment(id)     { return remove('comments', id); }
export async function like(postId, userId) {
  const { error } = await from('post_likes').insert({ post_id: postId, user_id: userId });
  if (error && !String(error.message).includes('duplicate')) throw new Error(translate(error.message));
}
export async function unlike(postId, userId) {
  const { error } = await from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
  if (error) throw new Error(translate(error.message));
}
export async function ratePost(postId, userId, stars) {
  const { error } = await from('post_ratings')
    .upsert({ post_id: postId, user_id: userId, stars }, { onConflict: 'post_id,user_id' });
  if (error) throw new Error(translate(error.message));
}
export async function unratePost(postId, userId) {
  const { error } = await from('post_ratings').delete().eq('post_id', postId).eq('user_id', userId);
  if (error) throw new Error(translate(error.message));
}
export async function sendChat(row) { return insert('chat_messages', row); }
export async function delChat(id)   { return remove('chat_messages', id); }
export async function upsertReview(row) {
  const { error } = await from('product_reviews')
    .upsert(row, { onConflict: 'product_id,user_id' });
  if (error) throw new Error(translate(error.message));
}
export async function delReview(id) { return remove('product_reviews', id); }
export async function report(row)   { return insert('reports', row); }

/* ── 파트너 (partners 스키마 — 동물병원·용품점) ───────────────── */
export async function loadPartners() {
  const { data, error } = await from('partners_view').select('*').order('created_at', { ascending: false }).limit(300);
  if (error) throw new Error(translate(error.message));
  return (data || []).map(p => ({
    id: p.id, kind: p.kind, name: p.name, bizNo: p.biz_no, tel: p.tel, region: p.region,
    addr: p.addr, url: p.url, intro: p.intro, verified: p.verified, createdAt: p.created_at,
    reviewCount: Number(p.review_count) || 0,
    reviewAvg: p.review_avg != null ? Number(p.review_avg) : null
  }));
}
export async function upsertPartner(row) {
  const { error } = await from('partners').upsert(toRow('partners', clean(row)), { onConflict: 'id' });
  if (error) throw new Error(translate(error.message));
}
export async function loadPartnerReviews(partnerId) {
  const { data, error } = await from('partner_reviews_view').select('*')
    .eq('partner_id', partnerId).order('created_at', { ascending: false }).limit(200);
  if (error) throw new Error(translate(error.message));
  return (data || []).map(r => ({
    id: r.id, stars: r.stars, body: r.body, author: r.author || '알 수 없음',
    authorId: r.user_id, createdAt: r.created_at
  }));
}
export async function upsertPartnerReview(row) {
  const { error } = await from('partner_reviews')
    .upsert(row, { onConflict: 'partner_id,user_id' });
  if (error) throw new Error(translate(error.message));
}
export async function delPartnerReview(id) { return remove('partner_reviews', id); }

/* ── 운영자 (RLS 의 members.is_admin() 이 통과해야만 동작) ─────── */
export async function loadReports() {
  const { data, error } = await from('reports_view').select('*')
    .order('created_at', { ascending: false }).limit(300);
  if (error) throw new Error(translate(error.message));
  return (data || []).map(r => ({
    id: r.id, targetType: r.target_type, targetId: r.target_id, reason: r.reason,
    status: r.status, reporter: r.reporter || '알 수 없음', reporterId: r.reporter_id,
    createdAt: r.created_at, resolvedAt: r.resolved_at
  }));
}
export async function updateReport(id, status) {
  const { error } = await from('reports')
    .update({ status, resolved_at: status === 'open' ? null : new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(translate(error.message));
}
export async function setPartnerVerified(id, verified) {
  const { error } = await from('partners')
    .update({ verified, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(translate(error.message));
}
export async function loadProfiles() {
  const { data, error } = await from('profiles').select('*')
    .order('created_at', { ascending: false }).limit(500);
  if (error) throw new Error(translate(error.message));
  return (data || []).map(p => ({ id: p.id, nick: p.nick, role: p.role || 'user', createdAt: p.created_at }));
}
