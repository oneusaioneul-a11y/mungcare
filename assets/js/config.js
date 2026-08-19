/* config.js — 서버 연결 설정
 *
 * Supabase 프로젝트를 만든 뒤 아래 두 값을 채우면 정식 회원가입과
 * 기기 간 동기화가 켜집니다. 비어 있으면 예전처럼 이 브라우저에만 저장돼요.
 *
 *   Supabase 대시보드 → Project Settings → Data API
 *     Project URL      → url
 *     anon public key  → anonKey
 *
 * anon key 는 공개되어도 되는 값입니다. 실제 데이터 보호는 DB의 RLS 정책이 합니다.
 * (supabase/schema.sql 참고 — 남의 건강 기록은 애초에 조회 자체가 막혀 있습니다.)
 */
export const CONFIG = {
  url: '',
  anonKey: ''
};

export const isCloud = () => Boolean(CONFIG.url && CONFIG.anonKey);
