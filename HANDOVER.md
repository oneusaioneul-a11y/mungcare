# 멍케어(MungCare) 개발 이관 문서

> 작성일: 2026-08-29 · 기준 커밋: `c4bcbbb` (main) · 작성 목적: 개발팀 이관

| 항목 | 값 |
|---|---|
| 서비스 | 멍케어 — 반려견 통합 건강 관리 웹 서비스 |
| 운영 URL | https://mungcare.vercel.app |
| 저장소 | https://github.com/redreta/mungcare (branch: `main`) |
| 호스팅 | Vercel — project `mungcare` (`prj_q9R2fi3KXQMyJHDn6RKugJpGqWVU`, org `team_3x72pgUXpAgIPWz5Gqj9BUph`) |
| DB/인증 | Supabase (Postgres + Auth) — **프로젝트 셋업 미완, 아래 "운영 체크리스트" 참고** |
| 외부 API | 공공데이터포털 — 농림축산검역본부 동물보호관리시스템 (유기동물 조회 v2) |

---

## 1. 서비스 개요

반려견의 **밥·약·산책·체중·접종·구충·진료·알러지**를 기록하고, 견종·나이에 맞춰
질환 위험과 접종 일정을 미리 알려주는 서비스. 부가로 **커뮤니티**(글·댓글·추천·별점·대화창),
**용품 리뷰**, **유기견 입양 정보**(공공데이터 실시간), **동물병원·용품점 파트너 디렉터리**를 제공한다.

### 이중 동작 모드 (가장 중요한 개념)

`assets/js/config.js` 의 Supabase `url`/`anonKey` 값 유무로 전체 동작이 갈린다.

| 모드 | 조건 | 동작 |
|---|---|---|
| **local** | config 비어 있음 (현재 운영 상태) | 모든 데이터가 브라우저 `localStorage` (`mungcare.v2`)에만 저장. 자체 PBKDF2 비밀번호 해시로 로컬 로그인. 커뮤니티·파트너도 브라우저 안에서만 시뮬레이션 |
| **cloud** | config 채워짐 | Supabase Auth(이메일 인증·비밀번호 재설정) + Postgres 저장. 화면은 메모리 사본을 동기 읽기, 쓰기는 낙관적(화면 먼저, 서버 비동기, 실패 시 토스트) |

화면 코드는 모드를 몰라도 되도록 `store.js` 가 전부 추상화한다.

---

## 2. 기술 스택

- **프론트엔드**: Vanilla JS (ES Modules), 빌드 없음. `index.html` → `assets/js/app.js` 진입
- **의존성**: supabase-js v2 (자체 포함 번들 `assets/vendor/supabase.js`, CDN 미사용) 뿐
- **서버**: Vercel 서버리스 함수 2개 (`api/gov.js`, `api/gov-status.js`) — 공공데이터 프록시
- **DB**: Supabase Postgres — 스키마 4개 분리 + RLS (아래 4장)
- **스타일**: 단일 CSS (`assets/css/app.css`), 라이트/다크는 `data-theme` 속성
- **테스트**: `node tools/test.mjs` — 브라우저 없이 Node로 도는 회귀 테스트 69건
- **Node 요구 버전**: >= 20

---

## 3. 저장소 구조

