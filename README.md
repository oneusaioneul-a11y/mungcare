# 🐕 멍케어 — 반려견 통합 건강 관리

식단·약·산책 기록부터 예방접종, 진료 기록, 알러지 관리까지 한 곳에서 관리하고,
**견종과 나이에 맞춰 조심해야 할 질환을 미리 알려주는** 반려견 건강 관리 웹 서비스입니다.

빌드 도구 없이 동작하는 정적 사이트(Vanilla JS ES Modules)로, GitHub Pages에 바로 배포됩니다.

## 주요 기능

> 말투는 “강아지 모임에서 옆자리 집사님이 말해주는 느낌”으로 맞췄어요. 다만 응급 상황 안내만은 오해 없도록 또렷하게 씁니다.

| 영역 | 내용 |
|---|---|
| 회원 | **정식 회원가입** — 이메일 인증 메일, 비밀번호 재설정, 세션 자동 갱신, 닉네임·비밀번호 변경 |
| 저장 | **Postgres(Supabase)** 서버 저장 + 기기 간 동기화. RLS로 본인 데이터만 접근. 설정이 비면 localStorage 모드로 자동 전환 |
| 반려견 프로필 | 여러 마리 등록, 견종·생년월일·성별·중성화·체중, 사람 나이 환산, 체중 추이 그래프 |
| 견종·연령 위험 알림 | 21개 견종 호발 질환 DB. 지금 나이에 해당하는 질환·전조 증상·관리법, 2년 내 주의 질환 예보, 생애주기 체크리스트, 응급 상황 가이드 |
| 예방접종 | DHPPL·코로나·켄넬코프·인플루엔자·광견병 기초 5차 + 연간 추가 접종일 **자동 계산**, 심장사상충·내외부 구충·정기검진 주기 관리 |
| 식단 관리 | RER/MER 기반 하루 권장 칼로리, 사료 kcal/kg 기준 **급여량(g) 자동 계산**, 7일 섭취 추이, 알러지 성분 자동 경고 |
| 화식 레시피 | 재료·칼로리·보관 기간 등록, **위험 식재료 10종 자동 검사**(양파·포도·자일리톨 등), 커뮤니티 공유 |
| 약 관리 | 복용 중인 약, 오늘 투약 체크, 남은 수량 기반 **재고 소진 예상 알림**, 종료 예정 알림 |
| 산책 관리 | 시간·거리·날씨·배변 기록, 견종 크기·나이별 목표, 2주 추이, 연속 산책일, 여름철·단두종 경고 |
| 진료 기록 | 병원·진단·검사·처방·재진·비용, 타임라인, 정기검진 주기 지연 알림 |
| 알러지 | 식품/약물/환경 알러젠, 심각도·증상·대처법. 식단 기록 시 교차 확인 |
| 용품 리뷰 | 목욕용품·빗·발톱·구강·귀·산책 용품 선택 가이드, 사용자 별점·후기, 리뷰 요청 게시판 |
| 유기견 입양 | **공공데이터 실시간 연동** — 농림축산검역본부 동물보호관리시스템의 유기동물 공고를 지역·견종·기간으로 검색, 보호소 연락처와 공고 마감 D-day 표시 |
| 커뮤니티 | 수다·질문·리뷰요청·레시피·꿀팁 글, 댓글, 좋아요, 신고. 서버 저장이라 실제로 여러 사람이 함께 씁니다 (도배 방지: 1분 3글/10댓글) |
| 데이터 | JSON 백업 내보내기/가져오기, 라이트·다크 모드 |
| 디자인 | 손그림(두들) 스타일 — 직접 그린 SVG 견종 아이콘 24종 + UI 아이콘 17종, 발자국 배경, 스티커형 카드, S-Core Dream 글꼴 |

### 두들 아이콘

견종 아이콘은 공통 얼굴 골격(`dogFace`)에 **귀 모양 5종 · 머리털 6종 · 주둥이 4종 · 색상**만 조합해 만듭니다.
비숑·말티즈·푸들(애프리콧/크림/블랙)·꼬통 드 툴레아를 포함해 24종이 들어 있고,
새 견종은 `assets/js/icons.js` 의 `BREED_ICONS` 에 한 줄만 추가하면 됩니다.

