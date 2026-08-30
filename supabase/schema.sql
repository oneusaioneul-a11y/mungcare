-- ════════════════════════════════════════════════════════════════
--  멍케어 · 데이터베이스 스키마 (v2 — 영역별 스키마 분리)
--  Supabase SQL Editor 에 통째로 붙여넣고 실행하세요. 여러 번 실행해도 안전합니다.
--
--  영역이 서로 다른 데이터는 Postgres 스키마로 물리적으로 나눕니다.
--    members    회원 관리 — 프로필, 개인정보 동의 이력
--    care       개인 건강 기록 — 반려견, 밥/약/산책/접종/진료 …  (본인 외 접근 불가)
--    community  회원 간 공유 — 글, 댓글, 추천, 별점, 대화창, 용품 후기
--    partners   외부 사업자 — 동물병원·용품점 계정, 업체 후기
--
--  ⚠️ 실행 후 Dashboard → Project Settings → Data API → "Exposed schemas" 에
--     members, care, community, partners 네 개를 추가해야 API 로 접근됩니다.
--     (자세한 순서는 supabase/SETUP.md)
-- ════════════════════════════════════════════════════════════════

create schema if not exists members;
create schema if not exists care;
create schema if not exists community;
create schema if not exists partners;

-- ── 1. members — 회원 관리 ──────────────────────────────────────
create table if not exists members.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nick        text not null check (char_length(nick) between 1 and 20),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table members.profiles is '사용자 공개 프로필. 커뮤니티에 닉네임을 표시하기 위해 조회는 전체 공개.';

-- 운영자 권한. 승격은 Table Editor 에서 role 을 'admin' 으로 바꿉니다 (앱에는 승격 UI 없음).
alter table members.profiles add column if not exists role text not null default 'user';
do $$ begin
  alter table members.profiles add constraint profiles_role_chk check (role in ('user','admin'));
exception when duplicate_object then null; end $$;

-- RLS 정책에서 쓰는 운영자 판별 함수 (security definer — profiles RLS 를 우회해 role 만 확인)
create or replace function members.is_admin()
returns boolean
language sql stable security definer
set search_path = members
as $$
  select exists (select 1 from members.profiles where id = auth.uid() and role = 'admin');
$$;

-- 개인정보 동의 이력 (개인정보보호법 — 어떤 문서 몇 판에, 언제 동의했는지 보관)
create table if not exists members.consents (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  doc        text not null,
  version    text not null,
  agreed_at  timestamptz not null default now(),
  agreed     boolean not null default true    -- 선택 동의(marketing)는 거부도 이력으로 남김
);
-- 문서 종류는 앱(이용약관·마케팅)과 웹이 함께 쓰므로 명명 제약으로 관리 (확장 시 여기만 수정)
alter table members.consents drop constraint if exists consents_doc_check;
alter table members.consents add constraint consents_doc_check
  check (doc in ('privacy','age14','partner_terms','terms','marketing'));
alter table members.consents add column if not exists agreed boolean not null default true;
create index if not exists consents_user_idx on members.consents(user_id, doc);

-- 가입 시 프로필 자동 생성 (닉네임은 회원가입 메타데이터에서 가져옴)
create or replace function members.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = members
as $$
begin
  insert into members.profiles (id, nick)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nick'), ''), '집사' || substr(new.id::text, 1, 4))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function members.handle_new_user();

-- ── 2. care — 반려견과 건강 기록 ────────────────────────────────
create table if not exists care.dogs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 40),
  icon          text,
  breed         text,
  birth         date,
  sex           text check (sex in ('M','F')),
  weight        numeric(5,2) check (weight is null or weight > 0),
  activity      text,
  neutered      boolean not null default false,
  microchip     text,
  clinic        text,
  adopted_at    date,
  notes         text,
  food_name     text,
  food_kcal     integer check (food_kcal is null or food_kcal > 0),
  meals_per_day smallint check (meals_per_day is null or meals_per_day between 1 and 8),
  food_note     text,
  created_at    timestamptz not null default now()
);
create index if not exists dogs_user_idx on care.dogs(user_id);