```
├── index.html                  진입점 (부팅 실패 안내 스크립트 포함)
├── assets/
│   ├── css/app.css             전체 스타일 (라이트/다크 토큰)
│   ├── vendor/supabase.js      supabase-js v2 자체 포함 번들
│   └── js/
│       ├── app.js              앱 셸 — 라우터, 사이드바, 테마, 부트스트랩
│       ├── config.js           ★ Supabase 연결값 (현재 빈 값 = local 모드)
│       ├── store.js            데이터 계층 — 인증/동의/기록/커뮤니티/파트너/백업
│       ├── drivers/cloud.js    Supabase 드라이버 — 스키마 라우팅, camel↔snake 매핑
│       ├── health.js           계산 엔진 — 나이/칼로리/접종 스케줄/위험/알림
│       ├── gov.js              공공데이터 프록시 클라이언트 (캐시 5분)
│       ├── ui.js               esc(이스케이프)/toast/modal/폼 유틸
│       ├── icons.js            견종 두들 SVG 아이콘 24종
│       └── views/              화면 15+2개 (라우트당 1파일, default {head, mount})
│           ├── auth.js         로그인·가입·비번찾기·파트너(사업자) 가입 + 법정 동의
│           ├── dashboard.js    오늘 하루 (통합 알림·주간 차트·타임라인)
│           ├── profile.js      아이 프로필·체중
│           ├── diet/recipes/meds/walk/vaccine/medical/allergy/risk.js
│           ├── products.js     용품 리뷰 (data/products.json + 사용자 별점)
│           ├── community.js    수다방 — 글/댓글/추천/별점/라운지 대화창
│           ├── adopt.js        유기견 입양 (공공데이터)
│           ├── partners.js     동물병원·용품점 디렉터리 + 업체 후기  [신규]
│           ├── privacy.js      개인정보처리방침 + 내 동의 내역        [신규]
│           └── settings.js     계정/테마/백업/개인정보/giscus/공공데이터 진단
├── api/
│   ├── gov.js                  공공데이터 프록시 (서비스 화이트리스트, 키는 env)
│   └── gov-status.js           서비스키 상태 진단 (/api/gov-status)
├── data/
│   ├── breeds.json             견종 22종 위험 질환·생애주기 데이터
│   ├── vaccines.json           접종 5종·구충 4종 스케줄 기준
│   └── products.json           용품 14종 (크롤러가 가격·평점 갱신)
├── supabase/
│   ├── schema.sql              ★ DB 전체 (스키마 4개, 멱등 — 반복 실행 안전)
│   └── SETUP.md                ★ Supabase 셋업 절차 (Exposed schemas 포함)
├── tools/
│   ├── test.mjs                회귀 테스트 69건
│   ├── crawl.mjs               용품 가격·평점 수집기 (robots.txt 존중, JSON-LD만)
│   └── sources.json            크롤 대상 목록 (현재 비어 있음)
├── serve.sh                    로컬 서버 (8123, no-store) / ./serve.sh stop
├── deploy.sh                   검사(문법+테스트) 후 Vercel 운영 배포 + 접속 확인
├── vercel.json                 정적 배포 + 캐시/보안 헤더
└── .github/workflows/          CI 3종 (아래 8장)
```

---

## 4. 데이터베이스 — 영역별 스키마 분리

`supabase/schema.sql` 실행 시 Postgres 스키마 4개가 만들어진다.
**요구사항이었던 "모듈·DB 완전 분리"를 스키마 단위 물리 분리 + RLS 로 구현**했다
(인증은 Supabase Auth 공용 — 별도 프로젝트 분리는 SSO 불가·운영 복잡 트레이드오프로 채택하지 않음).

| 스키마 | 테이블 | 접근 규칙 (RLS) |
|---|---|---|
| `members` | profiles, consents(동의 이력) | 프로필 조회 공개(닉네임 표시용)·수정 본인만 / 동의 이력 본인 전용 |
| `care` | dogs + 기록 8종(meals·walks·meds·vaccines·medical·allergies·recipes·weights) + settings | **전부 본인 전용 — 타인 건강 기록은 조회 자체 차단** |
| `community` | posts, comments, post_likes(추천), post_ratings(별점), chat_messages(대화창), product_reviews, reports | 읽기 공개, 쓰기·삭제 본인 것만 |
| `partners` | partners(업체), partner_reviews | 디렉터리 공개, 등록·수정 본인 계정만 |

