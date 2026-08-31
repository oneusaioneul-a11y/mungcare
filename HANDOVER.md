# 멍케어(MungCare) 개발 인수인계서

> 작성 2026-08-31 · 기준 커밋 `188a287` (main) · 인수 대상: 신규 개발팀
>
> 이 문서 하나로 인수인계가 끝나도록 썼습니다. **처음 읽는다면 1~3장을 먼저** 보세요.
> 코드를 만지기 전에 **12장(이 프로젝트에서 실제로 당한 함정)** 을 꼭 읽어주세요.

---

## 1. 한눈에 보기

| 항목 | 값 |
|---|---|
| 서비스 | 멍케어 — 반려견 통합 건강 관리 (웹 + 모바일 앱) |
| 운영 URL | **https://mungcare-app.web.app** |
| 저장소 | **https://github.com/oneusaioneul-a11y/mungcare** (`main`) |
| 웹 호스팅 | Firebase Hosting — 프로젝트 `mungcare-app` |
| 앱 | Flutter (iOS·Android 공통), 번들ID `kr.mungcare.app`, 버전 `1.0.0+1` |
| DB/인증 | Supabase (Postgres + Auth) — **아직 미셋업. 현재는 기기 저장 모드** |
| 외부 API | 공공데이터포털 유기동물 조회 v2 — **서비스키 미승인 상태** |

### 계정 정리 (헷갈리기 쉬움 — 반드시 확인)

| 용도 | 계정 |
|---|---|
| GitHub (현행) | `oneusaioneul-a11y` |
| Firebase / Google | `oneusaioneul@gmail.com` |
| Apple Developer | `oneusaioneul@icloud.com` |
| 개인정보 보호책임자·문의처 | **Minsun Chin · oneusaioneul@gmail.com** |

> ⚠️ 이 저장소에는 **과거 계정 흔적**이 남아 있습니다. `origin` 리모트가 아직
> 구 저장소 `redreta/mungcare` 를 가리키고 있고 그쪽은 2026-08-30 이후 갱신되지
> 않았습니다. 푸시는 `oneusaioneul` 리모트로 합니다.
> 구 Vercel 배포(`mungcare.vercel.app`)도 옛 내용인 채 살아 있어 **정리 필요**(11장).
>
> ⚠️ `aion30643@ainuri.kr` 주소는 **어떤 산출물에도 넣지 말 것** (운영자 요청).

---

## 2. 지금 무엇이 되고, 무엇이 안 되는가

인수 시점에 가장 중요한 정보입니다.

### ✅ 동작하는 것

| 영역 | 상태 |
|---|---|
| 웹 — 건강 관리 전 기능 | 동작 (기기 저장 모드) |
| 웹 — 커뮤니티·파트너·운영자 도구 | 코드 완성, **로컬 시뮬레이션으로만** 동작 |
| 앱 — 회원가입~화식 레시피 9개 화면 | 동작 (기기 저장 모드) |
| 웹 회귀 테스트 84건 / 앱 단위 38건 / 앱 E2E | 전부 통과 |
| Firebase Hosting 배포 | 완료 |

### ❌ 막혀 있는 것과 그 이유

| 막힌 것 | 이유 | 풀려면 |
|---|---|---|
| 기기 간 동기화·정식 회원가입 | Supabase 미셋업 (`config.js` 빈 값) | 6장 |
| 앱의 커뮤니티·파트너·유기견 화면 | 서버 데이터라 Supabase 선행 | 6장 → 5장 |
| 유기견 입양 탭 (`/api/*` 404) | Blaze 전환은 완료. **서비스키 Secret 미등록**으로 Functions 배포 대기 | 7장 |
| 유기견 데이터 자체 | 공공데이터 **서비스키 미승인**(코드 30) | 7장 |
| 스토어 업로드 | 앱 등록·API 키 미발급 | 10장 |
| 소셜 로그인·휴대폰 본인인증 | 외부 계약·키 필요 → **플래그로 숨김** | 9장 |

---

## 3. 저장소 구조

