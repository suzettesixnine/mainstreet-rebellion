-- ============================================================
-- HOWLETT HOUSE — Database Setup
-- Run this entire file in your Supabase SQL editor
-- ============================================================

-- Crew members
create table if not exists crew_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  type text not null check (type in ('family', 'production', 'management')),
  email text,
  avatar_initials text not null,
  avatar_color text not null default '#1D9E75',
  current_location text,
  status text not null default 'available' check (status in ('available', 'traveling', 'offline')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Trips / travel
create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  crew_member_id uuid references crew_members(id) on delete set null,
  destination text not null,
  country text,
  purpose text not null,
  status text not null default 'planned' check (status in ('planned', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  depart_date date not null,
  return_date date,
  hotel text,
  notes text,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Projects
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text not null default 'other' check (category in ('tv_film', 'business', 'real_estate', 'content', 'other')),
  status text not null default 'active' check (status in ('active', 'on_hold', 'completed', 'archived')),
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Project tasks
create table if not exists project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  assigned_to text,
  due_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Check-ins
create table if not exists checkins (
  id uuid primary key default gen_random_uuid(),
  crew_member_id uuid references crew_members(id) on delete set null,
  author_name text not null,
  location text not null,
  message text,
  created_at timestamptz default now()
);

-- Messages / crew board
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  from_name text not null,
  body text not null,
  pinned boolean not null default false,
  created_at timestamptz default now()
);

-- Content calendar
create table if not exists content_calendar (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  platform text not null default 'tiktok' check (platform in ('tiktok', 'youtube', 'instagram', 'other')),
  status text not null default 'ideas' check (status in ('ideas', 'scripting', 'filming', 'editing', 'ready', 'posted')),
  post_date date,
  assigned_to text,
  notes text,
  created_at timestamptz default now()
);

-- Enable Row Level Security (but allow all for now — tighten later)
alter table crew_members enable row level security;
alter table trips enable row level security;
alter table projects enable row level security;
alter table project_tasks enable row level security;
alter table checkins enable row level security;
alter table messages enable row level security;
alter table content_calendar enable row level security;

-- Open policies (authenticated users can read/write everything)
-- You can tighten these later per role
create policy "Authenticated users can do everything on crew_members"
  on crew_members for all to authenticated using (true) with check (true);

create policy "Authenticated users can do everything on trips"
  on trips for all to authenticated using (true) with check (true);

create policy "Authenticated users can do everything on projects"
  on projects for all to authenticated using (true) with check (true);

create policy "Authenticated users can do everything on project_tasks"
  on project_tasks for all to authenticated using (true) with check (true);

create policy "Authenticated users can do everything on checkins"
  on checkins for all to authenticated using (true) with check (true);

create policy "Authenticated users can do everything on messages"
  on messages for all to authenticated using (true) with check (true);

create policy "Authenticated users can do everything on content_calendar"
  on content_calendar for all to authenticated using (true) with check (true);

-- Enable realtime on all tables
alter publication supabase_realtime add table crew_members;
alter publication supabase_realtime add table trips;
alter publication supabase_realtime add table projects;
alter publication supabase_realtime add table project_tasks;
alter publication supabase_realtime add table checkins;
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table content_calendar;

-- ============================================================
-- SEED DATA — Your real projects and crew (edit as needed)
-- ============================================================

insert into crew_members (name, role, type, avatar_initials, avatar_color, status) values
  ('Jordan', 'The talent', 'family', 'JH', '#1D9E75', 'available'),
  ('Suzette', 'Mission control', 'family', 'SH', '#085041', 'available');

insert into projects (name, description, category, status, progress) values
  ('Put Down Roots — TV pitch', 'Sustainable family compound docu-series targeting Discovery+ and Netflix', 'tv_film', 'active', 65),
  ('Adventure Lab Kids', 'Kids printable challenge kits — adventurelabkids.com', 'business', 'active', 40),
  ('North SD Property Search', 'Vista / Bonsall / Fallbrook area — future compound site', 'real_estate', 'active', 25);

insert into project_tasks (project_id, title, status) values
  ((select id from projects where name = 'Put Down Roots — TV pitch'), 'Pitch deck', 'done'),
  ((select id from projects where name = 'Put Down Roots — TV pitch'), 'One-page executive summary', 'done'),
  ((select id from projects where name = 'Put Down Roots — TV pitch'), 'Sizzle reel script', 'done'),
  ((select id from projects where name = 'Put Down Roots — TV pitch'), 'Netflix follow-up', 'in_progress'),
  ((select id from projects where name = 'Put Down Roots — TV pitch'), 'Entertainment lawyer', 'todo'),
  ((select id from projects where name = 'Adventure Lab Kids'), 'Site live', 'done'),
  ((select id from projects where name = 'Adventure Lab Kids'), 'Gumroad product listed', 'done'),
  ((select id from projects where name = 'Adventure Lab Kids'), 'Connect Mailchimp', 'in_progress'),
  ((select id from projects where name = 'Adventure Lab Kids'), 'Sticker unlock in Mission HQ', 'todo'),
  ((select id from projects where name = 'Adventure Lab Kids'), 'Printable journal pages', 'todo'),
  ((select id from projects where name = 'North SD Property Search'), 'Active search — Bonsall / Fallbrook', 'in_progress'),
  ((select id from projects where name = 'North SD Property Search'), 'Compound design plan', 'todo');