부가 장치:
- **도배 방지 트리거**: 글 3개/분, 댓글 10개/분, 채팅 20개/분
- **조회 뷰**: `posts_view`(추천·댓글·별점 집계), `comments_view`, `chat_view`, `reviews_view`, `partners_view`(별점 집계), `partner_reviews_view` — 전부 `security_invoker`
- **가입 트리거**: `auth.users` insert → `members.profiles` 자동 생성 (닉네임은 가입 메타데이터)
- 예전 v1(public 스키마) 정리용 주석 블록이 schema.sql 말미에 있음

> ⚠️ **스키마 실행 후 반드시** Supabase Dashboard → Project Settings → Data API →
> **Exposed schemas 에 `members, care, community, partners` 4개 추가**. 빼먹으면 로그인 후 모든 요청 실패.

클라이언트 매핑: `drivers/cloud.js` 의 `SCHEMA` 맵이 테이블→스키마를 라우팅하고
(`client().schema(s).from(t)`), `MAPS`/`COMMON` 이 camelCase↔snake_case 변환,
`clean()` 이 빈 문자열→null·숫자 문자열→숫자 정규화를 담당한다.
**새 테이블/컬럼 추가 시 이 세 곳 + `tools/test.mjs` 매핑 테스트를 같이 갱신할 것.**

---

## 5. 공공데이터 프록시 (유기견 입양)

- 브라우저 → `/api/gov?service=...` → Vercel 함수가 서비스키(`DATA_GO_KR_KEY` env)로 포털 호출
- **화이트리스트 방식**: 등록된 5개 서비스·허용 파라미터만 통과 (열린 프록시 방지)
- 키는 코드·저장소에 없음. `normalizeKey()` 가 Encoding/Decoding 어느 형태든 처리 (공백·개행 제거 포함)
- 포털 오류코드(30=키 미등록, 22=호출 한도 등)를 한국어로 변환, CDN 캐시 10분
- 진단: `/api/gov-status` 또는 앱 내 [설정 → 공공데이터 연결 → 지금 확인하기]
- **로컬 정적 서버(serve.sh)에는 /api 가 없으므로** 유기견 탭은 `vercel dev` 또는 배포본에서만 동작 (앱이 이를 안내함)

---

## 6. 커밋 히스토리

| 커밋 | 일시 | 내용 |
|---|---|---|
| `8be4e59` | 2026-08-30 | feat: 처리방침 판 상향 시 기존 회원 재동의 화면 |
| `ac278a8` | 2026-08-30 | feat: 운영자 도구 — 신고 처리 · 파트너 사업자 확인 · 회원 현황 (role/is_admin RLS) |
| `b52286c` | 2026-08-30 | docs: 개발 이관 문서(HANDOVER.md) 추가 |
| `c4bcbbb` | 2026-08-29 | feat: 영역별 DB 분리 + 개인정보 동의 + 파트너 모듈 + 추천·별점·대화창 (11개 파일, +1141/−204) |
| `912e32d` | 2026-08-29 | fix: QC 수정 — 성견 접종 안내, 크롤러 UA, 서비스키 인코딩, 로컬 캐시 (11개 파일, +64/−13) |
| `3af977f` | 2026-08-19 | feat: 공공데이터 API 연동 — 유기견 입양 정보 |
| `d4a82e4` | 2026-08-19 | feat: 정식 회원가입 + Postgres DB (Supabase) 구축 |
| `c542042` | 2026-08-19 | feat: Vercel 배포 설정 추가 |
| `1934737` | 2026-08-19 | feat: 두들 스타일 디자인 · 견종 아이콘 24종 · 말투 전면 개편 |
| `ea456d3` | 2026-08-19 | feat: 로컬 실행 스크립트(serve.sh) 추가 및 접속 문제 문서화 |
| `6b2d5a2` | 2026-08-19 | fix: 부팅 실패 시 무한 로딩 대신 원인을 화면에 표시 |
| `71768e9` | 2026-08-18 | feat: 멍케어 — 반려견 통합 건강 관리 사이트 (최초) |

