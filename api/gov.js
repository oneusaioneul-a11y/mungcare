/* api/gov.js — 공공데이터포털 프록시 (Vercel 서버리스 함수)
 *
 * 브라우저가 공공데이터포털을 직접 부를 수 없는 이유가 두 가지예요.
 *   1) CORS 를 허용하지 않아 요청 자체가 막힙니다.
 *   2) 서비스키를 프론트에 두면 그대로 노출됩니다. (저장소가 공개라 더더욱)
 * 그래서 이 함수가 키를 들고 대신 호출한 뒤, 정리된 JSON 만 돌려줍니다.
 *
 * 키는 Vercel 환경변수 DATA_GO_KR_KEY 에 있습니다. 코드나 저장소에는 없습니다.
 */

const BASE = 'https://apis.data.go.kr';

/* 허용된 서비스만 호출합니다 (열린 프록시가 되지 않도록) */
const SERVICES = {
  // 유기동물 조회 서비스 — 농림축산검역본부 동물보호관리시스템
  shelter:      { path: '/1543061/abandonmentPublicService_v2/abandonmentPublic_v2',
                  allow: ['bgnde','endde','upkind','kind','upr_cd','org_cd','care_reg_no','state','pageNo','numOfRows','neuter_yn'] },
  sido:         { path: '/1543061/abandonmentPublicService_v2/sido_v2',        allow: ['pageNo','numOfRows'] },
  sigungu:      { path: '/1543061/abandonmentPublicService_v2/sigungu_v2',     allow: ['upr_cd','pageNo','numOfRows'] },
  shelterList:  { path: '/1543061/abandonmentPublicService_v2/shelter_v2',     allow: ['upr_cd','org_cd','pageNo','numOfRows'] },
  kind:         { path: '/1543061/abandonmentPublicService_v2/kind_v2',        allow: ['up_kind_cd','pageNo','numOfRows'] },

  // 동물병원 표준데이터 (지자체 통합) — 활용신청 후 열립니다
  hospital:     { path: '/1471000/AnimalHospitalService/getAnimalHospitalList',
                  allow: ['pageNo','numOfRows','sido','sigungu','bizplcNm'] }
};

/* 공공데이터포털 오류코드 → 사람 말 */
const ERRORS = {
  '1':  '애플리케이션 오류가 났어요. 잠시 후 다시 시도해주세요.',
  '4':  'HTTP 오류가 났어요.',
  '12': '이 API 서비스가 없거나 폐기됐어요. 엔드포인트를 확인해주세요.',
  '20': '서비스 접근이 거부됐어요. 활용신청 상태를 확인해주세요.',
  '22': '오늘 호출 한도를 다 썼어요. 내일 다시 시도하거나 한도 증가를 신청해주세요.',
  '30': '서비스키가 등록되지 않았어요. 공공데이터포털에서 이 API에 활용신청을 하셨는지, 승인이 났는지 확인해주세요. 방금 발급받으셨다면 최대 1시간(일부는 하루) 뒤에 열립니다.',
  '31': '기한이 만료된 서비스키예요.',
  '32': '등록되지 않은 도메인/IP 에서 호출했어요.',
  '99': '알 수 없는 오류가 났어요.'
};

function parseError(text) {
  // 포털은 오류를 JSON 또는 XML 로 돌려줍니다
  const code = (text.match(/<returnReasonCode>(\d+)<\/returnReasonCode>/) ||
                text.match(/"returnReasonCode"\s*:\s*"?(\d+)"?/) || [])[1];
  const msg  = (text.match(/<returnAuthMsg>([^<]+)<\/returnAuthMsg>/) ||
                text.match(/"returnAuthMsg"\s*:\s*"([^"]+)"/) ||
                text.match(/<errMsg>([^<]+)<\/errMsg>/) ||
                text.match(/"errMsg"\s*:\s*"([^"]+)"/) || [])[1];
  if (!code && !msg) return null;
  return { code: code || null, message: ERRORS[code] || msg || '공공데이터포털에서 오류를 돌려줬어요.', raw: msg || null };
}

/** 포털 응답에서 항목 배열과 총 개수를 꺼냅니다 (item 이 1개면 객체로 오는 문제 처리) */
function normalize(json) {
  const body = json?.response?.body;
  if (!body) return { items: [], total: 0, pageNo: 1, numOfRows: 0 };
  const raw = body.items?.item ?? body.items ?? [];
  const items = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? [raw] : []);
  return {
    items,
    total: Number(body.totalCount) || items.length,
    pageNo: Number(body.pageNo) || 1,
    numOfRows: Number(body.numOfRows) || items.length
  };
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const key = process.env.DATA_GO_KR_KEY;
  if (!key) {
    res.status(503).json({
      ok: false,
      error: '서버에 공공데이터 서비스키가 설정되지 않았어요.',
      hint: 'Vercel 프로젝트 환경변수 DATA_GO_KR_KEY 를 확인해주세요.'
    });
    return;
  }

  const { service = '', ...rest } = req.query || {};
  const spec = SERVICES[service];
  if (!spec) {
    res.status(400).json({
      ok: false,
      error: `알 수 없는 서비스예요: ${service || '(비어 있음)'}`,
      available: Object.keys(SERVICES)
    });
    return;
  }

  // 허용된 파라미터만 통과시킵니다
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(rest)) {
    if (spec.allow.includes(k) && v !== '' && v != null) qs.set(k, String(v).slice(0, 100));
  }
  if (!qs.has('numOfRows')) qs.set('numOfRows', '20');
  if (!qs.has('pageNo')) qs.set('pageNo', '1');
  qs.set('_type', 'json');

  // 서비스키는 이미 URL 인코딩된 형태라 다시 인코딩하면 안 됩니다
  const url = `${BASE}${spec.path}?serviceKey=${key}&${qs.toString()}`;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    const upstream = await fetch(url, {
      signal: ctrl.signal,
      headers: { accept: 'application/json', 'user-agent': 'MungCare/1.0' }
    });
    clearTimeout(timer);

    const text = await upstream.text();

    const err = parseError(text);
    if (err) {
      res.status(502).json({ ok: false, service, error: err.message, code: err.code });
      return;
    }

    let json;
    try { json = JSON.parse(text); }
    catch {
      res.status(502).json({ ok: false, service, error: '포털이 JSON 이 아닌 응답을 보냈어요.', preview: text.slice(0, 200) });
      return;
    }

    const data = normalize(json);
    // 같은 질의는 10분간 CDN 이 대신 답합니다 (호출 한도 아끼기)
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');
    res.status(200).json({ ok: true, service, ...data });

  } catch (e) {
    const aborted = e?.name === 'AbortError';
    res.status(aborted ? 504 : 502).json({
      ok: false, service,
      error: aborted ? '공공데이터포털 응답이 너무 느려요. 잠시 후 다시 시도해주세요.' : '공공데이터포털에 연결하지 못했어요.'
    });
  }
}