```
├── index.html                  웹 진입점
├── assets/
│   ├── css/app.css             전체 스타일 (라이트/다크 토큰)
│   ├── vendor/supabase.js      supabase-js v2 자체 포함 번들 (CDN 미사용)
│   └── js/
│       ├── app.js              앱 셸 — 라우터·사이드바·테마·재동의 게이트
│       ├── config.js           ★ Supabase 연결값 (비어 있으면 기기 저장 모드)
│       ├── store.js            데이터 계층 — 인증/동의/기록/커뮤니티/파트너/운영자
│       ├── drivers/cloud.js    Supabase 드라이버 — 스키마 라우팅, camel↔snake 매핑
│       ├── health.js           계산 엔진 — 나이/칼로리/접종 스케줄/위험/알림
│       ├── icons.js            견종 두들 SVG 24종 (앱 아이콘 원본이기도 함)
│       └── views/              화면 17개 (라우트당 1파일)
├── api/                        공공데이터 프록시 핸들러 (단일 소스)
├── functions/                  ★ Firebase Functions — api/ 를 감싸기만 함
├── app/                        ★ Flutter 앱 (4장)
├── data/                       견종 22종·백신·용품 기준 데이터 (웹·앱 공용)
├── supabase/schema.sql         DB 전체 (스키마 4개, 멱등)
├── tools/                      테스트·크롤러·배포·스크린샷·아이콘 생성
├── docs/STORE-SUBMISSION.md    ★ 스토어 제출 자료 일체
├── dist/                       생성된 스크린샷·스토어 이미지
└── firebase.json               Hosting + Functions 설정
```

### 핵심 개념 — 이중 동작 모드

`assets/js/config.js` 의 Supabase 값 유무로 전체가 갈립니다.

| 모드 | 조건 | 동작 |
|---|---|---|
| **local** (현재) | config 비어 있음 | 전부 브라우저 `localStorage`(`mungcare.v2`). 자체 PBKDF2 해시 로그인 |
| **cloud** | config 채워짐 | Supabase Auth + Postgres. 쓰기는 낙관적(화면 먼저, 서버 비동기) |

**화면 코드는 모드를 모릅니다.** `store.js` 가 전부 추상화하므로, 화면을 고칠 때
모드를 신경 쓸 필요가 없습니다. 앱도 같은 구조(`AuthService` 인터페이스)입니다.

---

## 4. 모바일 앱 (`app/`)

Flutter 3.44 / Dart 3.12. 웹 기능을 이식 중이며 **기기 저장 기능은 이식 완료**.

### 화면

| 파일 | 화면 |
|---|---|
| `screens/auth/` | 약관 동의 → 가입 폼 → (본인인증) · 로그인 |
| `screens/home/` | 홈 (기능 목록 + 활성견 요약) |
| `screens/profile/` | 아이 프로필·체중, 등록/수정 폼 |
| `screens/records/` | 밥·산책·접종구충·약·진료·알러지·화식 (7개) |

### 서비스 계층

| 파일 | 역할 |
|---|---|
| `services/auth_service.dart` | 인증 인터페이스 + `LocalAuthService`. **cloud 전환 시 여기에 구현체 추가** |
| `services/dog_store.dart` | 반려견·기록 저장 (사용자별 분리) |
| `services/health.dart` | 칼로리·산책 목표 — **웹 `health.js` 와 동치** |
| `services/vaccine.dart` | 접종·구충 스케줄 — **웹 동치** |
| `services/toxic.dart` | 화식 위험 재료 10종 — **웹 동치** |
| `config/features.dart` | 미완성 기능 숨김 플래그 (9장) |

> **엔진 동치가 이 프로젝트의 핵심 규칙입니다.** 웹 `tools/test.mjs` 와 앱
> `test/*_test.dart` 가 **같은 기대값**(예: 4.2kg → RER 205kcal, 하루 급여 91g)을
> 단언합니다. 계산 규칙을 바꾸면 **웹·앱·양쪽 테스트를 함께** 고쳐야 합니다.

---

## 5. 데이터베이스 — 영역별 스키마 분리

`supabase/schema.sql` 실행 시 스키마 4개가 생깁니다. "모듈·DB 완전 분리" 요구를
**스키마 단위 물리 분리 + RLS** 로 구현했습니다.

