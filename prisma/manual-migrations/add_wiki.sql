-- Wiki feature: topic-organised store for imported self-contained HTML documents.
-- Matches models WikiTopic / WikiEntry in prisma/schema.prisma.
-- No backup needed — brand-new tables, no existing data touched.
-- Run: set -a && source .env && set +a && psql "$DATABASE_URL" -f prisma/manual-migrations/add_wiki.sql

CREATE TABLE "WikiTopic" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WikiTopic_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WikiEntry" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "sourceName" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WikiEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WikiEntry_topicId_idx" ON "WikiEntry"("topicId");

ALTER TABLE "WikiEntry" ADD CONSTRAINT "WikiEntry_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "WikiTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Seed: keep the old "Tech Landscape" page as the first Wiki topic ──────────
INSERT INTO "WikiTopic" ("id", "title", "sortOrder", "createdAt", "updatedAt")
VALUES ('seed_topic_tech_landscape', 'Tech Landscape', 0, now(), now());

INSERT INTO "WikiEntry" ("id", "topicId", "title", "html", "sourceName", "sortOrder", "createdAt", "updatedAt")
VALUES (
  'seed_entry_tech_landscape',
  'seed_topic_tech_landscape',
  'Overview',
  $html$<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Tech Landscape</title>
<style>
  :root {
    --bg: #ffffff; --card: #ffffff; --surface: #f8f9fb;
    --text: #1a1a2e; --muted: #6b7280; --border: #e5e7eb;
    --green-light: #d1fae5; --green-text: #065f46;
    --amber-light: #fef3c7; --amber-text: #92400e;
    --accent: #6366f1; --accent-light: #eef2ff;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0f131c; --card: #1a1f2b; --surface: #0f131c;
      --text: #e8eaf0; --muted: #94a3b8; --border: #2a3040;
      --green-light: #113328; --green-text: #6ee7b7;
      --amber-light: #3a2a0e; --amber-text: #fcd34d;
      --accent: #818cf8; --accent-light: #262a4a;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 24px;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans Thai", sans-serif;
    background: var(--bg); color: var(--text); line-height: 1.5;
  }
  h1 { font-size: 22px; font-weight: 700; margin: 0; }
  .sub { color: var(--muted); margin: 4px 0 24px; font-size: 14px; }
  .grid2 { display: grid; grid-template-columns: 1fr; gap: 20px; align-items: start; }
  @media (min-width: 900px) { .grid2 { grid-template-columns: 1fr 1fr; } }
  .card { border: 1px solid var(--border); border-radius: 16px; background: var(--card); overflow: hidden; }
  .card > .hd { padding: 10px 16px; background: var(--green-light); }
  .card > .hd p { margin: 0; font-size: 14px; font-weight: 700; }
  .card > .bd { padding: 16px; }
  .subgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .subgrid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 12px; }
  @media (max-width: 560px) { .subgrid, .subgrid3 { grid-template-columns: 1fr; } }
  .subbox { border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
  .subbox > .hd { padding: 6px 12px; background: var(--green-light); }
  .subbox > .hd p { margin: 0; font-size: 12px; font-weight: 700; }
  .subbox > .bd { padding: 12px; display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--muted); }
  .cols2 { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 12px; }
  .connector { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; color: var(--muted); font-size: 12px; }
  .cenai { border: 2px dashed color-mix(in srgb, var(--accent) 40%, transparent); background: color-mix(in srgb, var(--accent-light) 40%, transparent); border-radius: 16px; padding: 20px; margin-top: 20px; }
  .cenai > .lbl { font-size: 14px; font-weight: 700; color: var(--accent); margin: 0 0 12px; }
  .portfolio { border: 1px solid var(--border); border-radius: 12px; background: var(--card); padding: 16px; }
  .portfolio h3 { font-size: 14px; font-weight: 700; margin: 0; }
  .portfolio .meta { font-size: 12px; color: var(--muted); margin: 2px 0 12px; }
  .repconex { border: 1px dashed var(--border); border-radius: 8px; padding: 16px; }
  .repconex .ttl { font-size: 12px; font-weight: 700; margin: 0 0 12px; }
  .products { display: grid; grid-template-columns: 1fr; gap: 12px 32px; }
  @media (min-width: 560px) { .products { grid-template-columns: 1fr 1fr; } }
  .product .name { display: flex; align-items: center; gap: 8px; font-size: 14px; }
  .product .name .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); flex: none; }
  .tags { display: flex; flex-wrap: wrap; gap: 4px; padding-left: 14px; margin-top: 4px; }
  .tag { padding: 2px 6px; border-radius: 999px; font-size: 10px; font-weight: 500; }
  .tag.new { background: var(--green-light); color: var(--green-text); }
  .tag.upgrade { background: var(--amber-light); color: var(--amber-text); }
  .tag.internal { background: var(--surface); color: var(--muted); border: 1px solid var(--border); }
  .tag.global { background: var(--accent-light); color: var(--accent); }
