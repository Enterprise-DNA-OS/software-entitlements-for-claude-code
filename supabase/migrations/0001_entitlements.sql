create function touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create table accounts (
 id uuid primary key default gen_random_uuid(), code text not null, name text not null, owner text not null default '',
 purpose text not null default '', retention_review_on date, security_review_on date,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index accounts_code on accounts(lower(code));
create table products (id uuid primary key default gen_random_uuid(), code text not null, name text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create unique index products_code on products(lower(code));
create table entitlements (
 id uuid primary key default gen_random_uuid(), code text not null, account_id uuid not null references accounts,
 product_id uuid not null references products, offering text not null, plan_type text not null check(plan_type in ('subscription','perpetual')),
 state text not null default 'active' check(state in ('active','disabled','pending')),
 seats integer not null check(seats>0), observed_seats integer not null default 0 check(observed_seats>=0),
 expires_on date, grace_days integer not null default 0 check(grace_days between 0 and 90), maintenance_until date,
 contract_ref text not null default '', renewal_owner text not null default '', reviewed_on date,
 source text, source_id text, source_payload jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(plan_type='perpetual' or expires_on is not null), unique(source,source_id)
);
create unique index entitlements_code on entitlements(lower(code));
create table allocations (
 id uuid primary key default gen_random_uuid(), code text not null, entitlement_id uuid not null references entitlements,
 device_ref text not null, last_seen_on date not null default current_date, released_on date,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index allocations_code on allocations(lower(code));
create unique index active_device on allocations(entitlement_id,lower(device_ref)) where released_on is null;
create table feature_grants (
 id uuid primary key default gen_random_uuid(), entitlement_id uuid not null references entitlements,
 feature text not null, monthly_limit integer not null check(monthly_limit>=0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(entitlement_id,feature)
);
create table usage_events (
 id uuid primary key default gen_random_uuid(), entitlement_id uuid not null references entitlements,
 feature text not null, units integer not null check(units>0), event_key text not null unique, occurred_on date not null default current_date,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(entitlement_id,feature) references feature_grants(entitlement_id,feature)
);
create table tasks (
 id uuid primary key default gen_random_uuid(), code text not null, entitlement_id uuid not null references entitlements,
 title text not null, owner text not null, due_on date not null, closed_on date, resolution text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index tasks_code on tasks(lower(code));
create table audit_events (
 id uuid primary key default gen_random_uuid(), entity_id uuid not null, action text not null, actor text not null,
 detail jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create function immutable_record() returns trigger language plpgsql as $$ begin raise exception 'Append-only record'; end $$;
create trigger audit_immutable before update or delete on audit_events for each row execute function immutable_record();
create trigger usage_immutable before update or delete on usage_events for each row execute function immutable_record();
do $$ declare t text; begin
 foreach t in array array['accounts','products','entitlements','allocations','feature_grants','tasks'] loop
 execute format('create trigger touch before update on %I for each row execute function touch_updated_at()',t);
 end loop;
 foreach t in array array['accounts','products','entitlements','allocations','feature_grants','usage_events','tasks','audit_events'] loop
 execute format('alter table %I enable row level security',t); execute format('revoke all on %I from public',t);
 end loop;
end $$;
create view v_entitlements as
 select e.*, a.name as account, p.name as product,
 case when e.state<>'active' then e.state when e.plan_type='perpetual' then 'active'
 when e.expires_on>=current_date then 'active' when e.expires_on+e.grace_days>=current_date then 'grace' else 'expired' end as status,
 e.observed_seats+(select count(*)::integer from allocations x where x.entitlement_id=e.id and x.released_on is null) as used_seats,
 (select count(*)::integer from allocations x where x.entitlement_id=e.id and x.released_on is null and x.last_seen_on<current_date-30) as stale_allocations
 from entitlements e join accounts a on a.id=e.account_id join products p on p.id=e.product_id;
create view v_renewals as select code,account,product,status,expires_on,expires_on-current_date as days_left,renewal_owner,contract_ref
 from v_entitlements where plan_type='subscription' and expires_on<=current_date+60 and state<>'disabled';
create view v_seats as select code,account,product,status,seats,used_seats,seats-used_seats as available,observed_seats,stale_allocations from v_entitlements;
create view v_usage as select e.code,e.account,e.status,g.feature,g.monthly_limit,
 coalesce((select sum(u.units) from usage_events u where u.entitlement_id=e.id and u.feature=g.feature and date_trunc('month',u.occurred_on)=date_trunc('month',current_date)),0)::integer as used_units
 from v_entitlements e join feature_grants g on g.entitlement_id=e.id;
create view v_attention as
 select code,account,'renewal' as issue,expires_on as due_on,renewal_owner as owner from v_entitlements where plan_type='subscription' and expires_on<=current_date+60 and state<>'disabled'
 union all select code,account,'seat capacity',current_date,renewal_owner from v_entitlements where used_seats>=seats
 union all select code,account,'stale allocation',current_date,renewal_owner from v_entitlements where stale_allocations>0
 union all select code,account,'entitlement review',coalesce(reviewed_on+90,current_date),renewal_owner from v_entitlements where reviewed_on is null or reviewed_on<current_date-90
 union all select t.code,e.account,t.title,t.due_on,t.owner from tasks t join v_entitlements e on e.id=t.entitlement_id where t.closed_on is null;
create view v_compliance as
 select code,'IPP9: purpose missing' as issue,'https://www.privacy.org.nz/privacy-principles/9/' as source from accounts where purpose=''
 union all select code,'IPP9: retention review due','https://www.privacy.org.nz/privacy-principles/9/' from accounts where retention_review_on is null or retention_review_on<current_date
 union all select code,'IPP5: security review missing or stale','https://www.privacy.org.nz/privacy-principles/5/' from accounts where security_review_on is null or security_review_on<current_date-90
 union all select code,'Contract evidence missing','local-policy:contract-evidence' from entitlements where contract_ref='';
