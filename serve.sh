#!/usr/bin/env bash
# 멍케어 로컬 실행 스크립트
#
#   ./serve.sh          서버를 켜고 브라우저를 엽니다 (기본 포트 8123)
#   ./serve.sh 9000     다른 포트로 실행
#   ./serve.sh stop     실행 중인 서버를 끕니다
#
# 이 사이트는 ES 모듈과 fetch를 쓰기 때문에 index.html 을 더블클릭해서
# (file:// 로) 열면 브라우저 보안 정책에 막혀 "불러오는 중…" 에서 멈춥니다.
# 반드시 이 스크립트로 띄운 http:// 주소로 접속하세요.

set -euo pipefail
cd "$(dirname "$0")"

PIDFILE=".serve.pid"

stop() {
  if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
    kill "$(cat "$PIDFILE")" 2>/dev/null || true
    echo "서버를 중지했습니다 (PID $(cat "$PIDFILE"))."
  else
    echo "실행 중인 서버가 없습니다."
  fi
  rm -f "$PIDFILE"
}

if [ "${1:-}" = "stop" ]; then stop; exit 0; fi

PORT="${1:-8123}"

# 이미 떠 있으면 정리하고 다시 시작
[ -f "$PIDFILE" ] && stop >/dev/null 2>&1 || true

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "포트 $PORT 를 이미 다른 프로그램이 쓰고 있습니다."
  echo "다른 포트로 실행하세요:  ./serve.sh 9000"
  exit 1
fi

python3 -m http.server "$PORT" >/dev/null 2>&1 &
echo $! > "$PIDFILE"

# 서버가 뜰 때까지 잠깐 대기
for _ in $(seq 1 20); do
  if curl -s -o /dev/null --max-time 1 "http://localhost:$PORT/"; then break; fi
  sleep 0.2
done

URL="http://localhost:$PORT/"
echo "🐕 멍케어가 실행 중입니다"
echo
echo "   $URL"
echo
echo "   끄기:  ./serve.sh stop"

command -v open >/dev/null 2>&1 && open "$URL" || true
