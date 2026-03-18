-- ============================================================
-- Run this entire file in your Supabase SQL Editor
-- supabase.com > your project > SQL Editor > New query
-- ============================================================

-- 1. Profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  created_at timestamptz default now() not null
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);


-- 2. Data Sources
create table public.data_sources (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  source_type text not null check (source_type in ('csv_upload', 'excel_upload', 'google_sheets')),
  file_name text,
  google_sheet_id text,
  google_sheet_name text,
  last_synced_at timestamptz,
  records_imported integer default 0,
  created_at timestamptz default now() not null
);

alter table public.data_sources enable row level security;
create policy "Users manage own data sources" on public.data_sources for all using (auth.uid() = user_id);


-- 3. Sales Records (central fact table)
create table public.sales_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  data_source_id uuid references public.data_sources(id) on delete set null,

  -- Business keys (deduplication)
  invoice_no text not null,
  item_ordered text not null,

  -- Dates
  order_date date,
  invoice_date date,

  -- Descriptive
  company text,
  packing_size text,

  -- Numeric
  total_quantity numeric(12, 4),
  product_price_ex_gst numeric(12, 4),
  product_price_inc_gst numeric(12, 4),
  total_price_ex_gst numeric(12, 4),
  total_price_inc_gst numeric(12, 4),

  -- Metadata
  raw_row jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  -- Deduplication: one row per invoice + line item per user
  unique (user_id, invoice_no, item_ordered)
);

create index idx_sales_user_id on public.sales_records(user_id);
create index idx_sales_order_date on public.sales_records(order_date);
create index idx_sales_invoice_date on public.sales_records(invoice_date);
create index idx_sales_company on public.sales_records(company);
create index idx_sales_item on public.sales_records(item_ordered);
create index idx_sales_invoice_no on public.sales_records(invoice_no);

alter table public.sales_records enable row level security;
create policy "Users manage own sales records" on public.sales_records for all using (auth.uid() = user_id);


-- 4. Chat Conversations
create table public.chat_conversations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.chat_conversations enable row level security;
create policy "Users manage own conversations" on public.chat_conversations for all using (auth.uid() = user_id);


-- 5. Chat Messages
create table public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.chat_conversations(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now() not null
);

alter table public.chat_messages enable row level security;
create policy "Users manage own messages" on public.chat_messages for all using (auth.uid() = user_id);


-- 6. Analytics Views

create or replace view public.monthly_revenue as
select
  user_id,
  date_trunc('month', order_date)::date as month,
  sum(total_price_inc_gst) as revenue_inc_gst,
  sum(total_price_ex_gst) as revenue_ex_gst,
  sum(total_quantity) as total_units,
  count(distinct invoice_no) as invoice_count
from public.sales_records
where order_date is not null
group by user_id, date_trunc('month', order_date);

create or replace view public.product_summary as
select
  user_id,
  item_ordered,
  packing_size,
  sum(total_quantity) as total_units_sold,
  sum(total_price_inc_gst) as total_revenue_inc_gst,
  count(distinct invoice_no) as times_ordered,
  count(distinct company) as unique_customers
from public.sales_records
group by user_id, item_ordered, packing_size;

create or replace view public.customer_summary as
select
  user_id,
  company,
  sum(total_price_inc_gst) as total_revenue_inc_gst,
  sum(total_quantity) as total_units_purchased,
  count(distinct invoice_no) as invoice_count,
  min(order_date) as first_order_date,
  max(order_date) as last_order_date
from public.sales_records
where company is not null
group by user_id, company;