| 스키마 | 테이블 | RLS |
|---|---|---|
| `members` | profiles(+`role`), consents | 프로필 조회 공개·수정 본인 / 동의 이력 본인 전용 |
| `care` | dogs + 기록 8종 + settings | **전부 본인 전용 — 타인 건강 기록은 조회 자체 차단** |
| `community` | posts, comments, likes, ratings, chat, reviews, reports | 읽기 공개, 쓰기·삭제 본인 것만 |
| `partners` | partners, partner_reviews | 디렉터리 공개, 수정 본인 계정만 |

부가 장치: 도배 방지 트리거(글 3/분·댓글 10/분·채팅 20/분), 집계 뷰 7종(전부
`security_invoker`), 가입 시 프로필 자동 생성 트리거, 운영자 판별 함수 `members.is_admin()`.

> ⚠️ **스키마 실행 후 반드시** Supabase → Project Settings → Data API →
> **Exposed schemas 에 `members, care, community, partners` 추가.** 빼먹으면 로그인 후
> 모든 요청이 실패합니다. (가장 흔한 셋업 실수)

클라이언트 매핑은 `drivers/cloud.js` 의 `SCHEMA`(테이블→스키마), `MAPS`/`COMMON`
(camel↔snake), `clean()`(빈 문자열→null) 세 곳입니다. **새 테이블·컬럼을 넣으면
이 세 곳과 `tools/test.mjs` 매핑 테스트를 같이 갱신하세요.**

---

## 6. 최우선 작업 — Supabase 셋업

**이것이 풀려야 나머지 절반이 진행됩니다.** 절차는 `supabase/SETUP.md` (10분).

1. 프로젝트 생성 (**서울 리전**)
2. `schema.sql` **통째로** SQL Editor 에서 Run (여러 번 실행해도 안전)
3. **Exposed schemas 4개 추가** ← 빼먹으면 전부 실패
4. Email Confirm ON + Redirect URLs (`https://mungcare-app.web.app`, `http://localhost:8123`)
5. `assets/js/config.js` 에 Project URL·anon key 기입
   - anon key 는 **커밋해도 됩니다**(공개 전제 키, 보호는 RLS 담당)
   - **`service_role` 키는 절대 코드에 넣지 마세요**
6. `tools/deploy-firebase.sh` 로 배포
7. 앱은 `AuthService` 를 구현한 `CloudAuthService` 추가 → `main.dart` 에서 교체

셋업 후 열리는 것: 정식 회원가입·기기 간 동기화, 앱의 커뮤니티·파트너 화면 이식.

---

## 7. 공공데이터 프록시 (유기견 입양)

- 브라우저 → `/api/gov?service=...` → 서버 함수가 서비스키로 포털 호출
- **화이트리스트 방식**: 등록된 서비스·파라미터만 통과 (열린 프록시 방지)
- 키는 코드에 없음. `normalizeKey()` 가 Encoding/Decoding 어느 형태든 처리
- 진단: `/api/gov-status` 또는 앱 내 [설정 → 공공데이터 연결]

**현재 상태**: 서비스키가 전 서비스 **코드 30(등록되지 않은 서비스키)**. 인코딩
문제는 이미 고쳤으므로, 남은 원인은 포털 쪽입니다 → 공공데이터포털 마이페이지에서
**"유기동물 조회 서비스 v2" 활용신청 승인 상태**를 확인하세요.

키는 Firebase Secret Manager 에 넣습니다:
```bash
firebase functions:secrets:set DATA_GO_KR_KEY --project mungcare-app
```

---

## 8. 실행 · 테스트 · 배포

