-- Supabase schema helpers for Reasonly
-- Apply these in the Supabase SQL editor.

-- Organization invites (one-time tokens)
create table if not exists organization_invites (
  token uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  role text default 'member',
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone
);

alter table organization_invites
add column email text;

create table audit_logs (
  id uuid primary key default gen_random_uuid(),

  org_id uuid null,
  user_id uuid null,

  action_type text not null,
  action_metadata jsonb null,

  ip_address text null,
  user_agent text null,

  created_at timestamptz not null default now()
);

-- Indexes for fast queries
create index audit_logs_org_id_idx on audit_logs (org_id);
create index audit_logs_user_id_idx on audit_logs (user_id);
create index audit_logs_action_type_idx on audit_logs (action_type);
create index audit_logs_created_at_idx on audit_logs (created_at desc);