※ 2026-08-30 현재 전 커밋 origin/main 반영 완료.

### 6-1. `912e32d` (QC 수정) 상세

2026-08-29 전수 QC(코드 리뷰 + 브라우저 실사용)에서 나온 문제들:

| 발견 | 수정 |
|---|---|
| 성견을 기록 없이 등록하면 퍼피 기초접종 5건이 "2682일 지남" 빨간 경고로 도배 | `health.js vaccinePlan()`: 1세 이상 + 무기록 → `needsHistory` 플래그, "과거 접종 이력 등록 필요" 안내(info 1건으로 묶음). 이력이 있으면 마지막 접종+booster 로 연간 일정 계산 |
| 크롤러 User-Agent 에 한글 → fetch 가 ByteString 오류로 **전면 실패** (수집 0건의 실제 원인) | `sources.json` UA 영문화 + `crawl.mjs` 에서 비 Latin-1 문자 제거. 로컬 픽스처 서버로 수집(✓ 가격·평점 파싱)·robots 차단(⊘) 경로 검증 완료 |
| 운영 서비스키 전 서비스 코드 30 ("등록되지 않은 서비스키") | `api/gov*.js` 에 `normalizeKey()` — Decoding 키(+,/,= 포함)를 넣어도 자동 인코딩. **배포 후에도 코드 30 이면 포털 활용신청 승인 문제** |
| serve.sh(파이썬 정적 서버)가 캐시 헤더 미전송 → 수정한 JS 가 하루 가까이 안 보임 | `Cache-Control: no-store` 를 붙이는 핸들러로 교체 |
| 긴급 알림 배지가 '이맘때 조심할 것' 메뉴에 붙는데 내용은 접종 알림 | 배지를 '오늘 하루'로 이동 |
| 로그아웃하면 다크 테마가 라이트로 풀림 / 가입 탭이 남아 있음 | `applyTheme()` 이 `bc.theme` 미러링, `authView.reset()` 을 로그아웃·계정삭제 시 호출 |
| 유기견 탭 지역·견종 목록 로드 실패 시 세션 내 재시도 없음 | 성공 전까지 재방문 때마다 재시도 + 로컬 /api 404 원인 안내 |
| 몸무게 기록 삭제 시 프로필 현재 체중 미갱신 | 남은 최신 기록으로 갱신 |

### 6-2. `c4bcbbb` (기능 확장) 상세

| 요구사항 | 구현 |
|---|---|
| 회원 관리 모듈·DB 분리 | `members` 스키마 (프로필 + 동의 이력) |
| 개인정보보호 안내·동의 (한국 법 기준) | 가입 시 **만 14세 확인 + 개인정보 수집·이용 필수 동의**(거부 시 가입 불가), "내용 보기" 모달, 동의 이력을 문서·판·일시로 보관(`members.consents` / 로컬은 user.consents). `#/privacy` 에 처리방침 전문(수집 항목·목적·보유기간 표, 제3자 제공 없음, 위탁 고지, 만14세, 권리·파기·안전조치·보호책임자·고지의무) + 내 동의 내역. 판 관리: `store.js` 의 `PRIVACY_VERSION` — **문구 수정 시 판을 올리고 재동의 받는 규칙** |
| 공유 정보·대화창 DB 분리 | `community` 스키마. 라운지 대화창(수다방 상단, 500자·분당 20개 제한·내 메시지 삭제) — `chat_messages` |
| 외부 사업자(병원·용품점) 모듈·DB 분리 | `partners` 스키마. 로그인 화면 "파트너로 함께하기" 가입(상호·업종 6종·사업자등록번호 형식 검증·지역·전화 + 동의 3종). `#/partners` 디렉터리(업종 필터, ✓확인 배지, 별점), 내 업체 정보 수정. `verified` 는 운영자가 사업자등록 확인 후 DB에서 수동 ON |
| 제안·의견 추천/별점 제도 | 수다방 '제안·의견' 글 종류 — 👍 추천(`post_likes`, 추천순 정렬) + ★ 별점(`post_ratings`, 1인 1표 갱신, 평균·참여수 표시) |

