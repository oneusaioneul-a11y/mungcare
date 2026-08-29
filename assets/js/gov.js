/* gov.js — 공공데이터 프록시(/api/gov) 클라이언트
 * 서비스키는 서버에만 있습니다. 브라우저는 우리 서버만 부릅니다. */

const cache = new Map();
const TTL = 5 * 60 * 1000;

async function call(service, params = {}, { fresh = false } = {}) {
  const qs = new URLSearchParams({ service });
  for (const [k, v] of Object.entries(params)) {
    if (v !== '' && v != null) qs.set(k, v);
  }
  const url = `/api/gov?${qs}`;

  if (!fresh) {
    const hit = cache.get(url);
    if (hit && Date.now() - hit.at < TTL) return hit.data;
  }

  let res;
  try {
    res = await fetch(url, { headers: { accept: 'application/json' } });
  } catch {
    throw new Error('서버에 연결하지 못했어요. 인터넷 연결을 확인해주세요.');
  }

  /* serve.sh(정적 서버)에는 /api 가 없어서 404가 납니다 — 원인을 그대로 알려줍니다 */
  if (res.status === 404 && ['localhost', '127.0.0.1'].includes(location.hostname)) {
    throw new Error('로컬 정적 서버에는 공공데이터 프록시(/api)가 없어요. vercel dev 로 실행하거나 배포된 사이트에서 확인해주세요.');
  }

  // 502 HTML 오류 페이지 등 JSON 이 아닌 응답도 안전하게 처리합니다
  const data = (await res.json().catch(() => null))
            || { ok: false, error: `서버가 예상과 다른 응답을 보냈어요. (HTTP ${res.status})` };
  if (!data.ok) {
    const err = new Error(data.error || '데이터를 가져오지 못했어요.');
    err.code = data.code;
    throw err;
  }
  cache.set(url, { at: Date.now(), data });
  return data;
}

/* ── 유기동물 ─────────────────────────────────────────────── */
export const shelter = {
  /** 시도 목록 */
  sido: () => call('sido', { numOfRows: 20 }),
  /** 시군구 목록 */
  sigungu: uprCd => call('sigungu', { upr_cd: uprCd, numOfRows: 60 }),
  /** 품종 목록 (개=417000) */
  kinds: (upKindCd = '417000') => call('kind', { up_kind_cd: upKindCd, numOfRows: 300 }),
  /** 보호소 목록 */
  centers: (uprCd, orgCd) => call('shelterList', { upr_cd: uprCd, org_cd: orgCd, numOfRows: 100 }),
  /** 유기동물 공고 검색 */
  search: (params) => call('shelter', { upkind: '417000', ...params })
};

/** 서비스키 상태 진단 */
export async function status() {
  const res = await fetch('/api/gov-status', { cache: 'no-store' });
  if (res.status === 404 && ['localhost', '127.0.0.1'].includes(location.hostname)) {
    throw new Error('로컬 정적 서버에는 공공데이터 프록시(/api)가 없어요. vercel dev 로 실행하거나 배포된 사이트에서 확인해주세요.');
  }
  return res.json();
}

/* ── 응답 정리 ────────────────────────────────────────────── */
const SEX = { M: '남아', F: '여아', Q: '모름' };
const NEUTER = { Y: '중성화 완료', N: '중성화 안 함', U: '모름' };

const yyyymmdd = s => {
  const v = String(s || '');
  return v.length === 8 ? `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}` : (v || null);
};

/** 포털 원본 항목 → 화면에서 쓰기 좋은 형태 */
export function normalizeAnimal(x) {
  return {
    id: x.desertionNo || x.desertion_no,
    photo: x.popfile1 || x.popfile || x.filename || null,
    breed: String(x.kindNm || x.kindCd || '').replace(/^\[개\]\s*/, '') || '견종 미상',
    color: x.colorCd || null,
    age: x.age || null,
    weight: x.weight || null,
    sex: SEX[x.sexCd] || '모름',
    neuter: NEUTER[x.neuterYn] || '모름',
    foundAt: yyyymmdd(x.happenDt),
    foundPlace: x.happenPlace || null,
    feature: x.specialMark || null,
    noticeFrom: yyyymmdd(x.noticeSdt),
    noticeTo: yyyymmdd(x.noticeEdt),
    state: x.processState || null,
    center: x.careNm || null,
    centerTel: x.careTel || null,
    centerAddr: x.careAddr || null,
    org: x.orgNm || null,
    charge: x.chargeNm || null,
    officeTel: x.officetel || null,
    comment: x.noticeComment || null
  };
}

/** 공고 마감까지 남은 일수 (음수면 지남) */
export function daysLeft(noticeTo) {
  if (!noticeTo) return null;
  const end = new Date(noticeTo + 'T23:59:59');
  if (isNaN(end)) return null;
  return Math.ceil((end - Date.now()) / 86400000);
}
