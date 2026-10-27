#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { getDb, REPO_ROOT } from "./lib/db.mjs";
import { table } from "./lib/format.mjs";
import { parseCsv, pick } from "./lib/csv.mjs";

export const SPECS = {
  help: "",
  accounts: "",
  products: "",
  entitlements: "",
  show: "",
  "renewals-due": "",
  "seat-review": "",
  "usage-review": "",
  "maintenance-due": "",
  attention: "",
  compliance: "",
  insights: "",
  history: "",
  "add-account": "code name owner purpose retention security actor",
  "add-product": "code name actor",
  add: "code account product offering plan seats expires grace maintenance contract owner actor",
  allocate: "code device actor",
  release: "note actor",
  heartbeat: "actor",
  renew: "expires contract note actor",
  disable: "note actor",
  enable: "note actor",
  resize: "seats note actor",
  maintain: "until note actor",
  grant: "feature limit actor",
  consume: "feature units event actor",
  "add-task": "code title owner due actor",
  "complete-task": "note actor",
  log: "note actor",
  "review-account": "purpose retention security owner actor",
  "review-entitlement": "observed-seats contract owner note actor",
  import: "source dry-run actor",
  export: "out format",
  "weekly-review": "",
  "draft-renewal": "",
  "check-access": "feature",
};
export const COMMANDS = Object.keys(SPECS);
const tables = [
  "accounts",
  "products",
  "entitlements",
  "allocations",
  "feature_grants",
  "usage_events",
  "tasks",
  "audit_events",
];
const writes = new Set([
  "add-account",
  "add-product",
  "add",
  "allocate",
  "release",
  "heartbeat",
  "renew",
  "disable",
  "enable",
  "resize",
  "maintain",
  "grant",
  "consume",
  "add-task",
  "complete-task",
  "log",
  "review-account",
  "review-entitlement",
  "import",
]);
const today = () => new Date().toISOString().slice(0, 10);
function date(s, key, optional = false) {
  if (!s && optional) return null;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(s || "") ||
    new Date(s + "T00:00:00Z").toISOString().slice(0, 10) !== s
  )
    throw Error(`Invalid ${key}: use YYYY-MM-DD`);
  return s;
}
function integer(s, key, min = 0) {
  if (
    !/^\d+$/.test(String(s)) ||
    !Number.isSafeInteger(Number(s)) ||
    Number(s) > 2147483647 ||
    Number(s) < min
  )
    throw Error(`Invalid ${key}`);
  return Number(s);
}
function required(o, k) {
  if (typeof o[k] !== "string" || !o[k].trim())
    throw Error(`Required --${k}=value`);
  return o[k].trim();
}
function code(s) {
  if (!/^[a-z0-9][a-z0-9_.:-]{0,99}$/i.test(s || ""))
    throw Error(
      "Code must use letters, numbers, dot, colon, underscore or hyphen",
    );
  return s;
}
function parse(args) {
  const pos = [],
    o = {};
  for (const a of args) {
    if (a.startsWith("--")) {
      const n = a.indexOf("=");
      const k = n < 0 ? a.slice(2) : a.slice(2, n);
      if (k in o) throw Error(`Duplicate --${k}`);
      o[k] = n < 0 ? true : a.slice(n + 1);
    } else pos.push(a);
  }
  const cmd = pos.shift() || "help";
  if (!(cmd in SPECS)) throw Error(`Unknown command ${cmd}`);
  const allowed = new Set([...SPECS[cmd].split(" "), "json"]);
  for (const k of Object.keys(o))
    if (!allowed.has(k)) throw Error(`Unknown --${k} for ${cmd}`);
  return { cmd, pos, o };
}
async function resolve(db, tableName, needle) {
  if (
    !["accounts", "products", "entitlements", "allocations", "tasks"].includes(
      tableName,
    )
  )
    throw Error("Invalid lookup");
  if (!needle) throw Error(`A ${tableName} reference is required`);
  const rows = await db.query(
    `select * from ${tableName} where lower(code)=lower($1) or id::text=$1`,
    [needle],
  );
  if (rows.length === 1) return rows[0];
  const col = ["accounts", "products"].includes(tableName)
    ? "name"
    : tableName === "entitlements"
      ? "offering"
      : tableName === "tasks"
        ? "title"
        : "device_ref";
  const exact = await db.query(
    `select * from ${tableName} where lower(${col})=lower($1)`,
    [needle],
  );
  if (exact.length === 1) return exact[0];
  if (exact.length > 1)
    throw Error(`Ambiguous ${needle}: ${exact.map((r) => r.code).join(", ")}`);
  const candidates = await db.query(
    `select * from ${tableName} where starts_with(lower(id::text),lower($1)) or position(lower($1) in lower(${col}))>0 order by code`,
    [needle],
  );
  if (candidates.length !== 1)
    throw Error(
      candidates.length
        ? `Ambiguous ${needle}: ${candidates.map((r) => `${r.code} (${r[col]})`).join(", ")}`
        : `No ${tableName} match: ${needle}`,
    );
  return candidates[0];
}
const audit = (db, id, action, actor, detail) =>
  db.query(
    "insert into audit_events(entity_id,action,actor,detail) values($1,$2,$3,$4)",
    [id, action, actor, JSON.stringify(detail)],
  );
