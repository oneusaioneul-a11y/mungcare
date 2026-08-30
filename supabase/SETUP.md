# 서버 연결하기 (10분)

Supabase 프로젝트를 하나 만들고 값 두 개만 채우면 정식 회원가입과 기기 간 동기화가 켜집니다.
설정 전에는 예전처럼 이 브라우저에만 저장되는 모드로 동작하니, 중간에 사이트가 멈추지는 않아요.

## 1. 프로젝트 만들기

1. <https://supabase.com> 가입 (GitHub 계정으로 바로 됩니다)
2. **New project** → 이름 `mungcare`, 리전은 **Northeast Asia (Seoul)** 을 고르세요
3. Database Password 는 아무거나 정하고 따로 적어두세요 (앱에서는 안 씁니다)
4. 프로젝트가 준비될 때까지 1~2분 기다립니다

## 2. 테이블 만들기

1. 왼쪽 메뉴 **SQL Editor** → **New query**
2. 이 저장소의 `supabase/schema.sql` 내용을 **통째로 복사해서 붙여넣고** **Run**
3. `Success. No rows returned` 가 나오면 끝입니다 (여러 번 실행해도 안전해요)

영역별로 분리된 스키마 4개가 만들어집니다.

| 스키마 | 담는 것 |
|---|---|
| `members` | 프로필, 개인정보 동의 이력 |
| `care` | 반려견과 건강 기록 (본인 외 조회 불가) |
| `community` | 글·댓글·추천·별점·대화창·용품 후기 |
| `partners` | 동물병원·용품점 계정, 업체 후기 |

## 2-1. 스키마를 API에 노출하기 (중요!)

새 스키마는 기본으로 API 에 노출되지 않아요. 이걸 빼먹으면 로그인 후 모든 요청이 실패합니다.

1. **Project Settings → Data API** 로 이동
2. **Exposed schemas** 에 `members`, `care`, `community`, `partners` 네 개를 추가하고 저장
   (`public` 은 그대로 두면 됩니다)

## 3. 이메일 인증 켜기

1. **Authentication → Sign In / Providers → Email**
2. **Confirm email** 을 켭니다 → 가입 시 인증 메일이 발송됩니다
3. **Authentication → URL Configuration**
   - **Site URL**: `https://mungcare-app.web.app`
   - **Redirect URLs** 에 아래 두 줄을 추가:
     ```
     https://mungcare-app.web.app
     http://localhost:8123
     ```
   (로컬에서 테스트하려면 두 번째 줄이 필요합니다)

> 기본 메일 발송량은 시간당 몇 통으로 제한됩니다. 실제 사용자가 늘면
> **Authentication → Emails → SMTP Settings** 에서 자기 메일 서비스를 연결하세요.

## 4. 앱에 연결하기

1. **Project Settings → Data API** 에서 두 값을 복사
   - `Project URL`
   - `anon` `public` key
2. `assets/js/config.js` 를 열어 채웁니다:

```js
export const CONFIG = {
  url: 'https://xxxxxxxxxxxx.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6...'
};
```

3. 배포:

```bash
./deploy.sh
```

## anon key 를 커밋해도 되나요?

네, 괜찮습니다. anon key 는 브라우저에 노출되는 걸 전제로 만들어진 공개 키예요.
실제 데이터 보호는 DB의 **RLS 정책**이 합니다 — `schema.sql` 에서 남의 건강 기록은
조회 자체가 막혀 있고(`auth.uid() = user_id`), 커뮤니티 글도 본인 것만 수정·삭제할 수 있습니다.

절대 커밋하면 안 되는 건 **`service_role` key** 입니다. 이건 RLS를 통째로 무시하니
앱 코드 어디에도 넣지 마세요.

## 운영자 계정 만들기

신고 처리 · 파트너 사업자 확인 · 회원 현황을 보는 **운영자 도구**(사이드바 → 운영자 도구)는
`role` 이 `admin` 인 계정에만 보입니다. 승격은 앱에 없고 대시보드에서 합니다:

1. 앱에서 운영자로 쓸 계정으로 **먼저 가입** (이메일 인증까지 완료)
2. Supabase **Table Editor** → 스키마를 `members` 로 바꾸고 **profiles** 열기
3. 해당 계정 행의 `role` 을 `user` → `admin` 으로 수정
4. 앱에서 로그아웃 후 다시 로그인하면 사이드바에 [운영자 도구]가 나타남

서버 쪽 권한(신고 전체 조회·콘텐츠 삭제·verified 갱신)은 RLS 의 `members.is_admin()` 이
강제하므로, 화면만 흉내 내서는 아무것도 할 수 없습니다.

## 잘 되는지 확인

1. 사이트에서 회원가입 → 메일함에 인증 메일이 오는지
2. 링크 클릭 → 자동으로 로그인되는지
3. 아이 등록하고 산책 기록 남긴 뒤, **다른 브라우저에서 로그인**했을 때 그대로 보이는지
4. Supabase **Table Editor** 에서 스키마를 `care` 로 바꾸면 **dogs** 에 행이 들어갔는지 (동의 이력은 `members.consents`)

## 문제가 생기면

| 증상 | 원인 |
|---|---|
| 가입은 되는데 메일이 안 옴 | Confirm email 이 꺼져 있거나 발송 한도 초과. 스팸함도 확인 |
| 인증 링크를 눌러도 로그인 안 됨 | Redirect URLs 에 해당 주소가 없음 |
| 기록이 저장 안 되고 토스트로 오류 | SQL 이 일부만 실행됨. `schema.sql` 을 다시 통째로 Run |
| `column ... does not exist` | 스키마 버전이 앱보다 오래됨. `schema.sql` 다시 실행 |
| 로그인 직후 모든 요청 실패 / `The schema must be one of ...` | **2-1 단계 누락** — Exposed schemas 에 4개 스키마 추가 |
