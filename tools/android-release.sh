#!/bin/bash
# 멍케어 Android — AAB 빌드 후 Google Play 업로드
#
# 사전 준비 (1회)
#   1) Play Console 에 앱 등록 — 패키지명: kr.mungcare.app
#   2) Play Console → 설정 → API 액세스 → Google Cloud 프로젝트 연결
#      → 서비스 계정 생성 → JSON 키 다운로드 → tools/play_keys/play-sa.json (git 제외)
#   3) Play Console → 사용자 및 권한 → 그 서비스 계정 초대 → "출시 관리" 권한
#   4) 업로드 키는 tools/android_keys/ 에 이미 있습니다 (mungcare-upload.jks)
#      ⚠️ 이 키를 잃어버리면 앱 업데이트를 영영 못 올립니다. 반드시 백업하세요.
#
# 사용법
#   tools/android-release.sh                 빌드 + internal 트랙 업로드
#   tools/android-release.sh --build-only    빌드만
#   tools/android-release.sh production      빌드 + 프로덕션 트랙 업로드
set -euo pipefail

ARG="${1:-internal}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/app"
AAB="$APP/build/app/outputs/bundle/release/app-release.aab"

echo "▸ 검사 (분석 + 테스트)"
cd "$APP"
flutter analyze
flutter test

echo "▸ AAB 빌드"
flutter build appbundle --release

# 디버그 키로 서명된 채 올라가는 사고를 막습니다
SIG=$(unzip -l "$AAB" | grep -oE 'META-INF/[A-Z0-9]+\.(RSA|DSA|EC)' | head -1)
if [ -z "$SIG" ] || [ "$SIG" = "META-INF/ANDROIDD.RSA" ]; then
  echo "  ✗ 릴리스 키로 서명되지 않았습니다 (tools/android_keys/key.properties 확인)"
  exit 1
fi
echo "  ✓ $AAB ($SIG)"

if [ "$ARG" = "--build-only" ]; then
  echo "빌드만 수행했습니다."
  exit 0
fi

KEY="$ROOT/tools/play_keys/play-sa.json"
[ -f "$KEY" ] || { echo "서비스 계정 키 없음: $KEY"; exit 1; }

echo "▸ Play 업로드 ($ARG 트랙)"
cd "$ROOT/tools"
[ -d node_modules/googleapis ] || npm install googleapis --silent
node upload-play.mjs kr.mungcare.app "$AAB" "$ARG"
