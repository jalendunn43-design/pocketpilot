create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  monthly_income numeric not null default 0,
  savings_goal numeric not null default 500,
  spending_problem text not null default 'other',
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount numeric not null check (amount > 0),
  category text not null,
  note text,
  entry_date timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak integer not null default 0,
  last_logged_on date,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.user_stats enable row level security;

create policy "Users can read their profile"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Users can upsert their profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update their profile"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can read their transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert their transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their transactions"
  on public.transactions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their transactions"
  on public.transactions for delete
  using (auth.uid() = user_id);

create policy "Users can read their stats"
  on public.user_stats for select
  using (auth.uid() = user_id);

create policy "Users can insert their stats"
  on public.user_stats for insert
  with check (auth.uid() = user_id);

create policy "Users can update their stats"
  on public.user_stats for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