```bash
node tools/icons-preview.mjs   # icons-preview.html 생성 → 로컬 서버로 열어 전체 확인
```


## 서버 · 데이터베이스

정식 회원가입과 기기 간 동기화는 **Supabase(Postgres + Auth)** 로 동작합니다.
서버 코드는 없습니다 — 브라우저가 Supabase에 직접 붙고, **RLS(행 수준 보안)** 가 DB 단에서
"본인 데이터만" 을 강제합니다. 그래서 정적 배포를 그대로 유지할 수 있습니다.

```
assets/js/store.js          화면이 쓰는 유일한 데이터 API (동기 읽기 / 낙관적 쓰기)
assets/js/drivers/cloud.js  Supabase 어댑터 — 인증, 컬럼 매핑, 커뮤니티 질의
assets/js/config.js         Supabase URL / anon key  ← 여기만 채우면 켜집니다
supabase/schema.sql         테이블 16 · RLS 정책 20 · 도배 방지 트리거 2
supabase/SETUP.md           10분 설정 가이드
```

**설정 방법은 [`supabase/SETUP.md`](supabase/SETUP.md) 를 보세요.**
`config.js` 가 비어 있으면 예전처럼 브라우저에만 저장하는 로컬 모드로 자동 동작하므로,
설정 전에도 사이트는 정상적으로 열립니다.

### 데이터 모델

`profiles` · `dogs` · `meals` · `walks` · `meds` · `vaccines` · `medical` · `allergies` ·
`recipes` · `weights` · `settings` · `posts` · `comments` · `post_likes` ·
`product_reviews` · `reports`

건강 기록 테이블은 전부 `auth.uid() = user_id` 정책으로 잠겨 있어 **남의 기록은 조회조차 되지 않습니다.**
커뮤니티는 읽기 공개 / 쓰기는 본인 것만. 반려견을 지우면 관련 기록이 `on delete cascade` 로 함께 정리됩니다.

## 공공데이터 API 연동

