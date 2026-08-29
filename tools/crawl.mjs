#!/usr/bin/env node
/**
 * 용품 가격·평점 수집기
 *
 * 동작 원칙
 *  1) tools/sources.json 의 targets 에 등록된 URL 만 조회합니다. (기본값: 빈 목록 → 아무 것도 안 함)
 *  2) 각 호스트의 robots.txt 를 먼저 읽어 Disallow 규칙을 지킵니다.
 *  3) 페이지에 공개된 schema.org JSON-LD(Product / Offer / AggregateRating)만 파싱합니다.
 *     HTML 본문이나 리뷰 텍스트를 통째로 복제하지 않습니다.
 *  4) 요청 사이에 지연을 두어 대상 서버에 부담을 주지 않습니다.
 *  5) 실패한 항목은 기존 값을 그대로 두고 건너뜁니다.
 *
 * 사용:  node tools/crawl.mjs [--dry]
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const log = (...a) => console.log('[crawl]', ...a);

async function loadJSON(p) { return JSON.parse(await readFile(join(ROOT, p), 'utf8')); }

/* ── robots.txt ─────────────────────────────────────────── */
const robotsCache = new Map();
async function allowed(url, ua) {
  const u = new URL(url);
  const origin = u.origin;
  if (!robotsCache.has(origin)) {
    let rules = [];
    try {
      const res = await fetch(origin + '/robots.txt', { headers: { 'user-agent': ua }, redirect: 'follow' });
      if (res.ok) {
        const txt = await res.text();
        let applies = false;
        for (const raw of txt.split('\n')) {
          const line = raw.split('#')[0].trim();
          if (!line) continue;
          const [kRaw, ...rest] = line.split(':');
          const k = kRaw.trim().toLowerCase(), v = rest.join(':').trim();
          if (k === 'user-agent') applies = (v === '*' || ua.toLowerCase().includes(v.toLowerCase()));
          else if (applies && k === 'disallow' && v) rules.push(v);
          else if (applies && k === 'allow' && v) rules.push('!' + v);
        }
      }
    } catch { /* robots 를 못 읽으면 보수적으로 비워 둡니다 */ }
    robotsCache.set(origin, rules);
  }
  const rules = robotsCache.get(origin);
  const path = u.pathname + u.search;
  const allow = rules.filter(r => r.startsWith('!')).some(r => path.startsWith(r.slice(1)));
  if (allow) return true;
  return !rules.filter(r => !r.startsWith('!')).some(r => path.startsWith(r));
}

/* ── JSON-LD 추출 ───────────────────────────────────────── */
function extractJsonLd(html) {
  const out = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1].trim());
      Array.isArray(parsed) ? out.push(...parsed) : out.push(parsed);
    } catch { /* 깨진 JSON-LD 는 무시 */ }
  }
  return out.flatMap(x => x['@graph'] ? x['@graph'] : [x]);
}

const num = v => {
  if (v == null) return null;
  const n = Number(String(v).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : null;
};

function pickProduct(nodes) {
  const p = nodes.find(n => {
    const t = n['@type'];
    return t === 'Product' || (Array.isArray(t) && t.includes('Product'));
  });
  if (!p) return null;
  const offers = Array.isArray(p.offers) ? p.offers[0] : p.offers;
  const agg = p.aggregateRating;
  return {
    name: typeof p.name === 'string' ? p.name.slice(0, 120) : null,
    brand: typeof p.brand === 'string' ? p.brand : p.brand?.name || null,
    price: num(offers?.price ?? offers?.lowPrice),
    currency: offers?.priceCurrency || 'KRW',
    extRating: agg ? num(agg.ratingValue) : null,
    extReviews: agg ? num(agg.reviewCount ?? agg.ratingCount) : null
  };
}

/* ── 메인 ───────────────────────────────────────────────── */
async function main() {
  const src = await loadJSON('tools/sources.json');
  const db = await loadJSON('data/products.json');
  const targets = src.targets || [];

  if (!targets.length) {
    log('등록된 수집 대상이 없습니다. tools/sources.json 의 targets 에 항목을 추가하세요.');
    log('시드 데이터를 그대로 유지하고 종료합니다.');
    return;
  }

  // HTTP 헤더는 Latin-1 만 허용 — 한글이 섞이면 fetch 가 던지므로 정리합니다
  const ua = (src.userAgent || '').replace(/[^\x20-\x7E]/g, '').trim() || 'MungCareBot/1.0';
  let updated = 0, skipped = 0;

  for (const t of targets) {
    const item = db.items.find(i => i.id === t.id);
    if (!item) { log(`✗ ${t.id}: products.json 에 해당 id 가 없습니다.`); skipped++; continue; }

    try {
      if (!(await allowed(t.url, ua))) { log(`⊘ ${t.id}: robots.txt 가 이 경로의 수집을 금지합니다.`); skipped++; continue; }

      const res = await fetch(t.url, { headers: { 'user-agent': ua, 'accept-language': 'ko-KR,ko' }, redirect: 'follow' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const html = await res.text();
      const data = pickProduct(extractJsonLd(html));
      if (!data) throw new Error('구조화 데이터(JSON-LD Product)를 찾지 못했습니다.');

      Object.assign(item, {
        brand: data.brand ?? item.brand,
        price: data.price ?? item.price,
        currency: data.currency || item.currency,
        extRating: data.extRating ?? item.extRating,
        extReviews: data.extReviews ?? item.extReviews,
        url: t.url,
        source: new URL(t.url).hostname,
        fetchedAt: new Date().toISOString().slice(0, 10)
      });
      log(`✓ ${t.id}: ${data.price ? data.price + '원' : '가격 없음'}${data.extRating ? ` · ★${data.extRating}` : ''}`);
      updated++;
    } catch (e) {
      log(`✗ ${t.id}: ${e.message} — 기존 값을 유지합니다.`);
      skipped++;
    }
    await sleep(src.delayMs ?? 1500);
  }

  db.updated = new Date().toISOString().slice(0, 10);
  db.source = updated ? 'crawler+seed' : db.source;

  if (DRY) { log(`[dry-run] 갱신 ${updated}건 / 건너뜀 ${skipped}건 — 파일을 쓰지 않았습니다.`); return; }
  await writeFile(join(ROOT, 'data/products.json'), JSON.stringify(db, null, 2) + '\n');
  log(`완료: 갱신 ${updated}건, 건너뜀 ${skipped}건`);
}

main().catch(e => { console.error('[crawl] 실패:', e); process.exit(1); });
