-- ════════════════════════════════════════════════════════════════
--  멍케어 · 데이터베이스 스키마
--  Supabase SQL Editor 에 통째로 붙여넣고 실행하세요. 여러 번 실행해도 안전합니다.
-- ════════════════════════════════════════════════════════════════

-- ── 1. 프로필 (auth.users 확장) ─────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nick        text not null check (char_length(nick) between 1 and 20),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.profiles is '사용자 공개 프로필. 커뮤니티에 닉네임을 표시하기 위해 조회는 전체 공개.';

-- 가입 시 프로필 자동 생성 (닉네임은 회원가입 메타데이터에서 가져옴)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nick)
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
  for each row execute function public.handle_new_user();

-- ── 2. 반려견 ───────────────────────────────────────────────────
create table if not exists public.dogs (
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
create index if not exists dogs_user_idx on public.dogs(user_id);

-- ── 3. 기록 테이블 ──────────────────────────────────────────────
create table if not exists public.meals (
  id        uuid primary key default gen_random_uuid(),
  dog_id    uuid not null references public.dogs(id) on delete cascade,
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

create table if not exists public.walks (
  id        uuid primary key default gen_random_uuid(),
  dog_id    uuid not null references public.dogs(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  date      date not null,
  minutes   integer not null check (minutes >= 0),
  km        numeric(6,2),
  weather   text,
  poop      text,
  note      text,
  created_at timestamptz not null default now()
);

create table if not exists public.meds (
  id        uuid primary key default gen_random_uuid(),
  dog_id    uuid not null references public.dogs(id) on delete cascade,
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

create table if not exists public.vaccines (
  id        uuid primary key default gen_random_uuid(),
  dog_id    uuid not null references public.dogs(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  code      text not null,
  label     text,
  date      date not null,
  hospital  text,
  lot       text,
  note      text,
  created_at timestamptz not null default now()
);
create index if not exists vaccines_dog_code_idx on public.vaccines(dog_id, code, date);

create table if not exists public.medical (
  id        uuid primary key default gen_random_uuid(),
  dog_id    uuid not null references public.dogs(id) on delete cascade,
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

create table if not exists public.allergies (
  id         uuid primary key default gen_random_uuid(),
  dog_id     uuid not null references public.dogs(id) on delete cascade,
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

create table if not exists public.recipes (
  id          uuid primary key default gen_random_uuid(),
  dog_id      uuid not null references public.dogs(id) on delete cascade,
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

create table if not exists public.weights (
  id        uuid primary key default gen_random_uuid(),
  dog_id    uuid not null references public.dogs(id) on delete cascade,
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
    execute format('create index if not exists %I on public.%I(dog_id)', t || '_dog_idx', t);
    execute format('create index if not exists %I on public.%I(user_id)', t || '_user_idx', t);
  end loop;
end $$;

-- ── 4. 사용자 설정 ──────────────────────────────────────────────
create table if not exists public.settings (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ── 5. 커뮤니티 ─────────────────────────────────────────────────
create table if not exists public.posts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('free','question','request','recipe','tip')),
  title      text not null check (char_length(title) between 1 and 120),
  body       text not null check (char_length(body) between 1 and 8000),
  tags       text[] not null default '{}',
  product_id text,
  created_at timestamptz not null default now()
);
create index if not exists posts_created_idx on public.posts(created_at desc);
create index if not exists posts_kind_idx on public.posts(kind, created_at desc);

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists comments_post_idx on public.comments(post_id, created_at);

create table if not exists public.post_likes (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.product_reviews (
  id         uuid primary key default gen_random_uuid(),
  product_id text not null,
  user_id    uuid not null references auth.users(id) on delete cascade,
  stars      smallint not null check (stars between 1 and 5),
  body       text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);
create index if not exists reviews_product_idx on public.product_reviews(product_id);

create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('post','comment','review')),
  target_id   uuid not null,
  reason      text not null check (char_length(reason) between 1 and 500),
  created_at  timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);

-- ── 6. 도배 방지: 1분에 글 3개 / 댓글 10개 제한 ─────────────────
create or replace function public.check_post_rate()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.posts
      where user_id = new.user_id and created_at > now() - interval '1 minute') >= 3 then
    raise exception '조금 천천히 올려주세요! 1분에 3개까지만 쓸 수 있어요.';
  end if;
  return new;
end $$;
drop trigger if exists posts_rate_limit on public.posts;
create trigger posts_rate_limit before insert on public.posts
  for each row execute function public.check_post_rate();

create or replace function public.check_comment_rate()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.comments
      where user_id = new.user_id and created_at > now() - interval '1 minute') >= 10 then
    raise exception '댓글이 너무 빨라요! 잠시 후 다시 시도해주세요.';
  end if;
  return new;
end $$;
drop trigger if exists comments_rate_limit on public.comments;
create trigger comments_rate_limit before insert on public.comments
  for each row execute function public.check_comment_rate();

-- ── 7. RLS (행 수준 보안) ───────────────────────────────────────
-- 건강 기록: 본인 것만 읽고 쓸 수 있습니다. 커뮤니티: 읽기는 모두, 쓰기는 본인 것만.

alter table public.profiles        enable row level security;
alter table public.dogs            enable row level security;
alter table public.meals           enable row level security;
alter table public.walks           enable row level security;
alter table public.meds            enable row level security;
alter table public.vaccines        enable row level security;
alter table public.medical         enable row level security;
alter table public.allergies       enable row level security;
alter table public.recipes         enable row level security;
alter table public.weights         enable row level security;
alter table public.settings        enable row level security;
alter table public.posts           enable row level security;
alter table public.comments        enable row level security;
alter table public.post_likes      enable row level security;
alter table public.product_reviews enable row level security;
alter table public.reports         enable row level security;

-- 프로필: 조회는 전체 공개(닉네임 표시), 수정은 본인만
drop policy if exists profiles_read   on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_read   on public.profiles for select using (true);
create policy profiles_update on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- 개인 데이터: 본인 전용 (dogs + 기록 8종 + settings)
do $$
declare t text;
begin
  foreach t in array array['dogs','meals','walks','meds','vaccines','medical','allergies','recipes','weights'] loop
    execute format('drop policy if exists %I on public.%I', t || '_owner', t);
    execute format(
      'create policy %I on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t || '_owner', t);
  end loop;
end $$;

drop policy if exists settings_owner on public.settings;
create policy settings_owner on public.settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 커뮤니티: 누구나 읽고, 본인 글만 쓰고 지움
drop policy if exists posts_read on public.posts;
drop policy if exists posts_write on public.posts;
drop policy if exists posts_update on public.posts;
drop policy if exists posts_delete on public.posts;
create policy posts_read   on public.posts for select using (true);
create policy posts_write  on public.posts for insert with check (auth.uid() = user_id);
create policy posts_update on public.posts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy posts_delete on public.posts for delete using (auth.uid() = user_id);

drop policy if exists comments_read on public.comments;
drop policy if exists comments_write on public.comments;
drop policy if exists comments_delete on public.comments;
create policy comments_read   on public.comments for select using (true);
create policy comments_write  on public.comments for insert with check (auth.uid() = user_id);
create policy comments_delete on public.comments for delete using (auth.uid() = user_id);

drop policy if exists likes_read on public.post_likes;
drop policy if exists likes_write on public.post_likes;
drop policy if exists likes_delete on public.post_likes;
create policy likes_read   on public.post_likes for select using (true);
create policy likes_write  on public.post_likes for insert with check (auth.uid() = user_id);
create policy likes_delete on public.post_likes for delete using (auth.uid() = user_id);

drop policy if exists reviews_read on public.product_reviews;
drop policy if exists reviews_write on public.product_reviews;
drop policy if exists reviews_update on public.product_reviews;
drop policy if exists reviews_delete on public.product_reviews;
create policy reviews_read   on public.product_reviews for select using (true);
create policy reviews_write  on public.product_reviews for insert with check (auth.uid() = user_id);
create policy reviews_update on public.product_reviews for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy reviews_delete on public.product_reviews for delete using (auth.uid() = user_id);

-- 신고: 본인이 넣은 것만 보이고, 본인만 넣을 수 있음
drop policy if exists reports_read on public.reports;
drop policy if exists reports_write on public.reports;
create policy reports_read  on public.reports for select using (auth.uid() = reporter_id);
create policy reports_write on public.reports for insert with check (auth.uid() = reporter_id);

-- ── 8. 커뮤니티 조회용 뷰 (작성자 닉네임 · 좋아요/댓글 수 포함) ──
create or replace view public.posts_view
with (security_invoker = true) as
select
  p.*,
  pr.nick                                              as author,
  coalesce(l.cnt, 0)                                   as like_count,
  coalesce(c.cnt, 0)                                   as comment_count
from public.posts p
left join public.profiles pr on pr.id = p.user_id
left join (select post_id, count(*) cnt from public.post_likes group by post_id) l on l.post_id = p.id
left join (select post_id, count(*) cnt from public.comments  group by post_id) c on c.post_id = p.id;

create or replace view public.comments_view
with (security_invoker = true) as
select c.*, pr.nick as author
from public.comments c
left join public.profiles pr on pr.id = c.user_id;

create or replace view public.reviews_view
with (security_invoker = true) as
select r.*, pr.nick as author
from public.product_reviews r
left join public.profiles pr on pr.id = r.user_id;

-- ════════════════════════════════════════════════════════════════
--  끝. Authentication → Providers → Email 에서
--  "Confirm email" 을 켜면 가입 시 인증 메일이 발송됩니다.
-- ════════════════════════════════════════════════════════════════