유기견 입양 정보는 [공공데이터포털](https://www.data.go.kr) 의
**농림축산검역본부 유기동물 조회 서비스**에서 실시간으로 가져옵니다.

브라우저에서 직접 부를 수 없어요. 두 가지 이유입니다.

1. 포털이 **CORS 를 허용하지 않아** 요청이 차단됩니다.
2. 서비스키를 프론트에 두면 **그대로 노출**됩니다. (이 저장소는 공개입니다)

그래서 Vercel 서버리스 함수가 키를 들고 대신 호출합니다.

```
api/gov.js          프록시 — 허용된 서비스만 호출, 파라미터 화이트리스트, 10분 CDN 캐시
api/gov-status.js   진단 — 지금 어떤 서비스가 열려 있는지 확인
assets/js/gov.js    클라이언트 (우리 서버만 호출)
assets/js/views/adopt.js  입양 정보 화면
```

### 서비스키 설정

키는 **저장소에 절대 넣지 않습니다.** Vercel 환경변수에만 둡니다.

```bash
vercel env add DATA_GO_KR_KEY production   # 값은 stdin 으로 입력
vercel env add DATA_GO_KR_KEY preview
vercel env add DATA_GO_KR_KEY development
```

포털에서 발급받은 키는 **Encoding(URL 인코딩된) 형태 그대로** 넣으세요.
프록시가 재인코딩하지 않습니다.

### 활용신청

키를 발급받는 것만으로는 부족하고, **쓰려는 API마다 활용신청**을 해야 합니다.

1. 공공데이터포털 → `유기동물 조회 서비스` 검색 → **활용신청**
2. 자동 승인이지만 키가 실제로 열리기까지 **최대 1시간**(일부 API는 하루) 걸립니다
3. `https://mungcare-app.web.app/api/gov-status` 를 열어 상태를 확인하세요
   (앱에서는 **설정 → 공공데이터 연결 → 지금 확인하기**)

| 오류 코드 | 뜻 |
|---|---|
| 30 | 서비스키 미등록 — 활용신청이 안 됐거나 아직 반영 전 |
| 12 | 해당 API 없음 — 엔드포인트 경로 문제 |
| 22 | 일일 호출 한도 초과 |
| 20 | 접근 거부 — 승인 상태 확인 |

## 배포

### 운영 주소 — Vercel

**<https://mungcare-app.web.app>**

```bash
./deploy.sh            # 검사 → 운영 배포 → 실제 접속 확인까지 한 번에
./deploy.sh preview    # 미리보기 배포 (운영 주소는 그대로)
```

`deploy.sh` 는 배포 전에 전체 JS 문법 검사와 로직 테스트(34종)를 돌리고,
배포 후에는 실제로 사이트에 접속해 index와 주요 자산이 200으로 응답하는지까지 확인합니다.
하나라도 실패하면 0이 아닌 코드로 종료합니다.

설정은 `vercel.json` 에 있습니다. 빌드 없이 정적 파일을 그대로 서빙하고,
`data/*.json` 은 크롤러가 갱신하므로 캐시를 두지 않습니다.
`.vercelignore` 로 `tools/`, `.github/`, `README.md` 등은 배포에서 제외합니다.

> GitHub 저장소와 연결한 자동 배포(push하면 자동 반영)를 쓰려면, Vercel 계정에
> GitHub Login Connection을 추가한 뒤 프로젝트 설정에서 저장소를 연결하세요.
> 지금은 CLI 배포만 설정돼 있습니다.

### GitHub Pages (보조)

`main` 브랜치에 push하면 `.github/workflows/deploy.yml`이 GitHub Pages로 배포합니다.
저장소 **Settings → Pages → Source** 를 **GitHub Actions** 로 설정하세요.

배포 워크플로에는 `verify` 잡이 붙어 있어, 배포 후 실제 사이트에 접속해
HTTP 상태 · 주요 자산 · JS MIME 타입을 검사합니다. 게시에 실패하면 워크플로가 실패로 표시됩니다.

GitHub Pages 주소: <https://redreta.github.io/mungcare/>

#### ⚠️ 일부 네트워크에서 GitHub Pages 접속이 차단될 수 있습니다

GitHub Pages는 `185.199.108~111.153` 대역에서 서비스됩니다. 일부 국내 회선에서 이 대역이
차단되어 있어, **DNS는 정상 해석되지만 TCP 연결이 타임아웃**되는 경우가 있습니다.
(같은 증상이면 `github.github.io` 같은 GitHub 공식 Pages 사이트도 함께 열리지 않습니다.)

진단:

```bash
dig +short redreta.github.io          # 185.199.108~111.153 이 나오면 DNS는 정상
curl -I --max-time 10 https://redreta.github.io/mungcare/
curl -I --max-time 10 https://github.github.io/      # 이것도 실패하면 회선 차단
```

이 경우 사이트나 배포에는 문제가 없습니다. **이 문제 때문에 운영 주소를 Vercel로 옮겼습니다.**
GitHub Pages 배포는 백업 용도로 그대로 두었습니다.

## 용품 데이터 자동 수집

`.github/workflows/crawl.yml`이 매주 `tools/crawl.mjs`를 실행해 `data/products.json`의 가격·평점을 갱신하고,
변경이 있을 때만 커밋합니다. 사이트는 이 JSON을 읽어 화면에 표시합니다.

수집 대상은 **`tools/sources.json`의 `targets`가 비어 있으면 아무 것도 하지 않습니다.**
항목을 추가할 때 크롤러는 다음을 지킵니다.

1. 대상 호스트의 `robots.txt`를 먼저 읽어 `Disallow` 경로는 건너뜁니다.
2. 페이지에 공개된 **schema.org JSON-LD**(`Product` / `Offer` / `AggregateRating`)만 파싱합니다. 리뷰 본문이나 HTML을 복제하지 않습니다.
3. 요청 사이에 지연(기본 1.5초)을 둡니다.
4. 실패한 항목은 기존 값을 유지합니다.

```jsonc
// tools/sources.json
{
  "userAgent": "MungCareBot/1.0 (+https://github.com/OWNER/REPO)",
  "delayMs": 1500,
  "targets": [
    { "id": "brush-slicker", "url": "https://example.com/products/12345" }
  ]
}
```

> ⚠️ 대상을 추가하기 전에 해당 사이트의 **이용약관에서 자동 수집 허용 여부를 직접 확인**하세요.
> 많은 국내 쇼핑몰은 약관으로 크롤링을 금지합니다. 제휴 API(예: 오픈마켓 파트너 API)가 있다면 그쪽이 안전한 선택입니다.
> 사이트의 별점은 크롤링 값과 분리되어, **이 서비스 사용자가 직접 남긴 평가만** 반영합니다.

로컬 테스트:

```bash
node tools/crawl.mjs --dry   # 파일을 쓰지 않고 결과만 확인
node tools/crawl.mjs         # 실제 갱신
```

## 로컬 실행

```bash
./serve.sh          # 서버 실행 + 브라우저 자동 오픈 (http://localhost:8123)
./serve.sh 9000     # 다른 포트로 실행
./serve.sh stop     # 서버 중지
```

> ⚠️ **`index.html` 을 더블클릭해서 열면 동작하지 않습니다.**
> 이 사이트는 ES Modules와 `fetch`를 사용하는데, `file://` 로 열면 브라우저 보안 정책(CORS)이
> 모듈 로드를 차단해 "불러오는 중…" 화면에서 멈춥니다. 반드시 위 스크립트가 띄운
> `http://localhost:...` 주소로 접속하세요. (그렇게 열면 화면에 안내 메시지가 표시됩니다.)

## ⚠️ 데이터 저장 방식에 대한 안내

GitHub Pages는 **정적 호스팅**이라 서버와 데이터베이스가 없습니다. 따라서:

- 계정과 모든 기록은 **접속한 브라우저의 localStorage에만** 저장됩니다.
- 비밀번호는 PBKDF2로 해싱해 저장하지만, 서버 인증이 아니므로 **민감한 비밀번호를 재사용하지 마세요.**
- 브라우저 데이터를 지우거나 다른 기기·시크릿 창에서 접속하면 기록이 보이지 않습니다.
- **[설정 → 데이터 내보내기]** 로 주기적으로 백업하세요.
- 커뮤니티 글도 같은 이유로 이 브라우저에만 보입니다. 실제 다중 사용자 게시판이 필요하면
  저장소에서 Discussions를 켜고 [giscus](https://giscus.app) 값을 **[설정 → 커뮤니티 연동]** 에 입력하세요.

여러 기기 동기화와 실시간 커뮤니티가 필요하면 Supabase·Firebase 같은 BaaS로 `assets/js/store.js`의
내부 구현만 교체하면 됩니다. 모든 데이터 접근이 이 한 파일을 통과하도록 설계되어 있습니다.

## 구조

```
index.html
api/                     Vercel 서버리스 함수 (공공데이터 프록시)
serve.sh                 로컬 실행 스크립트
deploy.sh                Vercel 배포 + 접속 검증 스크립트
vercel.json              정적 서빙 · 캐시 · 보안 헤더 설정
assets/
  css/app.css            디자인 시스템 (라이트/다크, S-Core Dream 웹폰트)
  js/
    app.js               앱 셸 · 해시 라우터 · 데이터 부트스트랩
    store.js             인증 + 저장소 계층 (교체 지점)
    health.js            칼로리·연령·접종·위험 계산 엔진
    ui.js                템플릿 이스케이프 · 모달 · 토스트 · 포맷터
    icons.js             두들 SVG 아이콘 (견종 24종 + UI 17종)
    views/               화면 13종
data/
  breeds.json            견종 21종 호발 질환 · 생애주기 체크리스트
  vaccines.json          접종 프로그램 · 구충 주기
  products.json          용품 카탈로그 (크롤러가 갱신)
tools/
  crawl.mjs              robots.txt 준수 JSON-LD 수집기
  sources.json           수집 대상 목록
  test.mjs               계산·저장소 로직 회귀 테스트 (34종)
  icons-preview.mjs      아이콘 미리보기 페이지 생성
```

## 면책

이 서비스가 제공하는 모든 정보는 **일반적인 참고 자료**이며 수의학적 진단·처방을 대체하지 않습니다.
견종별 호발 질환은 "반드시 걸린다"가 아니라 "상대적으로 자주 보고된다"는 의미입니다.
이상 증상이 보이면 반드시 수의사의 진료를 받으세요.

## 라이선스

MIT