</style>
</head>
<body>
  <h1>Tech Landscape</h1>
  <p class="sub">แผนภาพภาพรวม: ทีม เครื่องมือ และ software ทั้งหมดที่เชื่อมโยงกัน</p>

  <div class="grid2">
    <div class="card">
      <div class="hd"><p>Tech Development Team</p></div>
      <div class="bd">
        <div class="subgrid">
          <div class="subbox">
            <div class="hd"><p>Requirements &amp; Design</p></div>
            <div class="bd"><span>STMNEX</span><span>BlueFin</span></div>
          </div>
          <div class="subbox">
            <div class="hd"><p>Development</p></div>
            <div class="bd">
              <div class="cols2">
                <span>Claude Code</span><span>MANTA</span>
                <span>Cursor</span><span>VS Code</span>
                <span>Codex</span><span>KRAKEN</span>
              </div>
            </div>
          </div>
        </div>
        <div class="subgrid3">
          <div class="subbox">
            <div class="hd"><p>Management Dev Board</p></div>
            <div class="bd"><span>NEXUS HUB NEX</span></div>
          </div>
          <div class="subbox">
            <div class="hd"><p>Testing</p></div>
            <div class="bd"><span>QA Automate Testing</span><span>Pre-VA scan</span><span>Serpent</span></div>
          </div>
          <div class="subbox">
            <div class="hd"><p>Deployment</p></div>
            <div class="bd"><span>Azure DevOps</span><span>SecDevOps CI/CD</span></div>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="hd"><p>Operation Team</p></div>
      <div class="bd">
        <div class="subbox">
          <div class="hd"><p>Operation Dashboard</p></div>
          <div class="bd">
            <span>Operation Monitoring Management</span>
            <div class="tags" style="padding-left:0">
              <span class="tag new">New App</span>
              <span class="tag internal">Internal Use</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="grid2">
    <div class="connector">&#8597; เชื่อมโยงข้อมูล &amp; แจ้งเตือน</div>
    <div class="connector">&#8597; เชื่อมโยงข้อมูล &amp; แจ้งเตือน</div>
  </div>

  <div class="cenai">
    <p class="lbl">CenAI (Centralization AI) · LLM / Integration Layer</p>
    <div class="portfolio">
      <h3>Application Portfolio · Appsight NEX</h3>
      <p class="meta">Tracks every project · 23 total</p>
      <div class="repconex">
        <p class="ttl">REPCONEX Software Platform</p>
        <div class="products">
          <div class="product"><span class="name"><span class="dot"></span>Competency Professional REPCO</span><div class="tags"><span class="tag new">New App</span><span class="tag internal">Internal Use</span></div></div>
          <div class="product"><span class="name"><span class="dot"></span>DBT (Digital Boiler Twin)</span><div class="tags"><span class="tag upgrade">Upgrade Tech stack</span><span class="tag global">Global Use</span></div></div>
          <div class="product"><span class="name"><span class="dot"></span>Web repconexis.com</span><div class="tags"><span class="tag upgrade">Upgrade Tech stack</span><span class="tag global">Global Use</span></div></div>
          <div class="product"><span class="name"><span class="dot"></span>ROOTS</span><div class="tags"><span class="tag global">Global Use</span></div></div>
          <div class="product"><span class="name"><span class="dot"></span>SFNEX (Smart Flow NEX)</span><div class="tags"><span class="tag new">New App</span><span class="tag global">Global Use</span></div></div>
          <div class="product"><span class="name"><span class="dot"></span>SmartOFA NEX</span><div class="tags"><span class="tag new">New App</span><span class="tag global">Global Use</span></div></div>
          <div class="product"><span class="name"><span class="dot"></span>UHM (Unified Health Management)</span><div class="tags"><span class="tag upgrade">Upgrade Tech stack</span><span class="tag global">Global Use</span></div></div>
          <div class="product"><span class="name"><span class="dot"></span>UOC Landing Page for UHM</span><div class="tags"><span class="tag new">New App</span><span class="tag internal">Internal Use</span></div></div>
          <div class="product"><span class="name"><span class="dot"></span>AIMS</span><div class="tags"><span class="tag global">Global Use</span></div></div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>$html$,
  NULL,
  0,
  now(),
  now()
);