```bash
# ── 웹 ──
./serve.sh                      로컬 서버 (http://localhost:8123, no-store) / stop 으로 종료
node tools/test.mjs             회귀 테스트 84건
tools/deploy-firebase.sh        검사 → Hosting + Functions 배포 → 접속 확인
tools/deploy-firebase.sh hosting   Hosting 만 (Blaze 미전환 시 이것만 가능)

# ── 앱 ──
cd app
flutter analyze && flutter test                     단위 38건
flutter test integration_test/signup_flow_test.dart -d <UDID>    E2E
flutter build ios --simulator --debug               시뮬레이터 확인용

# ── 스토어 ──
tools/ios-release.sh <TEAM_ID> <KEY_ID> <ISSUER_ID>   검사→IPA→TestFlight
tools/android-release.sh                              검사→AAB→Play internal
tools/android-release.sh production                   프로덕션 트랙

# ── 자산 생성 ──
node tools/make-app-icons.mjs                       아이콘·스플래시·Play 이미지
tools/make-screenshots.sh <UDID> <폴더명>            스토어 스크린샷
python3 tools/seed-demo.py <UDID>                   데모 데이터 주입
```

> Blaze 요금제 전환·Secret Manager API 활성화는 **완료**(2026-08-31).
> 다만 `DATA_GO_KR_KEY` Secret 이 아직 없어 Functions 배포가 실패합니다. 7장의
> `functions:secrets:set` 을 먼저 실행하세요. 그전까지는 `hosting` 인자로만 배포 가능.

### CI (GitHub Actions)

| 워크플로 | 내용 |
|---|---|
| `test.yml` | 문법 검사 + `tools/test.mjs` + 크롤러 dry-run |
| `crawl.yml` | 매주 월 03:00 KST 용품 가격 수집 → 변경 시 봇 커밋 |
| `deploy.yml` | ⚠️ **GitHub Pages 배포 — 현재 배포처(Firebase)와 불일치. 정리 필요**(11장) |

---

## 9. 이번 버전에서 숨긴 기능

Apple 심사 가이드라인 **2.1(App Completeness)** 대응입니다. 눌러도 "준비 중"만 뜨는
UI 는 대표적인 반려 사유라, `app/lib/config/features.dart` 플래그로 감췄습니다.
코드는 그대로 있으니 **플래그만 켜면 복구**됩니다.

| 기능 | 플래그 | 켜기 전 필요한 것 |
|---|---|---|
| 소셜 로그인 (카카오·구글·애플) | `Features.socialLogin` | Supabase Auth 프로바이더 + 각 플랫폼 키. **다른 소셜 로그인을 넣으면 Apple 로그인은 App Store 필수** |
| 휴대폰 본인인증 | `Features.phoneVerify` | 본인확인기관(NICE·KCB) 유료 계약 |

---

## 10. 스토어 배포

제출 자료 일체(설명·키워드·출시노트·App Privacy·데이터 안전 답안·스크린샷 목록)는
**`docs/STORE-SUBMISSION.md`** 에 있습니다. 준비된 것과 남은 것:

| 항목 | 상태 |
|---|---|
| 스크린샷 6.9"(1320×2868)·6.5"(1242×2688) 각 7장 | ✅ `dist/screenshots/` |
| Play 아이콘 512·그래픽 이미지 1024×500 | ✅ `dist/store/` |
| 등록정보·심사 답안 | ✅ |
| Android 릴리스 서명·업로드 스크립트 | ✅ |
| 개인정보처리방침 URL | ✅ 배포 완료 |
| **스토어에 앱 등록** | ❌ 양 콘솔에서 `kr.mungcare.app` 생성 필요 |
| **App Store API 키** | ❌ `.p8` + Key ID + Issuer ID + Team ID |
| **Play 서비스 계정 키** | ❌ `play-sa.json` + "출시 관리" 권한 부여 |
| **이용약관 법률 검토** | ❌ `legal.dart` 는 초안 |

### 🔑 키 인벤토리 (전부 git 제외 — 인수 시 별도 전달)

| 키 | 위치 | 비고 |
|---|---|---|
| Android 업로드 키 | `tools/android_keys/mungcare-upload.jks` + `key.properties` | **분실 시 앱 업데이트 영구 불가.** SHA-256 `F2:7E:40:FD:82:A5:39:81:93:72:BB:EA:1D:56:8D:7D:6E:E9:3E:6A:BB:A1:EB:83:D4:5A:21:09:EF:20:15:D7` |
| App Store API 키 | `tools/asc_keys/AuthKey_<KEY_ID>.p8` | 다운로드 1회만 가능 |
| Play 서비스 계정 | `tools/play_keys/play-sa.json` | |
| 공공데이터 서비스키 | Firebase Secret Manager | 저장소에 없음 |

