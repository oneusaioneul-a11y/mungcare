#!/usr/bin/env bash
# Vercel 배포 스크립트
#
#   ./deploy.sh          운영(production)에 배포하고 접속까지 확인
#   ./deploy.sh preview   미리보기 배포 (운영 주소는 그대로 두고 테스트)

set -euo pipefail
cd "$(dirname "$0")"

SITE="https://mungcare.vercel.app"

echo "▸ 배포 전 검사"
for f in $(find assets/js api tools -name '*.js' -o -name '*.mjs'); do
  node --check "$f" >/dev/null || { echo "  ✗ 문법 오류: $f"; exit 1; }
done
node tools/test.mjs >/dev/null || { echo "  ✗ 로직 테스트 실패 — tools/test.mjs 확인"; exit 1; }
echo "  ✓ 문법 · 로직 테스트 통과"

if [ "${1:-}" = "preview" ]; then
  echo "▸ 미리보기 배포"
  vercel deploy --yes
  exit 0
fi

echo "▸ 운영 배포"
vercel deploy --prod --yes >/dev/null
echo "  ✓ 배포 완료"

echo "▸ 실제 접속 확인"
for i in $(seq 1 10); do
  code=$(curl -s -o /tmp/mungcare_check.html --max-time 15 -w '%{http_code}' "$SITE/")
  [ "$code" = "200" ] && break
  echo "  … 시도 $i (HTTP $code)"
  sleep 5
done

if [ "$code" != "200" ]; then
  echo "  ✗ 사이트가 응답하지 않습니다 (HTTP $code)"
  exit 1
fi
grep -q "멍케어" /tmp/mungcare_check.html || { echo "  ✗ 내용이 예상과 다릅니다"; exit 1; }

fail=0
for p in assets/js/app.js assets/js/icons.js assets/css/app.css \
         data/breeds.json data/vaccines.json data/products.json; do
  c=$(curl -s -o /dev/null --max-time 12 -w '%{http_code}' "$SITE/$p")
  [ "$c" = "200" ] || { echo "  ✗ $p → HTTP $c"; fail=1; }
done
[ $fail -eq 0 ] || exit 1

echo "  ✓ 자산 전부 정상"
echo
echo "🐕 배포 완료!  $SITE"
