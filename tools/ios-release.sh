#!/bin/bash
# 멍케어 iOS — IPA 빌드 후 App Store Connect(TestFlight) 업로드
#
# 계정: oneusaioneul@icloud.com 의 Apple Developer Program 팀
#
# 사전 준비 (계정당 1회)
#   1) Apple Developer Program 등록 완료 (연 129,000원) — 미등록이면 업로드 불가
#   2) App Store Connect → Users and Access → Integrations → App Store Connect API
#      → 키 생성(역할: App Manager) → AuthKey_XXXXXXXXXX.p8 다운로드 (다운로드는 1회뿐)
#   3) 그 .p8 를 tools/asc_keys/ 에 둔다 (git 제외됨)
#   4) App Store Connect 에 앱 등록 — 번들 ID: kr.mungcare.app
#   5) TEAM_ID 확인: developer.apple.com → Membership details → Team ID (10자)
#
# 사용법
#   tools/ios-release.sh <TEAM_ID> <KEY_ID> <ISSUER_ID>          빌드 + 업로드
#   tools/ios-release.sh <TEAM_ID> --build-only                  빌드만
#
# 예) tools/ios-release.sh AB12CD34EF K3Y1D0000X 12a3b4c5-6d7e-...
set -euo pipefail

TEAM_ID="${1:?사용법: ios-release.sh <TEAM_ID> <KEY_ID> <ISSUER_ID> | <TEAM_ID> --build-only}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/app"
KEYDIR="$ROOT/tools/asc_keys"
export DEVELOPER_DIR=${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}

echo "▸ 검사 (분석 + 테스트)"
cd "$APP"
flutter analyze
flutter test

echo "▸ IPA 빌드 (팀 $TEAM_ID)"
EXPORT_PLIST="$(mktemp -t mungcare-export).plist"
trap 'rm -f "$EXPORT_PLIST"' EXIT
cat > "$EXPORT_PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>method</key><string>app-store-connect</string>
  <key>teamID</key><string>$TEAM_ID</string>
  <key>uploadSymbols</key><true/>
  <key>signingStyle</key><string>automatic</string>
</dict></plist>
PLIST

if ! flutter build ipa --release --export-options-plist="$EXPORT_PLIST"; then
  echo "  ✗ 빌드 실패 — Xcode에서 Runner 타겟 Signing & Capabilities 의 팀이 설정됐는지 확인하세요"
  exit 1
fi

IPA=$(ls -t "$APP/build/ios/ipa"/*.ipa 2>/dev/null | head -1)
[ -n "$IPA" ] || { echo "  ✗ IPA를 찾지 못했습니다"; exit 1; }
echo "  ✓ $IPA"

if [ "${2:-}" = "--build-only" ]; then
  echo "빌드만 수행했습니다. 업로드하려면 KEY_ID·ISSUER_ID 와 함께 다시 실행하세요."
  exit 0
fi

KEY_ID="${2:?KEY_ID 필요 (App Store Connect API 키)}"
ISSUER_ID="${3:?ISSUER_ID 필요}"
[ -f "$KEYDIR/AuthKey_${KEY_ID}.p8" ] || { echo "키 파일 없음: $KEYDIR/AuthKey_${KEY_ID}.p8"; exit 1; }
export API_PRIVATE_KEYS_DIR="$KEYDIR"

echo "▸ App Store Connect 업로드"
xcrun altool --upload-app -f "$IPA" -t ios --apiKey "$KEY_ID" --apiIssuer "$ISSUER_ID"

echo
echo "✓ 전송 완료. 수 분 뒤 App Store Connect → 멍케어 → TestFlight 에 빌드가 나타납니다."
echo "  첫 업로드라면 TestFlight 의 '수출 규정 준수' 질문에 답해야 테스터에게 배포됩니다."
