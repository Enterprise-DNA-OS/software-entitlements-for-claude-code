import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { getDb, REPO_ROOT } from "./lib/db.mjs";
import { migrate } from "./migrate.mjs";
import { execute, COMMANDS } from "./entitlements.mjs";
import { parseCsv } from "./lib/csv.mjs";
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "entitlements-test-"));
process.env.DATA_DIR = path.join(temp, "db");
process.env.OUTPUT_DIR = temp;
// Never inherit a business database into a smoke test. Explicit TEST_DATABASE_URL must be disposable.
if (process.env.TEST_DATABASE_URL)
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
else process.env.DATABASE_URL = "";
const db = await getDb(),
  seen = new Set();
const call = async (cmd, ...args) => {
  seen.add(cmd);
  return execute(db, [cmd, ...args]);
};
const actor = "--actor=Test operator";
const far = "2035-12-31";
const now = new Date().toISOString().slice(0, 10);
const runFile = (file, args = []) => {
  const p = spawnSync(process.execPath, [file, ...args], {
    cwd: REPO_ROOT,
    env: process.env,
    encoding: "utf8",
  });
  assert.equal(p.status, 0, p.stderr || p.stdout);
  return p.stdout;
};
try {
  assert.ok((await migrate(db)).ran.length);
  assert.equal((await migrate(db)).ran.length, 0);
  const seed = fs.readFileSync(
    path.join(REPO_ROOT, "supabase/seed.sql"),
    "utf8",
  );
  await db.exec(seed);
  await db.exec(seed);
  assert.equal(
    (await db.query("select count(*)::int n from entitlements"))[0].n,
    4,
  );
  for (const cmd of [
    "help",
    "accounts",
    "products",
    "entitlements",
    "renewals-due",
    "seat-review",
    "usage-review",
    "maintenance-due",
    "attention",
    "compliance",
    "insights",
  ])
    assert.ok((await call(cmd)).length > 0, cmd);
  assert.equal((await call("insights")).length, 10);
  assert.equal((await call("show", "ent-101")).entitlement.code, "ENT-101");
  assert.equal(
    (await call("show", "30000000-0000-4000-8000-000000000001")).entitlement
      .code,
    "ENT-101",
  );
  await assert.rejects(() => call("show", "Team"), /Ambiguous/);
  assert.equal((await call("check-access", "ENT-104")).allowed, false);
  assert.equal(
    (await call("check-access", "ENT-101", "--feature=simulation-runs"))
      .allowed,
    true,
  );
  assert.equal(
    (await call("check-access", "ENT-101", "--feature=missing")).allowed,
    false,
  );
  await call(
    "add-account",
    "--code=NEW",
    "--name=New Test Customer",
    "--owner=Test",
    "--purpose=Licensing",
    `--retention=${far}`,
    `--security=${now}`,
    actor,
  );
  await assert.rejects(
    () =>
      call(
        "add-account",
        "--code=new",
        "--name=Duplicate",
        "--owner=Test",
        "--purpose=Licensing",
        `--retention=${far}`,
        actor,
      ),
    /unique/,
  );
  await call("add-product", "--code=NEW-P", "--name=New Product", actor);
  await call(
    "add",
    "--code=ENT-NEW",
    "--account=NEW",
    "--product=NEW-P",
    "--offering=New plan",
    "--plan=subscription",
    "--seats=1",
    `--expires=${far}`,
    "--contract=ORDER-NEW",
    "--owner=Test",
    actor,
  );
  await assert.rejects(
    () =>
      call(
        "add",
        "--code=BAD",
        "--account=NEW",
        "--product=NEW-P",
        "--offering=New",
        "--plan=subscription",
        "--seats=-1",
        `--expires=${far}`,
        "--contract=X",
        "--owner=Test",
        actor,
      ),
    /Invalid seats/,
  );
  await call(
    "allocate",
    "ENT-NEW",
    "--code=ALLOC-NEW",
    "--device=test-device",
    actor,
  );
  await assert.rejects(
    () =>
      call("allocate", "ENT-NEW", "--code=ALLOC-OVER", "--device=other", actor),
    /No seats/,
  );
  await call("heartbeat", "ALLOC-NEW", actor);
  await call("release", "ALLOC-NEW", "--note=Device returned", actor);
  await assert.rejects(
    () => call("release", "ALLOC-NEW", "--note=Again", actor),
    /already released/,
  );
  await call(
    "allocate",
    "ENT-NEW",
    "--code=ALLOC-NEXT",
    "--device=next-device",
    actor,
  );
  await call(
    "renew",
    "ENT-101",
    `--expires=${far}`,
    "--contract=ORDER-RENEW",
    "--note=Signed extension",
    actor,
  );
  await assert.rejects(
    () =>
      call(
        "renew",
        "ENT-101",
        "--expires=2020-01-01",
        "--contract=X",
        "--note=X",
        actor,
      ),
    /extend/,
  );
  await call("disable", "ENT-NEW", "--note=Support review", actor);
  assert.equal((await call("check-access", "ENT-NEW")).allowed, false);
  await assert.rejects(
    () => call("allocate", "ENT-NEW", "--code=NO", "--device=no", actor),
    /disabled/,
  );
  await call("enable", "ENT-NEW", "--note=Review completed", actor);
  await call("resize", "ENT-NEW", "--seats=2", "--note=New agreement", actor);
  await assert.rejects(
    () => call("resize", "ENT-102", "--seats=1", "--note=Too few", actor),
    /below recorded/,
  );
  await call(
    "maintain",
    "ENT-103",
    `--until=${far}`,
    "--note=Support extended",
    actor,
  );
  await call("grant", "ENT-NEW", "--feature=exports", "--limit=10", actor);
  await call(
    "consume",
    "ENT-NEW",
    "--feature=exports",
    "--units=10",
    "--event=event-1",
    actor,
  );
  assert.equal(
    (
      await call(
        "consume",
        "ENT-NEW",
        "--feature=exports",
        "--units=10",
        "--event=event-1",
        actor,
      )
    ).duplicate,
    true,
  );
  await assert.rejects(
    () =>
      call(
        "consume",
        "ENT-NEW",
        "--feature=exports",
        "--units=1",
        "--event=event-1",
        actor,
      ),
    /different data/,
  );
  await assert.rejects(
    () =>
      call(
        "consume",
        "ENT-NEW",
        "--feature=exports",
        "--units=1",
        "--event=event-2",
        actor,
      ),
    /budget exceeded/,
  );
  assert.equal(
    (await call("check-access", "ENT-NEW", "--feature=exports")).allowed,
    false,
  );
  await call(
    "add-task",
    "ENT-NEW",
    "--code=TASK-NEW",
    "--title=Review test contract",
    "--owner=Test",
    `--due=${now}`,
    actor,
  );
  await call("complete-task", "TASK-NEW", "--note=Matched signed order", actor);
  await call("log", "ENT-NEW", "--note=Test note", actor);
  assert.ok((await call("history", "ENT-NEW")).length >= 8);
  await call(
    "review-account",
    "SOUTH",
    "--purpose=Licence administration",
    `--retention=${far}`,
    `--security=${now}`,
    "--owner=Jon",
    actor,
  );
  const csv = path.join(REPO_ROOT, "examples/zentitle-entitlements.csv");
  const before = (await db.query("select count(*)::int n from audit_events"))[0]
    .n;
  assert.equal(
    (await call("import", "zentitle", csv, "--source=test", "--dry-run", actor))
      .added,
    2,
  );
  assert.equal(
    (await db.query("select count(*)::int n from audit_events"))[0].n,
    before,
  );
  assert.equal(
    (await call("import", "zentitle", csv, "--source=test", actor)).added,
    2,
  );
  assert.equal(
    (await call("import", "zentitle", csv, "--source=test", actor)).skipped,
    2,
  );
  assert.equal(
    (await call("check-access", "Z-test-EXPORT-101")).allowed,
    false,
  );
  await assert.rejects(
    () => call("enable", "Z-test-EXPORT-101", "--note=No evidence", actor),
    /Review entitlement/,
  );
  await call(
    "review-entitlement",
    "Z-test-EXPORT-101",
    "--observed-seats=2",
    "--contract=ORDER-IMPORTED",
    "--owner=Mia",
    "--note=Reconciled source allocations",
    actor,
  );
  await call("enable", "Z-test-EXPORT-101", "--note=Evidence confirmed", actor);
  assert.equal(
    (await call("show", "Z-test-EXPORT-101")).entitlement.used_seats,
    2,
  );
  const changed = path.join(temp, "changed.csv");
  fs.writeFileSync(
    changed,
    fs.readFileSync(csv, "utf8").replace("Simulation Team", "Changed offering"),
  );
  await assert.rejects(
    () => call("import", "zentitle", changed, "--source=test", actor),
    /Changed source/,
  );
  const bad = path.join(temp, "bad.csv");
  fs.writeFileSync(
    bad,
    fs
      .readFileSync(csv, "utf8")
      .replace(
        "Design Perpetual,Perpetual,2",
        "Design Perpetual,Perpetual,wrong",
      ),
  );
  await assert.rejects(
    () => call("import", "zentitle", bad, "--source=bad", actor),
    /Invalid Seats/,
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from entitlements where source='bad'",
      )
    )[0].n,
    0,
  );
  const { default: ExcelJS } = await import("exceljs");
  const book = new ExcelJS.Workbook(),
    sheet = book.addWorksheet("Entitlements"),
    rows = parseCsv(fs.readFileSync(csv, "utf8"));
  sheet.addRow(Object.keys(rows[0]));
  for (const row of rows) sheet.addRow(Object.values(row));
  const xlsx = path.join(temp, "export.xlsx");
  await book.xlsx.writeFile(xlsx);
  assert.equal(
    (await call("import", "zentitle", xlsx, "--source=excel", actor)).added,
    2,
  );
  const ex = await call("export", `--out=${path.join(temp, "export.json")}`);
  const data = JSON.parse(fs.readFileSync(ex.file));
  assert.equal(data.entitlements.length, 9);
  assert.ok(data.audit_events.length > 20);
  await assert.rejects(() => call("export", `--out=${ex.file}`), /EEXIST/);
  const ce = await call(
    "export",
    "--format=csv",
    `--out=${path.join(temp, "export.csv")}`,
  );
  assert.equal(parseCsv(fs.readFileSync(ce.file)).length, 9);
  assert.ok(
    fs
      .readFileSync((await call("weekly-review")).file, "utf8")
      .includes("seat-review"),
  );
  assert.ok(
    fs
      .readFileSync((await call("draft-renewal", "ENT-101")).file, "utf8")
      .includes("Harbour Simulation"),
  );
  await assert.rejects(
    () => db.exec("update audit_events set actor='changed'"),
    /Append-only/,
  );
  await assert.rejects(() => call("attention", "--unknown=yes"), /Unknown/);
  await assert.rejects(
    () =>
      call(
        "add-task",
        "ENT-101",
        "--code=BAD-DATE",
        "--title=Bad",
        "--owner=Test",
        "--due=2026-02-30",
        actor,
      ),
    /Invalid/,
  );
  if (process.env.TEST_DATABASE_URL) {
    const left=await getDb(),right=await getDb();
    try {
      const results=await Promise.allSettled([
        execute(left,['allocate','ENT-NEW','--code=RACE-A','--device=race-A',actor]),
        execute(right,['allocate','ENT-NEW','--code=RACE-B','--device=race-B',actor])
      ]);
      assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
      assert.equal(results.filter(x=>x.status==='rejected').length,1);
      const winner=results.find(x=>x.status==='fulfilled').value.code;
      const released=await Promise.allSettled([
        execute(left,['release',winner,'--note=Release once',actor]),
        execute(right,['release',winner,'--note=Release twice',actor])
      ]);
      assert.equal(released.filter(x=>x.status==='fulfilled').length,1);
    } finally {await left.close();await right.close();}
  }
  await db.close();
  assert.ok(runFile("scripts/view.mjs").includes("views/week.html"));
  assert.ok(runFile("scripts/docs.mjs").includes("document(s) rendered"));
  assert.ok(
    fs
      .readFileSync(path.join(temp, "views/week.html"), "utf8")
      .includes("Entitlement desk week"),
  );
  const invalid = spawnSync(
    process.execPath,
    ["scripts/entitlements.mjs", "show", "Team"],
    { cwd: REPO_ROOT, env: process.env, encoding: "utf8" },
  );
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /Ambiguous/);
  const json = JSON.parse(
    runFile("scripts/entitlements.mjs", ["entitlements", "--json"]),
  );
  assert.equal(json.length, 9);
  assert.deepEqual(
    COMMANDS.filter((c) => !seen.has(c)),
    [],
  );
  console.log(
    `PASS: all ${COMMANDS.length} CLI commands; CSV/XLSX import, rollback, preview, duplicate and changed rows, seat limits, usage idempotency, lifecycle, evidence, drafts, JSON export and HTML rendering (${process.env.TEST_DATABASE_URL ? "Postgres" : "PGlite"}).`,
  );
} finally {
  try {
    await db.close();
  } catch {}
  fs.rmSync(temp, { recursive: true, force: true });
}
