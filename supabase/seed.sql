begin;
insert into accounts(id,code,name,owner,purpose,retention_review_on,security_review_on) values
('10000000-0000-4000-8000-000000000001','HARBOUR','Harbour Simulation','Mia','Software licence administration',current_date+90,current_date-10),
('10000000-0000-4000-8000-000000000002','SOUTH','Southern Instruments','Jon','',current_date-20,current_date-120),
('10000000-0000-4000-8000-000000000003','SOUTH-LAB','Southern Instruments Lab','Ari','Trial evaluation',current_date+30,null) on conflict do nothing;
insert into products(id,code,name) values
('20000000-0000-4000-8000-000000000001','SIM','Simulation Workbench'),('20000000-0000-4000-8000-000000000002','DIAG','Diagnostic Designer') on conflict do nothing;
insert into entitlements(id,code,account_id,product_id,offering,plan_type,seats,observed_seats,expires_on,grace_days,maintenance_until,contract_ref,renewal_owner,reviewed_on) values
('30000000-0000-4000-8000-000000000001','ENT-101','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Simulation Team','subscription',3,0,current_date+18,7,current_date+18,'DEMO-ORDER-101','Mia',current_date-15),
('30000000-0000-4000-8000-000000000002','ENT-102','10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','Design Team','subscription',5,5,current_date-3,7,current_date-3,'','',current_date-120),
('30000000-0000-4000-8000-000000000003','ENT-103','10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001','Lab Perpetual','perpetual',2,0,null,0,current_date-40,'DEMO-ORDER-103','Ari',null),
('30000000-0000-4000-8000-000000000004','ENT-104','10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','Old Trial','subscription',1,0,current_date-50,0,current_date-50,'DEMO-TRIAL-104','Jon',current_date-100) on conflict do nothing;
insert into allocations(id,code,entitlement_id,device_ref,last_seen_on) values
('40000000-0000-4000-8000-000000000001','SEAT-101','30000000-0000-4000-8000-000000000001','workstation-A',current_date-2),
('40000000-0000-4000-8000-000000000002','SEAT-102','30000000-0000-4000-8000-000000000001','workstation-B',current_date-70) on conflict do nothing;
insert into feature_grants(id,entitlement_id,feature,monthly_limit) values
('50000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','simulation-runs',100),
('50000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','diagnostic-runs',50) on conflict do nothing;
insert into usage_events(event_key,entitlement_id,feature,units) values
('DEMO-USAGE-101','30000000-0000-4000-8000-000000000001','simulation-runs',91) on conflict do nothing;
insert into tasks(code,entitlement_id,title,owner,due_on) values
('TASK-101','30000000-0000-4000-8000-000000000001','Confirm stale workstation allocation','Mia',current_date-4),
('TASK-102','30000000-0000-4000-8000-000000000002','Find order evidence before renewal','Jon',current_date-7) on conflict do nothing;
commit;
