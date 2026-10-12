-- Kantong: skema database (PostgreSQL / Neon)
-- Aman dijalankan berulang kali (idempotent). Tempel seluruh isi file ini
-- ke Neon > SQL Editor lalu klik Run, atau jalankan: npm run db:migrate
-- Semua tabel berawalan kt_ supaya tidak bentrok dengan proyek lain
-- yang memakai database yang sama (misalnya tabel users milik aplikasi lain).

create table if not exists kt_users (
  id             uuid primary key default gen_random_uuid(),
  username       text not null,
  display_name   text not null default '',
  password_hash  text not null,
  token_version  integer not null default 0,
  created_at     timestamptz not null default now(),
  constraint kt_users_username_chk check (username = lower(username) and char_length(username) between 3 and 30)
);
create unique index if not exists kt_users_username_key on kt_users (username);

create table if not exists kt_categories (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references kt_users (id) on delete cascade,
  name         text not null,
  icon         text not null default '📦',
  color        text not null default '#7A8590',
  type         text not null check (type in ('in', 'out')),
  is_fallback  boolean not null default false,
  position     integer not null default 0,
  created_at   timestamptz not null default now(),
  constraint kt_categories_id_type_key unique (id, type)
);
create unique index if not exists kt_categories_user_name_type_key on kt_categories (user_id, lower(name), type);
create unique index if not exists kt_categories_one_fallback_key on kt_categories (user_id, type) where is_fallback;
create index if not exists kt_categories_user_idx on kt_categories (user_id, position);

create table if not exists kt_transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references kt_users (id) on delete cascade,
  category_id  uuid not null,
  type         text not null check (type in ('in', 'out')),
  amount       bigint not null check (amount > 0 and amount <= 999999999999),
  occurred_on  date not null,
  method       text not null default 'Tunai',
  note         text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- jenis transaksi wajib sama dengan jenis kategorinya
  constraint kt_transactions_category_fk foreign key (category_id, type) references kt_categories (id, type)
);
create index if not exists kt_transactions_user_date_idx on kt_transactions (user_id, occurred_on desc, created_at desc);
create index if not exists kt_transactions_category_idx on kt_transactions (category_id);

create table if not exists kt_budgets (
  user_id      uuid not null references kt_users (id) on delete cascade,
  category_id  uuid not null references kt_categories (id) on delete cascade,
  amount       bigint not null check (amount > 0 and amount <= 999999999999),
  updated_at   timestamptz not null default now(),
  primary key (user_id, category_id)
);

-- pembatas percobaan masuk (anti tebak kata sandi)
create table if not exists kt_auth_attempts (
  id   bigserial primary key,
  key  text not null,
  at   timestamptz not null default now()
);
create index if not exists kt_auth_attempts_key_idx on kt_auth_attempts (key, at);
