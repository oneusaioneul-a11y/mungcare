#!/bin/bash
# 스토어 스크린샷 생성 — 통합 테스트가 화면을 이동하고, 여기서 기기 해상도 그대로 캡처합니다.
#
#   tools/make-screenshots.sh <UDID> <출력폴더이름>
#
# 예) tools/make-screenshots.sh C1F69F64-... 6.9
#
# 앱 설치와 데모 데이터 주입까지 알아서 합니다. 결과는 dist/screenshots/<폴더>/ 에 저장.
set -euo pipefail

UDID="${1:?사용법: make-screenshots.sh <UDID> <출력폴더이름>}"
NAME="${2:?출력 폴더 이름 필요 (예: 6.9)}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/dist/screenshots/$NAME"
mkdir -p "$OUT"

echo "▸ 기기 준비 ($UDID)"
xcrun simctl boot "$UDID" 2>/dev/null || true
xcrun simctl bootstatus "$UDID" -b >/dev/null 2>&1 || sleep 10

# 앱을 한 번 설치·실행해 컨테이너를 만든 뒤 데모 데이터를 넣습니다
cd "$ROOT/app"
[ -d build/ios/iphonesimulator/Runner.app ] || flutter build ios --simulator --debug
xcrun simctl install "$UDID" build/ios/iphonesimulator/Runner.app
xcrun simctl launch "$UDID" kr.mungcare.app >/dev/null 2>&1 || true
sleep 3
xcrun simctl terminate "$UDID" kr.mungcare.app 2>/dev/null || true
python3 "$ROOT/tools/seed-demo.py" "$UDID"

echo "▸ 화면 이동 + 캡처"
# 테스트가 SHOT:<이름> 을 찍을 때마다 그 순간의 화면을 저장합니다
flutter test integration_test/screenshots_test.dart -d "$UDID" 2>&1 | while IFS= read -r line; do
  case "$line" in
    *SHOT:*)
      shot="${line##*SHOT:}"
      shot="$(echo "$shot" | tr -d '\r' | awk '{print $1}')"
      sleep 0.6   # 캡처 신호 직후 프레임이 완전히 그려질 시간
      xcrun simctl io "$UDID" screenshot "$OUT/$shot.png" >/dev/null 2>&1
      echo "  ✓ $shot.png"
      ;;
    *"All tests passed"*) echo "  이동 완료" ;;
    *"Some tests failed"*) echo "  ✗ 테스트 실패 — 화면 이동 중 오류"; exit 1 ;;
  esac
done

COUNT=$(ls -1 "$OUT"/*.png 2>/dev/null | wc -l | tr -d ' ')
SIZE=$(sips -g pixelWidth -g pixelHeight "$OUT"/01-home.png 2>/dev/null | awk '/pixel/{printf "%s ", $2}')
echo "완료: $COUNT장 → dist/screenshots/$NAME/ (${SIZE% })"