---

## 7. 실행 · 테스트 · 배포

```bash
# 로컬 실행 (http://localhost:8123, 캐시 no-store)
./serve.sh          # 끄기: ./serve.sh stop
# 유기견 탭까지 로컬에서 보려면 (서버리스 /api 에뮬레이션)
vercel dev

# 회귀 테스트 (69건) + 문법 검사
node tools/test.mjs

# 용품 크롤러 (tools/sources.json 의 targets 대상, --dry 는 파일 미기록)
node tools/crawl.mjs --dry

# 운영 배포 — 문법·테스트 통과 후 Vercel prod 배포 + 접속/자산 검증까지 자동
./deploy.sh          # 미리보기: ./deploy.sh preview
```

## 8. CI (GitHub Actions)

| 워크플로 | 트리거 | 내용 |
|---|---|---|
| `test.yml` | push(main)·PR | 문법 검사 + `tools/test.mjs` + 크롤러 dry-run |
| `crawl.yml` | 매주 월 03:00 KST·수동 | 크롤 실행 후 `data/products.json` 변경 시 봇 커밋 |
| `deploy.yml` | push(main)·수동 | **GitHub Pages 배포** — ⚠️ Pages 에는 서버리스 /api 가 없어 유기견 탭이 항상 실패. 운영 배포는 Vercel(`deploy.sh`)이며, Pages 워크플로는 유지할지 팀에서 결정 필요 |

---

## 9. 운영 체크리스트 (이관 후 해야 할 일 — 우선순위순)

1. **Supabase 셋업 + cloud 모드 전환** *(현재 운영은 브라우저 저장 모드로 도는 상태)*
   `supabase/SETUP.md` 절차대로: 프로젝트 생성(서울 리전) → `schema.sql` 통째 실행 →
   **Data API Exposed schemas 4개 추가** → Email Confirm ON + Redirect URLs
   (`https://mungcare.vercel.app`, `http://localhost:8123`) → `assets/js/config.js` 에
   Project URL·anon key 기입(anon key 는 커밋 가능, **service_role 키는 절대 금지**) → `./deploy.sh`
2. **공공데이터 서비스키**: Vercel env `DATA_GO_KR_KEY`. 현재 전 서비스 코드 30.
   `normalizeKey` 반영 배포 후 `/api/gov-status` 로 재확인 → 여전히 30이면
   공공데이터포털 마이페이지에서 "유기동물 조회 서비스 v2" **활용신청 승인 상태** 확인
3. **개인정보 보호책임자 실명·연락처 기입**: `assets/js/views/privacy.js` 8조 플레이스홀더.
   **기입 전 서비스 공개 금지** (개인정보보호법 제30조 공개 의무)
4. **처리방침 개정 규칙**: 문구 변경 시 `store.js PRIVACY_VERSION` 상향 → 신규 가입자는 새 판으로
   동의 기록되고, **기존 회원은 다음 로그인 때 재동의 화면**(앱 진입 차단)을 거침 (2026-08-30 구현)
5. **파트너 확인 운영**: 운영자 계정으로 [운영자 도구 → 파트너 확인]에서 사업자등록번호 확인 후
   [확인 처리] (운영자 승격 절차는 `supabase/SETUP.md` "운영자 계정 만들기")
6. **크롤러 가동**: `tools/sources.json` 의 `targets` 에 `{id, url}` 등록
   (id 는 `data/products.json` 의 items[].id 와 일치). 대상 사이트 약관·robots 확인 후 추가
7. `git push` — 8/29 커밋 2건 원격 반영 여부 확인

## 9-1. 모바일 앱 (Flutter) — `app/`

