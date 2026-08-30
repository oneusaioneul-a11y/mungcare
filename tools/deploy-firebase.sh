#!/bin/bash
# 멍케어 웹 — Firebase Hosting(+Functions) 배포
#
#   tools/deploy-firebase.sh              검사 → Hosting + Functions 배포
#   tools/deploy-firebase.sh hosting      Hosting 만 (Functions 는 Blaze 요금제 필요)
#
# 계정: oneusaioneul@gmail.com · 프로젝트: mungcare-app
set -euo pipefail

TARGET="${1:-all}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="mungcare-app"
SITE="https://$PROJECT.web.app"
cd "$ROOT"

echo "▸ 배포 전 검사"
for f in $(find assets/js api tools -name '*.js' -o -name '*.mjs'); do
  node --check "$f" >/dev/null || { echo "  ✗ 문법 오류: $f"; exit 1; }
done
node tools/test.mjs >/dev/null || { echo "  ✗ 로직 테스트 실패 — node tools/test.mjs 확인"; exit 1; }
echo "  ✓ 문법 · 로직 테스트 통과"

# 함수 본문은 api/ 가 단일 소스입니다. 배포 패키지에 들어가도록 복사합니다.
echo "▸ api/ → functions/api/ 동기화"
rm -rf functions/api && mkdir -p functions/api
cp api/*.js functions/api/
echo "  ✓ $(ls functions/api | tr '\n' ' ')"

case "$TARGET" in
  hosting) ONLY="hosting" ;;
  all)     ONLY="hosting,functions" ;;
  *)       ONLY="$TARGET" ;;
esac

echo "▸ 배포 ($ONLY)"
firebase deploy --only "$ONLY" --project "$PROJECT"

echo "▸ 접속 확인"
code=$(curl -s -o /tmp/mungcare_fb.html --max-time 20 -w '%{http_code}' "$SITE/")
[ "$code" = "200" ] || { echo "  ✗ 사이트 응답 $code"; exit 1; }
grep -q "멍케어" /tmp/mungcare_fb.html || { echo "  ✗ 내용이 예상과 다릅니다"; exit 1; }
echo "  ✓ $SITE 정상"

if [ "$ONLY" != "hosting" ]; then
  echo "▸ 공공데이터 진단"
  curl -s --max-time 20 "$SITE/api/gov-status" | head -c 300; echo
fi
echo
echo "완료: $SITE"