create table if not exists care.meals (
  id        uuid primary key default gen_random_uuid(),
  dog_id    uuid not null references care.dogs(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  date      date not null,
  time      text,
  name      text not null,
  type      text,
  grams     numeric(7,1),
  kcal      integer,
  note      text,
  created_at timestamptz not null default now()
);

create table if not exists care.walks (
  id        uuid primary key default gen_random_uuid(),
  dog_id    uuid not null references care.dogs(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  date      date not null,
  minutes   integer not null check (minutes >= 0),
  km        numeric(6,2),
  weather   text,
  poop      text,
  note      text,
  created_at timestamptz not null default now()
);

create table if not exists care.meds (
  id        uuid primary key default gen_random_uuid(),
  dog_id    uuid not null references care.dogs(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  name      text not null,
  purpose   text,
  dose      text,
  freq      text,
  "from"    date,
  until     date,
  stock     numeric(7,2),
  unit      text,
  per_day   numeric(6,2),
  clinic    text,
  note      text,
  active    boolean not null default true,
  taken     date[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists care.vaccines (
  id        uuid primary key default gen_random_uuid(),
  dog_id    uuid not null references care.dogs(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  code      text not null,
  label     text,
  date      date not null,
  hospital  text,
  lot       text,
  note      text,
  created_at timestamptz not null default now()
);
create index if not exists vaccines_dog_code_idx on care.vaccines(dog_id, code, date);

create table if not exists care.medical (
  id        uuid primary key default gen_random_uuid(),
  dog_id    uuid not null references care.dogs(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  date      date not null,
  kind      text,
  title     text,
  hospital  text,
  vet       text,
  diagnosis text,
  tests     text,
  rx        text,
  next      date,
  cost      integer check (cost is null or cost >= 0),
  note      text,
  created_at timestamptz not null default now()
);

create table if not exists care.allergies (
  id         uuid primary key default gen_random_uuid(),
  dog_id     uuid not null references care.dogs(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  type       text,
  severity   text check (severity in ('high','mid','low')),
  symptoms   text,
  action     text,
  found_at   date,
  diagnosed  text,
  created_at timestamptz not null default now()
);

create table if not exists care.recipes (
  id          uuid primary key default gen_random_uuid(),
  dog_id      uuid not null references care.dogs(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  ingredients text not null,
  steps       text,
  total_g     numeric(8,1),
  total_kcal  integer,
  storage     text,
  tag         text,
  note        text,
  toxic       text[] not null default '{}',
  created_at  timestamptz not null default now()
);

create table if not exists care.weights (
  id        uuid primary key default gen_random_uuid(),
  dog_id    uuid not null references care.dogs(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  date      date not null,
  kg        numeric(5,2) not null check (kg > 0),
  note      text,
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['meals','walks','meds','vaccines','medical','allergies','recipes','weights'] loop
    execute format('create index if not exists %I on care.%I(dog_id)', t || '_dog_idx', t);
    execute format('create index if not exists %I on care.%I(user_id)', t || '_user_idx', t);
  end loop;
end $$;

create table if not exists care.settings (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ── 3. community — 회원 간 공유 영역 ────────────────────────────
create table if not exists community.posts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('free','question','request','recipe','tip','suggest')),
  title      text not null check (char_length(title) between 1 and 120),
  body       text not null check (char_length(body) between 1 and 8000),
  tags       text[] not null default '{}',
  product_id text,
  created_at timestamptz not null default now()
);
create index if not exists posts_created_idx on community.posts(created_at desc);
create index if not exists posts_kind_idx on community.posts(kind, created_at desc);

create table if not exists community.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references community.posts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists comments_post_idx on community.comments(post_id, created_at);

-- 추천 (제안·의견 포함 모든 글에 사용)
create table if not exists community.post_likes (
  post_id    uuid not null references community.posts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- 별점 (제안·의견 글에 1인 1표)
create table if not exists community.post_ratings (
  post_id    uuid not null references community.posts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  stars      smallint not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- 대화창 (라운지 채팅 — 개인 건강 기록과 완전 분리)
create table if not exists community.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists chat_created_idx on community.chat_messages(created_at desc);

create table if not exists community.product_reviews (
  id         uuid primary key default gen_random_uuid(),
  product_id text not null,
  user_id    uuid not null references auth.users(id) on delete cascade,
  stars      smallint not null check (stars between 1 and 5),
  body       text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);
create index if not exists reviews_product_idx on community.product_reviews(product_id);

create table if not exists community.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('post','comment','review','chat','partner')),
  target_id   uuid not null,
  reason      text not null check (char_length(reason) between 1 and 500),
  created_at  timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);

-- 운영자 처리 상태 (open=접수, resolved=조치 완료, dismissed=문제 없음)
alter table community.reports add column if not exists status text not null default 'open';
do $$ begin
  alter table community.reports add constraint reports_status_chk check (status in ('open','resolved','dismissed'));
exception when duplicate_object then null; end $$;
alter table community.reports add column if not exists resolved_at timestamptz;

-- 도배 방지: 1분에 글 3개 / 댓글 10개 / 채팅 20개 제한
create or replace function community.check_post_rate()
returns trigger language plpgsql security definer set search_path = community as $$
begin
  if (select count(*) from community.posts
      where user_id = new.user_id and created_at > now() - interval '1 minute') >= 3 then
    raise exception '조금 천천히 올려주세요! 1분에 3개까지만 쓸 수 있어요.';
  end if;
  return new;
end $$;
drop trigger if exists posts_rate_limit on community.posts;
create trigger posts_rate_limit before insert on community.posts
  for each row execute function community.check_post_rate();

create or replace function community.check_comment_rate()
returns trigger language plpgsql security definer set search_path = community as $$
begin
  if (select count(*) from community.comments
      where user_id = new.user_id and created_at > now() - interval '1 minute') >= 10 then
    raise exception '댓글이 너무 빨라요! 잠시 후 다시 시도해주세요.';
  end if;
  return new;
end $$;
drop trigger if exists comments_rate_limit on community.comments;
create trigger comments_rate_limit before insert on community.comments
  for each row execute function community.check_comment_rate();

create or replace function community.check_chat_rate()
returns trigger language plpgsql security definer set search_path = community as $$
begin
  if (select count(*) from community.chat_messages
      where user_id = new.user_id and created_at > now() - interval '1 minute') >= 20 then
    raise exception '조금만 천천히 이야기해요! 잠시 후 다시 보내주세요.';
  end if;
  return new;
end $$;
drop trigger if exists chat_rate_limit on community.chat_messages;
create trigger chat_rate_limit before insert on community.chat_messages
  for each row execute function community.check_chat_rate();

-- ── 4. partners — 외부 사업자 (동물병원·용품점) ─────────────────
create table if not exists partners.partners (
  id         uuid primary key references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('hospital','store','grooming','hotel','training','etc')),
  name       text not null check (char_length(name) between 1 and 60),
  biz_no     text not null check (biz_no ~ '^[0-9]{3}-?[0-9]{2}-?[0-9]{5}$'),
  tel        text,
  region     text,
  addr       text,
  url        text,
  intro      text check (intro is null or char_length(intro) <= 1000),
  verified   boolean not null default false,   -- 운영자가 사업자등록 확인 후 켭니다
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists partners_kind_idx on partners.partners(kind, region);

create table if not exists partners.partner_reviews (
  id         uuid primary key default gen_random_uuid(),
  partner_id uuid not null references partners.partners(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  stars      smallint not null check (stars between 1 and 5),
  body       text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (partner_id, user_id)
);
create index if not exists partner_reviews_idx on partners.partner_reviews(partner_id);

-- ── 5. RLS (행 수준 보안) ───────────────────────────────────────
alter table members.profiles          enable row level security;
alter table members.consents          enable row level security;
alter table care.dogs                 enable row level security;
alter table care.meals                enable row level security;
alter table care.walks                enable row level security;
alter table care.meds                 enable row level security;
alter table care.vaccines             enable row level security;
alter table care.medical              enable row level security;
alter table care.allergies            enable row level security;
alter table care.recipes              enable row level security;
alter table care.weights              enable row level security;
alter table care.settings             enable row level security;
alter table community.posts           enable row level security;
alter table community.comments        enable row level security;
alter table community.post_likes      enable row level security;
alter table community.post_ratings    enable row level security;
alter table community.chat_messages   enable row level security;
alter table community.product_reviews enable row level security;
alter table community.reports         enable row level security;
alter table partners.partners         enable row level security;
alter table partners.partner_reviews  enable row level security;

-- members: 프로필 조회는 전체 공개(닉네임 표시), 수정은 본인만. 동의 이력은 본인 전용.
drop policy if exists profiles_read   on members.profiles;
drop policy if exists profiles_update on members.profiles;
create policy profiles_read   on members.profiles for select using (true);
create policy profiles_update on members.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists consents_read  on members.consents;
drop policy if exists consents_write on members.consents;
create policy consents_read  on members.consents for select using (auth.uid() = user_id);
create policy consents_write on members.consents for insert with check (auth.uid() = user_id);

-- care: 전부 본인 전용. 남의 건강 기록은 조회 자체가 막힙니다.
do $$
declare t text;
begin
  foreach t in array array['dogs','meals','walks','meds','vaccines','medical','allergies','recipes','weights'] loop
    execute format('drop policy if exists %I on care.%I', t || '_owner', t);
    execute format(
      'create policy %I on care.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t || '_owner', t);
  end loop;
end $$;

drop policy if exists settings_owner on care.settings;
create policy settings_owner on care.settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- community: 누구나 읽고, 본인 것만 쓰고 지움
do $$
declare t text;
begin
  foreach t in array array['posts','comments','post_likes','post_ratings','chat_messages','product_reviews'] loop
    execute format('drop policy if exists %I on community.%I', t || '_read', t);
    execute format('drop policy if exists %I on community.%I', t || '_write', t);
    execute format('drop policy if exists %I on community.%I', t || '_update', t);
    execute format('drop policy if exists %I on community.%I', t || '_delete', t);
    execute format('create policy %I on community.%I for select using (true)', t || '_read', t);
    execute format('create policy %I on community.%I for insert with check (auth.uid() = user_id)', t || '_write', t);
    execute format('create policy %I on community.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t || '_update', t);
    execute format('create policy %I on community.%I for delete using (auth.uid() = user_id)', t || '_delete', t);
  end loop;
end $$;

drop policy if exists reports_read  on community.reports;
drop policy if exists reports_write on community.reports;
drop policy if exists reports_admin_update on community.reports;
create policy reports_read  on community.reports for select using (auth.uid() = reporter_id or members.is_admin());
create policy reports_write on community.reports for insert with check (auth.uid() = reporter_id);
create policy reports_admin_update on community.reports for update
  using (members.is_admin()) with check (members.is_admin());

-- 운영자: 신고된 콘텐츠 삭제 권한 (본인 삭제 정책과 별개로 추가)
do $$
declare t text;
begin
  foreach t in array array['posts','comments','chat_messages','product_reviews'] loop
    execute format('drop policy if exists %I on community.%I', t || '_admin_delete', t);
    execute format('create policy %I on community.%I for delete using (members.is_admin())', t || '_admin_delete', t);
  end loop;
end $$;

-- partners: 디렉터리는 전체 공개, 등록·수정은 본인 계정만
drop policy if exists partners_read   on partners.partners;
drop policy if exists partners_write  on partners.partners;
drop policy if exists partners_update on partners.partners;
create policy partners_read   on partners.partners for select using (true);
create policy partners_write  on partners.partners for insert with check (auth.uid() = id);
create policy partners_update on partners.partners for update using (auth.uid() = id) with check (auth.uid() = id);

-- 운영자: 사업자등록 확인 후 verified 갱신
drop policy if exists partners_admin_update on partners.partners;
create policy partners_admin_update on partners.partners for update
  using (members.is_admin()) with check (members.is_admin());

drop policy if exists partner_reviews_read   on partners.partner_reviews;
drop policy if exists partner_reviews_write  on partners.partner_reviews;
drop policy if exists partner_reviews_update on partners.partner_reviews;
drop policy if exists partner_reviews_delete on partners.partner_reviews;
create policy partner_reviews_read   on partners.partner_reviews for select using (true);
create policy partner_reviews_write  on partners.partner_reviews for insert with check (auth.uid() = user_id);
create policy partner_reviews_update on partners.partner_reviews for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy partner_reviews_delete on partners.partner_reviews for delete using (auth.uid() = user_id);
drop policy if exists partner_reviews_admin_delete on partners.partner_reviews;
create policy partner_reviews_admin_delete on partners.partner_reviews for delete using (members.is_admin());

-- ── 6. 조회용 뷰 (작성자 닉네임 · 집계 포함) ────────────────────
create or replace view community.posts_view
with (security_invoker = true) as
select
  p.*,
  pr.nick                                              as author,
  coalesce(l.cnt, 0)                                   as like_count,
  coalesce(c.cnt, 0)                                   as comment_count,
  coalesce(r.cnt, 0)                                   as rating_count,
  r.avg                                                as rating_avg
from community.posts p
left join members.profiles pr on pr.id = p.user_id
left join (select post_id, count(*) cnt from community.post_likes group by post_id) l on l.post_id = p.id
left join (select post_id, count(*) cnt from community.comments  group by post_id) c on c.post_id = p.id
left join (select post_id, count(*) cnt, round(avg(stars)::numeric, 1) avg
             from community.post_ratings group by post_id) r on r.post_id = p.id;

create or replace view community.comments_view
with (security_invoker = true) as
select c.*, pr.nick as author
from community.comments c
left join members.profiles pr on pr.id = c.user_id;

create or replace view community.chat_view
with (security_invoker = true) as
select m.*, pr.nick as author
from community.chat_messages m
left join members.profiles pr on pr.id = m.user_id;

create or replace view community.reviews_view
with (security_invoker = true) as
select r.*, pr.nick as author
from community.product_reviews r
left join members.profiles pr on pr.id = r.user_id;

-- 신고함 (security_invoker — 운영자는 전체, 일반 회원은 본인 신고만 보임)
create or replace view community.reports_view
with (security_invoker = true) as
select r.*, pr.nick as reporter
from community.reports r
left join members.profiles pr on pr.id = r.reporter_id;

create or replace view partners.partners_view
with (security_invoker = true) as
select
  p.*,
  coalesce(r.cnt, 0) as review_count,
  r.avg              as review_avg
from partners.partners p
left join (select partner_id, count(*) cnt, round(avg(stars)::numeric, 1) avg
             from partners.partner_reviews group by partner_id) r on r.partner_id = p.id;

create or replace view partners.partner_reviews_view
with (security_invoker = true) as
select r.*, pr.nick as author
from partners.partner_reviews r
left join members.profiles pr on pr.id = r.user_id;

-- ── 7. API 권한 (PostgREST 가 스키마에 접근하려면 필수) ─────────
--  실제 행 접근 제어는 위의 RLS 가 담당합니다.
do $$
declare s text;
begin
  foreach s in array array['members','care','community','partners'] loop
    execute format('grant usage on schema %I to anon, authenticated', s);
    execute format('grant all on all tables in schema %I to anon, authenticated', s);
    execute format('grant all on all sequences in schema %I to anon, authenticated', s);
    execute format('alter default privileges in schema %I grant all on tables to anon, authenticated', s);
  end loop;
end $$;

-- ── (참고) v1 public 스키마에서 넘어오는 경우 ───────────────────
--  예전 public.* 테이블을 쓰던 DB라면 아래 주석을 풀고 한 번 실행해 정리하세요.
--  (새 프로젝트라면 필요 없습니다)
-- drop view  if exists public.posts_view, public.comments_view, public.reviews_view;
-- drop table if exists public.reports, public.product_reviews, public.post_likes,
--   public.comments, public.posts, public.settings, public.weights, public.recipes,
--   public.allergies, public.medical, public.vaccines, public.meds, public.walks,
--   public.meals, public.dogs, public.profiles cascade;

-- ════════════════════════════════════════════════════════════════
--  끝. ① Data API → Exposed schemas 에 members, care, community, partners 추가
--      ② Authentication → Providers → Email 에서 "Confirm email" 켜기
-- ════════════════════════════════════════════════════════════════
