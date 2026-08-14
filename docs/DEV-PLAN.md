# Nexus Hub — Development Plan (3 งานถัดไป)

> เอกสารนี้เขียนไว้ให้ AI developer (Sonnet 5) อ่านแล้วลงมือทำต่อได้ทันที
> อ่านหัวข้อ "ข้อตกลงของโปรเจกต์นี้" ให้จบก่อนเริ่มเขียนโค้ดทุกครั้ง

---

## ข้อตกลงของโปรเจกต์นี้ (สำคัญมาก อ่านก่อน)

### Stack
- Next.js 16.2.9 (App Router, Turbopack) — **API/convention ต่างจาก training data** อ่าน `node_modules/next/dist/docs/` ก่อนเขียนโค้ดที่ไม่แน่ใจ (ตาม AGENTS.md)
- Prisma 7.8.0, generator `prisma-client` output ที่ `app/generated/prisma` (gitignored, มี `postinstall: prisma generate`)
- Prisma client singleton อยู่ที่ `lib/prisma.ts` (ใช้ `@prisma/adapter-pg` + pg Pool) — import ด้วย `import { prisma } from "@/lib/prisma"`
- Tailwind CSS v4 (theme tokens ใน `app/globals.css` เช่น `--color-accent`, `--color-rag-green-light`)
- ไอคอน: lucide-react เท่านั้น

### Database — ระวังที่สุด
- **DB เดียว ใช้ทั้ง local dev และ production**: Neon Postgres (host `ep-wild-morning-az3g1cod...neon.tech`)
  - `.env` และ `.env.local` ชี้ Neon ทั้งคู่ (`.env.local` ชนะ — ห้ามลืมแก้ทั้งสองไฟล์ถ้าเปลี่ยน)
  - แก้ข้อมูลตอน dev = แก้ข้อมูล production จริง ระวังตอนทดสอบ ลบ/แก้เฉพาะ record ทดสอบที่สร้างเอง
- **ห้ามใช้ `prisma migrate dev`** — migration history drift อยู่ จะโดนบังคับ reset DB
  ขั้นตอน schema change ที่ใช้ในโปรเจกต์นี้:
  1. แก้ `prisma/schema.prisma`
  2. เขียน SQL มือ (CREATE TABLE / ALTER TABLE) ให้ตรงกับ schema
  3. Backup ตารางที่เกี่ยวข้องเป็น CSV ไป scratchpad ก่อน (`psql "$DATABASE_URL" -c "\copy ..."`)
  4. รัน SQL ตรงกับ Neon: `set -a && source .env && set +a && psql "$DATABASE_URL" -f file.sql`
  5. `npx prisma generate`
  6. Verify ด้วย query count/select
- **วันที่ต้องเป็น UTC เสมอ**: local dev รัน GMT+7 แต่ Vercel รัน UTC — เคยเกิดบั๊กแถวซ้ำมาแล้ว 2 รอบ (ReleaseWorkload.month, WeekPlan.weekStart)
  - สร้าง Date จาก param: `new Date(Date.UTC(y, m-1, d))` ห้ามใช้ `new Date(y, m-1, d)`
  - ดูตัวอย่างที่ `app/api/workload/route.ts` (`parseMonthParam`) และ `lib/weeklyPlan.ts` (`normalizeWeekStart`)

### Workflow
- Server Component page ที่อ่าน DB ต้องมี `export const dynamic = "force-dynamic"`
- dev server: ใช้ preview_start ชื่อ `zenith-dev` (config อยู่ `.claude/launch.json`) — ห้ามรันผ่าน Bash
- ทุกงานเสร็จ: `npx tsc --noEmit` ต้องผ่าน → ทดสอบจริงใน browser → commit → `git push origin main` → Vercel auto-deploy (~1-3 นาที)
- Commit message ภาษาอังกฤษ อธิบาย why ไม่ใช่ what, ลงท้าย `Co-Authored-By: Claude ...` ตามที่ harness กำหนด
- ภาษา UI: ปนไทย/อังกฤษตามแบบหน้าที่มีอยู่ (label หลักอังกฤษ คำอธิบายไทยได้)

---

## งานที่ 1 — Password Gate (ทำก่อน, เล็กสุด)