> **인수인계 시 이 키들을 반드시 안전한 경로로 함께 전달하세요.** 저장소에는
> 없습니다. 특히 Android 업로드 키가 없으면 기존 앱을 이어서 업데이트할 수 없습니다.

---

## 11. 정리가 필요한 레거시

인수 팀이 **초기에 결정해야 할 것들**입니다.

1. **구 저장소** `redreta/mungcare` — `origin` 리모트가 여기를 가리키고 12커밋 뒤처짐.
   새 저장소로 일원화하고 `origin` 을 바꿀지 결정.
2. **구 Vercel 배포** `mungcare.vercel.app` — 옛 내용(보호책임자 이름 없음)이 살아 있음.
   심사·사용자 혼선 방지를 위해 **삭제 또는 비공개 권장**.
3. **`deploy.sh` / `vercel.json`** — Vercel 시절 유물. Firebase 로 일원화했으면 제거.
4. **`.github/workflows/deploy.yml`** — GitHub Pages 로 배포. 현재 배포처와 불일치.
5. **`settings` 의 giscus 연동** — 로컬 모드 전용 레거시. cloud 전환 후 제거 검토.

---

## 12. ⚠️ 이 프로젝트에서 실제로 당한 함정

개발 중 시간을 크게 쓴 것들입니다. **같은 데서 막히지 않도록 먼저 읽어주세요.**

| 증상 | 원인 · 대응 |
|---|---|
| 앱이 스플래시에서 멈춤 | `flutter test integration_test` 가 **`Runner.app` 을 테스트 하네스로 덮어씀**. E2E 후에는 `flutter build ios --simulator` 로 다시 빌드해 설치할 것 |
| AAB 가 디버그 키로 서명됨 | Gradle 의 `rootProject` 는 `app/android` 라 키 경로가 **두 단계 위**(`../../tools/...`). 지금은 키 미발견 시 경고를 남기고, 업로드 스크립트가 디버그 서명을 차단함 |
| `flutter build appbundle` 이 JDK 를 못 찾음 | `flutter config --jdk-dir="/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home"` |
| 웹 수정이 브라우저에 반영 안 됨 | ES 모듈은 페이지 수명 동안 캐시됨. **강제 새로고침** 필요 (서버는 `no-store` 를 이미 보냄) |
| E2E 에서 스낵바 단언 실패 | `ScaffoldMessenger` 가 스낵바를 **큐잉**함(각 4초). 고정 대기 대신 **나타날 때까지 폴링**(`pumpUntilFound`) |
| 산책 목표가 항상 45분(기본값) | 견종 크기 데이터가 로드 전이었음. `main.dart` 에서 `Breeds.names()`·`VaxData.load()` **프리로드** |
| 시뮬레이터 프리뷰 서버가 전부 404 | macOS TCC 가 프리뷰 프로세스의 `~/Desktop` 접근을 차단. 서버는 Bash 로 띄우고 `launch.json` 은 `url` attach 모드로 |
| 성견 등록 시 "2682일 지남" 경고 도배 | 퍼피 스케줄을 성견에 적용한 탓. `needsHistory` 플래그로 "과거 이력 등록 필요" 안내로 대체 — **이 규칙을 되돌리지 마세요** |
| 크롤러 수집 0건 | User-Agent 에 한글 → `fetch` 가 ByteString 오류. UA 는 Latin-1 만 |

---

## 13. 알려진 한계 · 백로그

- **운영자 도구**(`#/admin`): 신고 처리·파트너 verified·회원 현황은 앱에서 가능하나,
  **운영자 승격·강등과 계정 삭제는 Supabase 대시보드 수동**
- **이메일 인증 대기 중 동의·업체 정보**: RLS 때문에 인증 전 기록 불가 →
  `localStorage(mungcare.pending)` 에 보관 후 첫 로그인 때 기록. **같은 브라우저에서
  인증 링크를 열어야 유실이 없음**
