import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

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
*/