### เป้าหมาย
กันคนนอกเข้าแอปทั้งหมด ด้วยรหัสผ่านเดียว (ผู้ใช้จริงมีคนเดียว + พี่ๆ/ทีมที่รู้รหัสเข้าดูได้) ไม่ต้องมี user account / role

### สิ่งที่ต้องสร้าง
1. **`middleware.ts`** (root ของโปรเจกต์ ข้างๆ `package.json`)
   - เช็ค cookie ชื่อ `nexus_auth` ว่าค่าตรงกับ token ที่คาดหวัง
   - Token = SHA-256 hex ของ `APP_PASSWORD` (คำนวณด้วย Web Crypto `crypto.subtle` — middleware รันบน Edge runtime, **ห้าม import `node:crypto`**)
   - ถ้าไม่ผ่าน → redirect ไป `/login?next=<pathname>`
   - **Matcher ต้องยกเว้น**: `/login`, `/api/auth/*`, `/_next/*`, `/favicon.ico`, ไฟล์ static อื่นๆ
   - หมายเหตุ: Next 16 อาจเปลี่ยน convention ของ middleware — เช็ค docs ใน `node_modules/next/dist/docs/` ก่อน
2. **`app/login/page.tsx`** — ฟอร์มช่องรหัสผ่านช่องเดียว + ปุ่มเข้าสู่ระบบ สไตล์เดียวกับแอป (การ์ดกลางจอ โลโก้ NexusIcon จาก Navbar), แสดง error ถ้ารหัสผิด
3. **`app/api/auth/login/route.ts`** — POST รับ `{ password }`
   - ถูก: set cookie `nexus_auth` (httpOnly, secure, sameSite=lax, maxAge 30 วัน, path=/) แล้วตอบ `{ ok: true }` → client redirect ไป `next` param
   - ผิด: 401
4. **Env**: เพิ่ม `APP_PASSWORD` ใน `.env`, `.env.local`, `.env.example` (ใส่ placeholder), และแจ้งให้ user ไปเพิ่มใน Vercel → Settings → Environment Variables แล้ว redeploy

### Acceptance criteria
- เปิดหน้าใดๆ โดยไม่มี cookie → เด้งไป /login
- ใส่รหัสถูก → กลับไปหน้าที่ตั้งใจเข้า, ปิด/เปิด browser ใหม่ยังไม่ต้อง login ซ้ำ (ภายใน 30 วัน)
- ใส่รหัสผิด → error ไม่ set cookie
- API routes เดิมทั้งหมด (เช่น `/api/workload`) โดน middleware คุมด้วย (เรียกตรงโดยไม่มี cookie ต้องไม่ผ่าน)
- `npx tsc --noEmit` ผ่าน, ทุกหน้าเดิมยังทำงานปกติหลัง login

---

## งานที่ 2 — Interrupt Log (งานแทรก)

### เป้าหมาย
แทนกระดาษที่ user จดงานแทรกอยู่ทุกวันนี้ — บันทึกว่า ใครโดนแทรก กี่ชั่วโมง จากใคร (Product Owner / หน่วยงานอื่น) เรื่องอะไร แล้วสรุปให้เห็นว่างานแทรกกิน capacity ไปเท่าไหร่ มาจากไหนบ่อยสุด

### Schema (raw SQL ตาม workflow ด้านบน)
```prisma
model InterruptTask {
  id        String   @id @default(cuid())
  date      DateTime // วันที่เกิดงานแทรก — UTC midnight เสมอ
  person    Person   @relation(fields: [personId], references: [id], onDelete: Cascade)
  personId  String
  hours     Float
  source    String   // ต้นทางที่ขอ เช่น "PO SmartOFA", "หน่วยงานบัญชี" — free text
  project   Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)
  projectId String?  // เกี่ยวกับ app ไหน (optional)
  note      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([personId])
  @@index([date])
}
```
- อย่าลืมเพิ่ม back-relation `interrupts InterruptTask[]` ใน `Person` และ `Project`

### API — `app/api/interrupts/route.ts` + `app/api/interrupts/[id]/route.ts`
- `GET /api/interrupts?month=YYYY-MM` — รายการของเดือนนั้น (ถ้าไม่ส่ง month = เดือนปัจจุบัน) include person name + project name
- `POST` — สร้าง; parse `date` ("YYYY-MM-DD") ด้วย `Date.UTC` **เท่านั้น**
- `PATCH /api/interrupts/[id]` — แก้ไข
- `DELETE /api/interrupts/[id]` — ลบ
- ดูสไตล์ route เดิมได้จาก `app/api/workload/route.ts`