- **낙관적 쓰기**: cloud 모드에서 서버 쓰기 실패는 토스트로만 알리고 다음 새로고침에 수렴
- 별점·추천 집계는 화면상 낙관적 계산, 정확한 값은 재로드 시 뷰 집계로 갱신
- 대화창은 폴링·실시간 구독 없음 — Supabase Realtime 도입은 백로그
- 커뮤니티 글 수정 없음(삭제 후 재작성)
- 앱은 아직 **다크 모드 전면 점검 미실시** (로그인 화면만 확인)
- 기존 v1(public 스키마) 데이터 마이그레이션 스크립트 없음 (신규 프로젝트 전제)

---

## 14. 법무 · 규정 준수 메모

- **개인정보처리방침**은 개인정보보호법 제30조상 **공개 의무**. 보호책임자 실명·연락처가
  들어가 있어야 하며 현재 기입 완료(Minsun Chin).
- **처리방침 개정 규칙**: 문구를 고치면 `store.js` 의 `PRIVACY_VERSION`(앱은
  `legal.dart` 의 `legalVersion`)을 **올리고 재동의를 받습니다.** 기존 회원은 다음
  로그인 때 재동의 화면에서 앱 진입이 차단됩니다 — 구현되어 있고 동작 확인됨.
- **이용약관은 초안**입니다. 서비스 공개 전 **법률 검토를 받으세요.**
- 건강 정보는 전부 "수의학 참고 자료이며 진단을 대신하지 않는다"는 고지와 함께
  표시됩니다. **이 고지를 제거하지 마세요.**
- 만 14세 미만 가입 차단, 마케팅 수신은 선택(거부도 이력으로 보관).

---

## 15. 테스트 계정 · 참고 문서

로컬 검증용(개발 기기에만 존재): `qc@test.local`, `vet@test.local`(파트너),
`admin@test.local`(운영자) — 비밀번호는 전부 `password123`.

| 문서 | 내용 |
|---|---|
| `docs/STORE-SUBMISSION.md` | 스토어 제출 자료 일체 |
| `supabase/SETUP.md` | Supabase 셋업 10분 절차 + 트러블슈팅 |
| `README.md` | 서비스 소개·실행 안내 |
| `tools/test.mjs` | **스펙 문서처럼 읽으세요.** 인증·동의·접종·매핑·파트너 규칙이 전부 단언되어 있음 |
| `data/breeds.json`, `vaccines.json` | 도메인 기준 데이터 (수의학 참고치) |

---

## 16. 커밋 히스토리 (최근)

| 커밋 | 내용 |
|---|---|
| `188a287` | Firebase Hosting 배포 — mungcare-app.web.app |
| `7fcd523` | 개인정보 보호책임자·문의처 기입 |
| `cdb8851` | 스토어 스크린샷 · Play 이미지 생성 |
| `4aae2c2` | 스토어 배포 준비 — Android 서명·업로드 스크립트·제출 자료 |
| `71dbf44` | 앱 아이콘 · 스플래시 (웹 두들 재사용) |
| `86ca132` | 화식 레시피 이식 — 로컬 기능 이식 완주 |
| `36a5bc8` | 약 챙기기 · 진료 기록 · 알러지 이식 |
| `ed9a64e` | 스토어 신규 계정 전환 — 번들 ID·표시 이름 |
| `8095f58` | 접종 · 구충 이식 (스케줄 엔진) |
| `be81bc7` | 밥 · 산책 기록 이식 (칼로리 엔진) |
| `e30aa33` | 아이 프로필 · 체중 이식 |
| `a89e985` | Flutter 앱 시작 — 한국 표준 회원가입 |
| `99a7e52` | 웹 가입 약관 체계 완성 (이용약관·마케팅 동의) |
| `8be4e59` | 처리방침 판 상향 시 재동의 화면 |
| `ac278a8` | 운영자 도구 — 신고·파트너 확인·회원 현황 |
| `c4bcbbb` | 영역별 DB 분리 + 개인정보 동의 + 파트너 모듈 |

전체: `git log --oneline`