2026-08-30 시작. 웹 전 기능을 플레이스토어·앱스토어 공통(Flutter)으로 이식하는 프로젝트.
- **완료**: 프로젝트 스캐폴드(iOS·Android), 두들 테마 이식, **한국 표준 회원가입 모듈**
  (전체 동의 + 필수 3종[만14세·이용약관·개인정보] + 선택[마케팅] + 전문 보기 시트,
  동의 이력 판·일시·거부까지 보관), 로그인, 홈 골격. 단위 9건 + 시뮬레이터 E2E 1건.
- **이용약관 신설**: `app/lib/content/legal.dart` (웹에는 아직 없음 — 웹 가입에도 추가 예정.
  ⚠️ 초안이므로 공개 전 법률 검토 권장). DB `members.consents` 는 terms/marketing 받도록 확장됨.
- **스텁(외부 계약·키 필요)**: 소셜 로그인(카카오·구글·애플 — Supabase Auth 프로바이더 설정 필요,
  `lib/services/social_auth.dart` 주석에 절차), 휴대폰 본인인증(NICE/KCB 계약 필요,
  `lib/services/phone_verify.dart` — 개발용 모의 인증번호 000000)
- **미결정**: 번들 ID 현재 `kr.mungcare.mungcareApp` (스토어 첫 업로드 전 확정 필요),
  Supabase 연동(웹 SETUP 완료 후 CloudAuthService 추가), 나머지 15개 화면 이식

## 10. 알려진 한계 · 백로그

- **관리자 도구**: `#/admin`(운영자 도구)에서 신고 처리(상태 관리·콘텐츠 삭제)·파트너 verified·회원 현황 처리 가능 (2026-08-30 구현).
  단, **운영자 승격·강등과 계정 삭제는 여전히 Supabase 대시보드 수동** (Table Editor·Authentication)
- **이메일 인증 대기 중 동의/업체 정보**: RLS 때문에 인증 전 기록 불가 → `localStorage(mungcare.pending)` 에 보관했다가 첫 로그인(hydrate) 때 기록하는 구조. 같은 브라우저에서 인증 링크를 열어야 유실이 없음
- **낙관적 쓰기**: cloud 모드에서 서버 쓰기 실패는 토스트로만 알리고 다음 새로고침 때 서버 값으로 수렴
- 별점·추천의 화면 집계는 낙관적 계산, 정확한 값은 재로드 시 뷰 집계로 갱신
- 대화창은 폴링/실시간 구독 없음(새로고침·재방문 시 갱신) — Supabase Realtime 도입은 백로그
- 커뮤니티 글 수정 기능 없음(삭제 후 재작성), 로컬 모드 커뮤니티는 같은 브라우저 계정 간 공유되는 시뮬레이션
- `settings` 의 giscus(GitHub Discussions) 연동은 로컬 모드 전용 레거시 — cloud 전환 후 제거 검토
- 기존 v1(public 스키마) DB 가 있었던 경우 데이터 마이그레이션 스크립트는 없음 (신규 프로젝트 전제)

## 11. 테스트 데이터

로컬 모드 검증용 계정(개발 브라우저의 localStorage 에만 존재, 운영·DB 무관):
`qc@test.local`(일반, 반려견 '몽이'/말티즈 2019-03-15), `vet@test.local`(파트너 '몽몽동물병원').

## 12. 참고 문서

- `README.md` — 서비스 소개·실행 안내
- `supabase/SETUP.md` — Supabase 셋업 (10분 절차 + 트러블슈팅 표)
- `data/breeds.json` / `vaccines.json` — 도메인 기준 데이터 (수의학 참고치, 진단 아님 고지 포함)
- 테스트: `tools/test.mjs` 를 스펙 문서처럼 읽을 것 (인증·동의·접종 엔진·매핑·파트너·별점·대화창 전 규칙이 단언되어 있음)