### UI — หน้าใหม่ `/interrupts`
- เพิ่ม nav item "Interrupts" ใน `components/layout/Navbar.tsx` (ไอคอน `Zap` หรือ `AlertTriangle`) ระหว่าง Workload กับ PRD Center
- โครงหน้า (บนลงล่าง):
  1. **Month selector** (prev/next + This month) — สไตล์เดียวกับ heatmap year selector ใน `app/workload/WorkloadClient.tsx`
  2. **Summary cards ของเดือนที่เลือก**: ชั่วโมงแทรกรวม · % ของ capacity ทีม (รวม `Person.monthlyCapacityHours` ทุกคน) · จำนวนครั้ง · แหล่งที่มา top 1
  3. **Breakdown by source**: bar เล็กๆ ต่อ source เรียงมาก→น้อย (บอกว่า "หน่วยงานไหนแทรกบ่อย/หนักสุด")
  4. **Quick-add form** แถวเดียว: date (default วันนี้) / person (dropdown จาก `/api/admin/people` หรือส่งจาก server) / hours / source (text + datalist จาก source ที่เคยใช้) / project (dropdown, optional) / note → ปุ่ม Add
  5. **ตารางรายการ**ของเดือนนั้น (ใหม่สุดขึ้นก่อน) แก้ inline หรือปุ่มลบได้
- Server Component `page.tsx` (force-dynamic) โหลด people + projects + entries เดือนปัจจุบัน แล้วส่งเข้า `InterruptsClient.tsx`

