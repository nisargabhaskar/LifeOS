import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = !!(supabaseUrl && supabaseKey &&
  supabaseUrl !== 'your_supabase_project_url' &&
  supabaseKey !== 'your_supabase_anon_key')

// LocalStorage fallback store when Supabase is not configured
const localStore = {
  _data: JSON.parse(localStorage.getItem('lifeos_local') || '{}'),
  _save() { localStorage.setItem('lifeos_local', JSON.stringify(this._data)) },
  from(table) {
    const store = this
    if (!store._data[table]) store._data[table] = []
    return {
      _table: table,
      _filters: [],
      _orderCol: null,
      _orderAsc: true,
      _limitN: null,
      select() { return this },
      eq(col, val) { this._filters.push({ col, val }); return this },
      gte() { return this },
      lte() { return this },
      lt() { return this },
      order(col, { ascending = true } = {}) { this._orderCol = col; this._orderAsc = ascending; return this },
      limit(n) { this._limitN = n; return this },
      single() { return this },
      async then(resolve) {
        let rows = [...(store._data[this._table] || [])]
        for (const f of this._filters) rows = rows.filter(r => r[f.col] === f.val)
        if (this._orderCol) {
          rows.sort((a, b) => {
            const av = a[this._orderCol], bv = b[this._orderCol]
            return this._orderAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
          })
        }
        if (this._limitN) rows = rows.slice(0, this._limitN)
        resolve({ data: rows, error: null })
      },
      async insert(items) {
        const inserted = items.map(item => ({ ...item, id: item.id || crypto.randomUUID(), created_at: new Date().toISOString() }))
        store._data[this._table] = [...(store._data[this._table] || []), ...inserted]
        store._save()
        return { data: inserted, error: null }
      },
      async update(patch) {
        const tbl = store._data[this._table] || []
        store._data[this._table] = tbl.map(r => {
          for (const f of this._filters) if (r[f.col] !== f.val) return r
          return { ...r, ...patch }
        })
        store._save()
        return { data: null, error: null }
      },
      async delete() {
        const tbl = store._data[this._table] || []
        store._data[this._table] = tbl.filter(r => {
          for (const f of this._filters) if (r[f.col] === f.val) return false
          return true
        })
        store._save()
        return { data: null, error: null }
      }
    }
  }
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true },
      global: { headers: { 'apikey': supabaseKey } }
    })
  : localStore



/*
  SUPABASE SCHEMA — run this SQL in your Supabase SQL editor:

  create table captures (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users,
    content text not null,
    type text, -- 'note' | 'task' | 'project' | 'list' | 'finance' | 'reminder'
    ai_response text,
    action_plan jsonb,
    status text default 'active', -- 'active' | 'done' | 'archived'
    scheduled_at timestamptz,
    schedule_approved boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );

  create table tasks (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users,
    capture_id uuid references captures(id),
    title text not null,
    category text,
    due_at timestamptz,
    done boolean default false,
    created_at timestamptz default now()
  );

  create table academics (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users,
    name text not null,
    subject text,
    due_at timestamptz,
    progress int default 0,
    notes text,
    created_at timestamptz default now()
  );

  create table finance (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users,
    type text not null, -- 'income' | 'expense'
    amount numeric not null,
    category text,
    note text,
    source text default 'manual', -- 'manual' | 'notification'
    date date default current_date,
    created_at timestamptz default now()
  );

  create table reminders (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users,
    text text not null,
    remind_at timestamptz not null,
    done boolean default false,
    created_at timestamptz default now()
  );

  create table recurring_actions (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users,
    title text not null,
    frequency text not null, -- 'daily' | 'weekly' | 'monthly'
    last_done_at timestamptz,
    created_at timestamptz default now()
  );

  create table settings (
    user_id uuid references auth.users primary key,
    theme text default 'light',
    persona text default 'student',
    ai_model text default 'ollama',
    ollama_model text default 'llama3.1',
    claude_key text,
    gemini_key text,
    google_calendar_connected boolean default false,
    finance_email text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );

  -- Enable RLS
  alter table captures enable row level security;
  alter table tasks enable row level security;
  alter table academics enable row level security;
  alter table finance enable row level security;
  alter table reminders enable row level security;
  alter table recurring_actions enable row level security;
  alter table settings enable row level security;

  -- RLS policies (each user only sees their own data)
  create policy "own data" on captures for all using (auth.uid() = user_id);
  create policy "own data" on tasks for all using (auth.uid() = user_id);
  create policy "own data" on academics for all using (auth.uid() = user_id);
  create policy "own data" on finance for all using (auth.uid() = user_id);
  create policy "own data" on reminders for all using (auth.uid() = user_id);
  create policy "own data" on recurring_actions for all using (auth.uid() = user_id);
  create policy "own data" on settings for all using (auth.uid() = user_id);

create policy "allow_all" on captures for all to anon using (true) with check (true);
-- repeat for each table
create policy "allow_all" on tasks for all to anon using (true) with check (true);
-- repeat for each table
create policy "allow_all" on academics for all to anon using (true) with check (true);
-- repeat for each table
create policy "allow_all" on finance for all to anon using (true) with check (true);
-- repeat for each table
create policy "allow_all" on reminders for all to anon using (true) with check (true);
-- repeat for each table
create policy "allow_all" on recurring_actions for all to anon using (true) with check (true);
-- repeat for each table
create policy "allow_all" on settings for all to anon using (true) with check (true);
-- repeat for each table


-- Create day_plans table for persistent Today plans
CREATE TABLE IF NOT EXISTS day_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  plan_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on date for fast lookups
CREATE INDEX IF NOT EXISTS idx_day_plans_date ON day_plans(date);

-- Enable RLS (Row Level Security)
ALTER TABLE day_plans ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (adjust as needed for your auth setup)
CREATE POLICY "Allow all operations for authenticated users" ON day_plans
  FOR ALL USING (auth.role() = 'authenticated');
  */
