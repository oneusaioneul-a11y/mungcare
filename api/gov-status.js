/* api/gov-status.js — 서비스키가 살아있는지 확인하는 진단 엔드포인트
 * 브라우저에서 /api/gov-status 를 열면 지금 어떤 서비스가 열려 있는지 알려줍니다. */

const CHECKS = [
  { name: '유기동물 조회',  service: 'shelter',  path: '/1543061/abandonmentPublicService_v2/abandonmentPublic_v2' },
  { name: '시도 조회',      service: 'sido',     path: '/1543061/abandonmentPublicService_v2/sido_v2' },
  { name: '동물병원 표준',  service: 'hospital', path: '/1471000/AnimalHospitalService/getAnimalHospitalList' }
];

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  const key = process.env.DATA_GO_KR_KEY;
  if (!key) { res.status(503).json({ ok: false, error: '서비스키가 설정되지 않았어요.' }); return; }

  const results = await Promise.all(CHECKS.map(async c => {
    try {
      const r = await fetch(`https://apis.data.go.kr${c.path}?serviceKey=${key}&numOfRows=1&pageNo=1&_type=json`,
        { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
      const t = await r.text();
      const code = (t.match(/returnReasonCode>?"?\s*:?\s*"?(\d+)/) || [])[1];
      const authMsg = (t.match(/returnAuthMsg[">:\s]+([^"<,}]+)/) || [])[1];
      if (code) return { ...c, ok: false, code, message: authMsg?.trim() || null };
      const j = JSON.parse(t);
      const total = j?.response?.body?.totalCount;
      return { ...c, ok: true, totalCount: Number(total) || 0 };
    } catch (e) {
      return { ...c, ok: false, message: e?.name === 'TimeoutError' ? '응답 지연' : '연결 실패' };
    }
  }));

  const live = results.filter(r => r.ok).map(r => r.service);
  res.status(200).json({
    ok: true,
    keyConfigured: true,
    liveServices: live,
    hint: live.length ? null
      : '아직 열린 서비스가 없어요. 공공데이터포털 마이페이지에서 해당 API에 활용신청이 승인됐는지, 방금 발급받았다면 1시간쯤 기다렸는지 확인해주세요.',
    checks: results
  });
}