### Integration กับ Weekly Plan
- ใน `app/weekly-plan/WeeklyPlanClient.tsx` เพิ่ม section "งานแทรกสัปดาห์นี้" (การ์ดเล็กใต้ This Week's Plan): ดึง interrupts ที่ `date` อยู่ในช่วงสัปดาห์ที่เลือก แสดง วัน/คน/ชั่วโมง/source รวมชั่วโมงท้าย section
- ส่ง interrupts จาก `app/weekly-plan/page.tsx` (query เพิ่ม) หรือ fetch ฝั่ง client ตามสัปดาห์ที่เลือก — เลือกทางที่แก้โค้ดน้อยกว่า

### Acceptance criteria
- เพิ่ม/แก้/ลบ งานแทรกได้ ข้อมูลอยู่จริงใน Neon (verify ด้วย psql)
- เปลี่ยนเดือนแล้ว summary + ตารางเปลี่ยนตาม
- % capacity คำนวณถูก: (ชั่วโมงแทรกรวมเดือน ÷ ผลรวม monthlyCapacityHours ของทุกคน) × 100
- Weekly Plan แสดงงานแทรกของสัปดาห์ที่เลือกถูกต้อง (ระวัง boundary วันจันทร์/อาทิตย์ + UTC)
- สร้าง record จาก local แล้วเปิด production เห็นตรงกัน (DB เดียวกัน — พิสูจน์ว่าไม่มีบั๊ก timezone)

---

## งานที่ 3 — Report 2 ระดับ + Monthly Snapshot

### เป้าหมาย
- **Weekly report** ให้ทีมดูทุกสัปดาห์ (ดูสด + copy ไปแปะอีเมล)
- **Monthly report** ให้พี่ๆ หัวหน้าดูทุกเดือน (ดูสด + copy ไปแปะอีเมล) พร้อมเทียบเดือนก่อนหน้าได้
- ไม่ทำระบบส่งอีเมลอัตโนมัติ — แค่ปุ่ม **Copy for email** ที่ก็อป HTML/ข้อความสวยๆ ไปวางใน mail client ได้เลย (user ส่งเอง)

### Schema (raw SQL)
```prisma
model MonthlySnapshot {
  id        String   @id @default(cuid())
  month     DateTime @unique // UTC วันที่ 1 ของเดือน
  data      Json     // โครงด้านล่าง
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```
โครง `data` (เก็บเป็น plain JSON เพื่อให้เทียบย้อนหลังได้แม้ schema โปรเจกต์เปลี่ยน):
```ts
{
  projects: Array<{ id, name, bucket, worstRag, phase, progressPercent }>,
  releasesDeployedThisMonth: Array<{ projectName, version, releaseDate }>,
  costSavings: { internalTotal, vendorTotal, saveTotal },
  workload: { avgUtilizationPct, overloadedCount },
  interrupts: { totalHours, pctOfCapacity, topSource },
  pendingDecisions: Array<{ projectName, version, note }>,
  topRisks: Array<{ projectName, version, description, severity }>
}
```

### หน้า Report ใหม่ — ปรับ `/report` เป็น 3 tab
หน้า `/report` เดิม (`ReportClient.tsx`) มีอยู่แล้ว — เพิ่ม tab switcher ด้านบน: **Current** (ของเดิม) / **Weekly** / **Monthly**

**Tab Weekly** (สำหรับทีม):
- Week selector (เหมือน Weekly Plan)
- เนื้อหา: รายการ plan items ของสัปดาห์แยกตาม status (done / pending / carried over) · งานแทรกสัปดาห์นี้ (จากงานที่ 2) · คนที่ workload เดือนนี้เกิน 110% · release ที่ deploy ในสัปดาห์นี้
- ปุ่ม **Copy for email**: สร้าง HTML สรุป (heading + list เรียบๆ inline style) เขียนลง clipboard ด้วย `navigator.clipboard.write` (ClipboardItem type text/html + text/plain fallback)

**Tab Monthly** (สำหรับพี่ๆ):
- Month selector
- ปุ่ม **Save snapshot**: คำนวณ data ปัจจุบันแล้ว upsert ลง `MonthlySnapshot` ของเดือนที่เลือก (กดซ้ำ = ทับด้วยข้อมูลล่าสุด)
- แสดง: การ์ดสรุป (โปรเจกต์ทั้งหมด/เขียว/แดง, cost savings, utilization, ชั่วโมงงานแทรก) · **เทียบกับ snapshot เดือนก่อน** (RAG โปรเจกต์ไหนดีขึ้น/แย่ลง แสดงลูกศร ↑↓) · release ที่ส่งมอบเดือนนี้ · top risks · เรื่องรอตัดสินใจ
- ถ้าเดือนก่อนไม่มี snapshot → แสดงส่วนเทียบเป็น "ยังไม่มีข้อมูลเดือนก่อน"
- ปุ่ม **Copy for email** เช่นเดียวกับ weekly

### API
- `GET/POST /api/snapshots?month=YYYY-MM` — GET อ่าน snapshot (และเดือนก่อนหน้า), POST คำนวณ+upsert
- Logic คำนวณ snapshot เขียนเป็นฟังก์ชันใน `lib/snapshot.ts` (ใช้ `worstRagStatus` จาก `lib/utils/rag.ts`, `pickActiveRelease` จาก `lib/utils/release.ts`, `TARGET_RATIO`/`monthKey` จาก `lib/utils/workload.ts` — มีครบแล้วห้ามเขียนซ้ำ)

### Acceptance criteria
- Save snapshot แล้ว record อยู่ใน Neon, กดซ้ำไม่สร้างแถวใหม่ (unique month)
- เดือนที่มี snapshot เดือนก่อน → เห็น RAG เทียบพร้อมลูกศรเปลี่ยนแปลง
- Copy for email แล้ววางใน mail client ได้ format สวย (ทดสอบวางใน TextEdit rich text ก็พอ)
- Weekly tab ตรงกับข้อมูล Weekly Plan สัปดาห์เดียวกัน
- ตัวเลข cost savings ตรงกับ Dashboard

---

## ลำดับการทำ + Definition of Done รวม

| # | งาน | ขึ้นกับ | ประมาณขนาด |
|---|-----|--------|-----------|
| 1 | Password Gate | — | เล็ก (ไม่แตะ DB) |
| 2 | Interrupt Log | — | กลาง (schema ใหม่ 1 ตาราง) |
| 3 | Report + Snapshot | งาน 2 (ใช้ข้อมูล interrupts) | ใหญ่ (schema 1 ตาราง + 2 tab ใหม่) |

ทุกงานถือว่าเสร็จเมื่อ: `npx tsc --noEmit` ผ่าน → ทดสอบผ่าน browser บน local (ซึ่งต่อ Neon จริง) → commit + push → แจ้ง user ให้เช็ค production (งานที่ 1 ต้องแจ้งให้ user เพิ่ม `APP_PASSWORD` ใน Vercel ก่อน deploy ถึงจะใช้ได้)