async function locked(db, ref) {
  const e = await resolve(db, "entitlements", ref);
  await db.query("select id from entitlements where id=$1 for update", [e.id]);
  return (
    await db.query("select * from v_entitlements where id=$1", [e.id])
  )[0];
}
function usable(e) {
  if (!["active", "grace"].includes(e.status))
    throw Error(`Entitlement ${e.code} is ${e.status}`);
}
const reads = {
  accounts:
    "select code,name,owner,purpose,retention_review_on,security_review_on from accounts order by code",
  products: "select code,name from products order by code",
  entitlements:
    "select code,account,product,offering,status,seats,used_seats,expires_on from v_entitlements order by code",
  "renewals-due": "select * from v_renewals order by expires_on,code",
  "seat-review": "select * from v_seats order by code",
  "usage-review":
    "select *,monthly_limit-used_units as remaining from v_usage order by code,feature",
  "maintenance-due":
    "select code,account,product,status,maintenance_until from v_entitlements where maintenance_until<=current_date+60 order by maintenance_until,code",
  attention: "select * from v_attention order by due_on,code,issue",
  compliance: "select * from v_compliance order by code,issue",
};
export const QUESTIONS = [
  [
    "Which renewals have no named owner?",
    "select code,account,expires_on from v_entitlements where plan_type='subscription' and expires_on<=current_date+60 and renewal_owner=''",
  ],
  [
    "Which customers have stale seat allocations before renewal?",
    "select code,account,expires_on,stale_allocations from v_entitlements where stale_allocations>0 and expires_on<=current_date+60",
  ],
  [
    "Which entitlements have reached their seat allowance?",
    "select code,account,seats,used_seats from v_entitlements where used_seats>=seats",
  ],
  [
    "Which perpetual licences have expired maintenance?",
    "select code,account,maintenance_until from v_entitlements where plan_type='perpetual' and maintenance_until<current_date",
  ],
  [
    "Which licences are in a grace period without order evidence?",
    "select code,account,expires_on from v_entitlements where status='grace' and contract_ref=''",
  ],
  [
    "Which feature budgets are at least ninety percent used this month?",
    "select * from v_usage where used_units>=monthly_limit*0.9",
  ],
  [
    "Which disabled or expired licences still have allocated seats?",
    "select code,account,status,used_seats from v_entitlements where status in ('disabled','expired') and used_seats>0",
  ],
  [
    "Which imported entitlements still await reconciliation?",
    "select code,account,source,source_id from v_entitlements where source is not null and reviewed_on is null",
  ],
  [
    "Which overdue tasks sit against renewals due within sixty days?",
    "select t.code,e.account,t.title,t.owner,t.due_on,e.expires_on from tasks t join v_entitlements e on e.id=t.entitlement_id where t.closed_on is null and t.due_on<current_date and e.expires_on<=current_date+60",
  ],
  [
    "Which account retention reviews are missing or overdue?",
    "select code,name,purpose,retention_review_on from accounts where retention_review_on is null or retention_review_on<current_date",
  ],
];
function writeFile(out, contents) {
  const f = path.resolve(out);
  fs.mkdirSync(path.dirname(f), { recursive: true, mode: 0o700 });
  fs.writeFileSync(f, contents, { mode: 0o600, flag: "wx" });
  return f;
}
function draft(name, contents) {
  return writeFile(
    path.join(
      process.env.OUTPUT_DIR || REPO_ROOT,
      "drafts",
      `${name}-${Date.now()}-${process.pid}.md`,
    ),
    contents,
  );
}
async function readImport(file) {
  if (!file) throw Error("Import file required");
  if (path.extname(file).toLowerCase() === ".csv")
    return parseCsv(fs.readFileSync(file, "utf8"));
  if (path.extname(file).toLowerCase() !== ".xlsx")
    throw Error("Use a standard .xlsx report or UTF-8 .csv");
  const { default: ExcelJS } = await import("exceljs");
  const book = new ExcelJS.Workbook();
  await book.xlsx.readFile(file);
  if (book.worksheets.length !== 1)
    throw Error("Expected one worksheet; export the entitlement report alone");
  const sheet = book.worksheets[0];
  const lines = [];
  sheet.eachRow((row) => {
    const vals = [];
    for (let c = 1; c <= sheet.columnCount; c++) {
      const v = row.getCell(c).value;
      if (v && typeof v === "object" && !(v instanceof Date))
        throw Error(
          "Formula, rich text or linked spreadsheet cells need conversion to plain values",
        );
      vals.push(
        v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? ""),
      );
    }
    lines.push(vals.map((v) => '"' + v.replaceAll('"', '""') + '"').join(","));
  });
  return parseCsv(lines.join("\n"));
}
async function importRows(db, file, o) {
  const source = required(o, "source"),
    actor = required(o, "actor"),
    rows = await readImport(file);
  if (!rows.length) throw Error("No import rows");
  let added = 0,
    skipped = 0;
  for (const row of rows) {
    // Column order is configurable in Zentitle. These labels come from its entitlement report documentation.
    const sourceId = pick(row, "Entitlement ID");
    if (!sourceId) throw Error("Each row requires Entitlement ID");
    if (
      Object.keys(row).some((k) =>
        /activation code|license key|password|secret/i.test(k),
      )
    )
      throw Error("Remove credential columns before importing");
    const payload = JSON.stringify(row),
      prior = await db.query(
        "select id,source_payload from entitlements where source=$1 and source_id=$2",
        [source, sourceId],
      );
    if (prior.length) {
      const normalized = (x) =>
        JSON.stringify(
          Object.fromEntries(
            Object.entries(x).sort(([a], [b]) => a.localeCompare(b)),
          ),
        );
      if (normalized(prior[0].source_payload) !== normalized(row))
        throw Error(`Changed source row ${sourceId}; reconcile explicitly`);
      skipped++;
      continue;
    }
    const accountName = pick(row, "Customer name", "Customer"),
      productName = pick(row, "Product name", "Product"),
      offering = pick(row, "Offering name", "Offering"),
      rawPlan = pick(row, "Plan type").toLowerCase();
    if (!accountName || !productName || !offering)
      throw Error(
        `Row ${sourceId}: Customer name, Product name and Offering name required`,
      );
    const plan = rawPlan.includes("perpetual")
      ? "perpetual"
      : rawPlan.includes("subscription")
        ? "subscription"
        : null;
    if (!plan)
      throw Error(
        `Unsupported Plan type ${rawPlan}; map this plan before import`,
      );
    const seats = integer(pick(row, "Seats"), "Seats", 1),
      expires = date(
        pick(row, "Expiry date", "Expiration date", "Expires on"),
        "Expiry date",
        plan === "perpetual",
      );
    const a = await resolve(db, "accounts", accountName),
      p = await resolve(db, "products", productName);
    const [{ id }] = await db.query(
      `insert into entitlements(code,account_id,product_id,offering,plan_type,seats,expires_on,state,source,source_id,source_payload) values($1,$2,$3,$4,$5,$6,$7,'pending',$8,$9,$10) returning id`,
      [
        code(`Z-${source}-${sourceId}`),
        a.id,
        p.id,
        offering,
        plan,
        seats,
        expires,
        source,
        sourceId,
        payload,
      ],
    );
    await audit(db, id, "import", actor, { source, source_id: sourceId });
    added++;
  }
  return {
    added,
    skipped,
    dry_run: Boolean(o["dry-run"]),
    state: "pending",
    note: "Review observed seats, contract evidence and renewal owner before enabling.",
  };
}
async function run(db, { cmd, pos, o }) {
  if (cmd === "help")
    return Object.entries(SPECS).map(([command, flags]) => ({
      command,
      flags,
    }));
  if (reads[cmd]) return db.query(reads[cmd]);
  if (cmd === "insights") {
    const out = [];
    for (const [question, sql] of QUESTIONS)
      out.push({ question, rows: await db.query(sql) });
    return out;
  }
  if (cmd === "show" || cmd === "history" || cmd === "check-access") {
    const e = await resolve(db, "entitlements", pos[0]);
    if (cmd === "history")
      return db.query(
        "select action,actor,detail,created_at from audit_events where entity_id=$1 order by created_at,id",
        [e.id],
      );
    const v = (
      await db.query("select * from v_entitlements where id=$1", [e.id])
    )[0];
    if (cmd === "check-access") {
      let allowed = ["active", "grace"].includes(v.status);
      let reason = allowed
        ? "Entitlement is current"
        : `Entitlement is ${v.status}`;
      if (o.feature) {
        const g = (
          await db.query("select * from v_usage where code=$1 and feature=$2", [
            e.code,
            String(o.feature).toLowerCase(),
          ])
        )[0];
        if (!g || g.used_units >= g.monthly_limit) {
          allowed = false;
          reason = g ? "Monthly budget exhausted" : "Feature not granted";
        }
      }
      return {
        code: e.code,
        allowed,
        status: v.status,
        reason,
        scope:
          "Local recorded entitlement decision; no application enforcement",
      };
    }
    return {
      entitlement: v,
      allocations: await db.query(
        "select code,device_ref,last_seen_on,released_on from allocations where entitlement_id=$1 order by code",
        [e.id],
      ),
      features: await db.query("select * from v_usage where code=$1", [e.code]),
      tasks: await db.query(
        "select code,title,owner,due_on,closed_on,resolution from tasks where entitlement_id=$1 order by code",
        [e.id],
      ),
    };
  }
  if (cmd === "export") {
    const out = required(o, "out"),
      format = o.format || "json";
    let body;
    if (format === "json") {
      const all = {
        format: "software-entitlements-v1",
        exported_at: new Date().toISOString(),
      };
      for (const t of tables)
        all[t] = await db.query(`select * from ${t} order by id`);
      body = JSON.stringify(all, null, 2) + "\n";
    } else if (format === "csv") {
      const rows = await db.query(reads.entitlements),
        keys = [
          "code",
          "account",
          "product",
          "offering",
          "status",
          "seats",
          "used_seats",
          "expires_on",
        ];
      const cell = (x) => {
        let s = String(x ?? "");
        if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
        return '"' + s.replaceAll('"', '""') + '"';
      };
      body =
        [keys, ...rows.map((r) => keys.map((k) => r[k]))]
          .map((r) => r.map(cell).join(","))
          .join("\r\n") + "\r\n";
    } else throw Error("Export format must be json or csv");
    return { file: writeFile(out, body), format };
  }
  if (cmd === "weekly-review") {
    const sections = [];
    for (const key of ["renewals-due", "seat-review", "attention"])
      sections.push(`## ${key}\n\n${human(await db.query(reads[key]))}`);
    return {
      file: draft(
        "weekly-review",
        "# Entitlement desk weekly review\n\n" + sections.join("\n\n"),
      ),
    };
  }
  if (cmd === "draft-renewal") {
    const e = (
      await db.query("select * from v_entitlements where id=$1", [
        (await resolve(db, "entitlements", pos[0])).id,
      ])
    )[0];
    return {
      file: draft(
        `renewal-${e.code}`,
        `# Renewal review: ${e.account}\n\nDRAFT FOR INTERNAL REVIEW.\n\n${e.product}, ${e.offering}. Status: ${e.status}. Expiry: ${e.expires_on || "perpetual"}. Recorded seats: ${e.used_seats} of ${e.seats}. Owner: ${e.renewal_owner || "unassigned"}. Order reference: ${e.contract_ref || "missing"}.\n\nConfirm the customer's agreement before preparing an outward renewal offer. No price or terms are inferred.\n`,
      ),
    };
  }
  const actor = required(o, "actor");
  let id, result;
  if (cmd === "import") return importRows(db, pos[1], o);
  if (cmd === "add-account") {
    const security = date(o.security, "security", true);
    if (security && security > today())
      throw Error("Security review cannot be in the future");
    [result] = await db.query(
      "insert into accounts(code,name,owner,purpose,retention_review_on,security_review_on) values($1,$2,$3,$4,$5,$6) returning *",
      [
        code(required(o, "code")),
        required(o, "name"),
        required(o, "owner"),
        required(o, "purpose"),
        date(o.retention, "retention"),
        security,
      ],
    );
    id = result.id;
  } else if (cmd === "add-product") {
    [result] = await db.query(
      "insert into products(code,name) values($1,$2) returning *",
      [code(required(o, "code")), required(o, "name")],
    );
    id = result.id;
  } else if (cmd === "add") {
    const a = await resolve(db, "accounts", required(o, "account")),
      p = await resolve(db, "products", required(o, "product")),
      plan = required(o, "plan");
    if (!["subscription", "perpetual"].includes(plan))
      throw Error("Plan must be subscription or perpetual");
    [result] = await db.query(
      `insert into entitlements(code,account_id,product_id,offering,plan_type,seats,expires_on,grace_days,maintenance_until,contract_ref,renewal_owner,reviewed_on) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,current_date) returning *`,
      [
        code(required(o, "code")),
        a.id,
        p.id,
        required(o, "offering"),
        plan,
        integer(o.seats, "seats", 1),
        date(o.expires, "expires", plan === "perpetual"),
        integer(o.grace || "0", "grace"),
        date(o.maintenance, "maintenance", true),
        required(o, "contract"),
        required(o, "owner"),
      ],
    );
    id = result.id;
  } else if (cmd === "review-account") {
    const a = await resolve(db, "accounts", pos[0]),
      security = date(o.security, "security");
    if (security > today())
      throw Error("Security review cannot be in the future");
    [result] = await db.query(
      "update accounts set purpose=$2,retention_review_on=$3,security_review_on=$4,owner=$5 where id=$1 returning *",
      [
        a.id,
        required(o, "purpose"),
        date(o.retention, "retention"),
        security,
        required(o, "owner"),
      ],
    );
    id = a.id;
  } else if (["release", "heartbeat"].includes(cmd)) {
    let a = await resolve(db, "allocations", pos[0]);
    await locked(db, a.entitlement_id);
    [a] = await db.query("select * from allocations where id=$1 for update", [a.id]);
    if (a.released_on) throw Error("Allocation is already released");
    if (cmd === "release") {
      required(o, "note");
      [result] = await db.query(
        "update allocations set released_on=current_date where id=$1 returning *",
        [a.id],
      );
    } else
      [result] = await db.query(
        "update allocations set last_seen_on=current_date where id=$1 returning *",
        [a.id],
      );
    id = a.entitlement_id;
  } else if (cmd === "complete-task") {
    let t = await resolve(db, "tasks", pos[0]);
    [t] = await db.query("select * from tasks where id=$1 for update", [t.id]);
    if (t.closed_on) throw Error("Task already completed");
    [result] = await db.query(
      "update tasks set closed_on=current_date,resolution=$2 where id=$1 returning *",
      [t.id, required(o, "note")],
    );
    id = t.entitlement_id;
  } else {
    const e = await locked(db, pos[0]);
    id = e.id;
    if (cmd === "allocate") {
      usable(e);
      if (e.used_seats >= e.seats) throw Error("No seats available");
      [result] = await db.query(
        "insert into allocations(code,entitlement_id,device_ref) values($1,$2,$3) returning *",
        [code(required(o, "code")), id, required(o, "device")],
      );
    } else if (cmd === "renew") {
      const expiry = date(o.expires, "expires");
      required(o, "note");
      if (
        e.plan_type !== "subscription" ||
        expiry <= today() ||
        (e.expires_on && expiry <= e.expires_on)
      )
        throw Error("Renewal must extend a subscription to a future date");
      [result] = await db.query(
        "update entitlements set expires_on=$2,contract_ref=$3 where id=$1 returning *",
        [id, expiry, required(o, "contract")],
      );
    } else if (cmd === "disable" || cmd === "enable") {
      required(o, "note");
      if (
        cmd === "enable" &&
        (!e.reviewed_on || !e.contract_ref || !e.renewal_owner)
      )
        throw Error(
          "Review entitlement evidence and observed seats before enabling",
        );
      [result] = await db.query(
        "update entitlements set state=$2 where id=$1 returning *",
        [id, cmd === "disable" ? "disabled" : "active"],
      );
    } else if (cmd === "review-entitlement") {
      required(o, "note");
      [result] = await db.query(
        "update entitlements set observed_seats=$2,contract_ref=$3,renewal_owner=$4,reviewed_on=current_date where id=$1 returning *",
        [
          id,
          integer(o["observed-seats"], "observed-seats"),
          required(o, "contract"),
          required(o, "owner"),
        ],
      );
    } else if (cmd === "resize") {
      const seats = integer(o.seats, "seats", 1);
      required(o, "note");
      if (seats < e.used_seats)
        throw Error("Seat allowance cannot be below recorded usage");
      [result] = await db.query(
        "update entitlements set seats=$2 where id=$1 returning *",
        [id, seats],
      );
    } else if (cmd === "maintain") {
      const until = date(o.until, "until");
      required(o, "note");
      if (
        until <= today() ||
        (e.maintenance_until && until <= e.maintenance_until)
      )
        throw Error("Maintenance must extend to a future date");
      [result] = await db.query(
        "update entitlements set maintenance_until=$2 where id=$1 returning *",
        [id, until],
      );
    } else if (cmd === "grant") {
      [result] = await db.query(
        "insert into feature_grants(entitlement_id,feature,monthly_limit) values($1,$2,$3) on conflict(entitlement_id,feature) do update set monthly_limit=excluded.monthly_limit returning *",
        [
          id,
          code(required(o, "feature")).toLowerCase(),
          integer(o.limit, "limit"),
        ],
      );
    } else if (cmd === "consume") {
      const feature = code(required(o, "feature")).toLowerCase(),
        units = integer(o.units, "units", 1),
        event = required(o, "event");
      const prev = await db.query(
        "select * from usage_events where event_key=$1",
        [event],
      );
      if (prev.length) {
        if (
          prev[0].entitlement_id !== id ||
          prev[0].feature !== feature ||
          prev[0].units !== units
        )
          throw Error("Event key already used with different data");
        return { duplicate: true, event };
      }
      usable(e);
      const g = (
        await db.query("select * from v_usage where code=$1 and feature=$2", [
          e.code,
          feature,
        ])
      )[0];
      if (!g) throw Error("Feature not granted");
      if (g.used_units + units > g.monthly_limit)
        throw Error("Monthly usage budget exceeded");
      [result] = await db.query(
        "insert into usage_events(entitlement_id,feature,units,event_key) values($1,$2,$3,$4) returning *",
        [id, feature, units, event],
      );
    } else if (cmd === "add-task") {
      [result] = await db.query(
        "insert into tasks(code,entitlement_id,title,owner,due_on) values($1,$2,$3,$4,$5) returning *",
        [
          code(required(o, "code")),
          id,
          required(o, "title"),
          required(o, "owner"),
          date(o.due, "due"),
        ],
      );
    } else if (cmd === "log") {
      result = { code: e.code, note: required(o, "note") };
    } else throw Error(`Unimplemented command ${cmd}`);
  }
  await audit(db, id, cmd, actor, {
    ...o,
    json: undefined,
    record: result?.code,
  });
  return result;
}
export async function execute(db, args) {
  const parsed = parse(args);
  const expected =
    parsed.cmd === "import"
      ? 2
      : [
            "show",
            "history",
            "check-access",
            "draft-renewal",
            "review-account",
            "release",
            "heartbeat",
            "complete-task",
          ].includes(parsed.cmd) ||
          (writes.has(parsed.cmd) &&
            !["add-account", "add-product", "add", "import"].includes(
              parsed.cmd,
            ))
        ? 1
        : 0;
  if (parsed.pos.length !== expected)
    throw Error(`${parsed.cmd} expects ${expected} positional argument(s)`);
  if (parsed.cmd === "import" && parsed.pos[0] !== "zentitle")
    throw Error("Import source must be zentitle");
  await db.exec(writes.has(parsed.cmd) ? "BEGIN" : "BEGIN READ ONLY");
  try {
    const result = await run(db, parsed);
    await db.exec(parsed.o["dry-run"] ? "ROLLBACK" : "COMMIT");
    return result;
  } catch (e) {
    await db.exec("ROLLBACK");
    throw e;
  }
}
export function human(value) {
  if (
    Array.isArray(value) &&
    value.length &&
    value.every(
      (x) =>
        x &&
        typeof x === "object" &&
        !Object.values(x).some((v) => v && typeof v === "object"),
    )
  )
    return table(
      value,
      Object.keys(value[0]).map((k) => ({ key: k, label: k, width: 55 })),
    );
  if (Array.isArray(value) && !value.length) return "(none)";
  return JSON.stringify(value, null, 2);
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  let db;
  try {
    db = await getDb();
    const result = await execute(db, process.argv.slice(2));
    console.log(
      process.argv.includes("--json")
        ? JSON.stringify(result, null, 2)
        : human(result),
    );
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    if (db) await db.close();
  }
}
