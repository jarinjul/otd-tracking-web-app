# Dashboard Redesign — Executive Overview

> Spec สำหรับ AI developer (Sonnet 5) — เขียนให้ทำต่อได้ทันทีโดยไม่ต้องเดา
> **อ่านหัวข้อ "ข้อตกลงของโปรเจกต์นี้" ใน `docs/DEV-PLAN.md` ให้จบก่อนเริ่ม** (DB Neon ตัวเดียวใช้ทั้ง local/production, ห้าม `prisma migrate dev`, วันที่ต้องเป็น UTC, workflow: tsc → ทดสอบ browser → commit → push)
> Design นี้ user approve mockup แล้ว — **ห้ามเปลี่ยน layout/เนื้อหาเองโดยไม่ถาม**

## Scope

1. **แทนที่หน้า `/dashboard` เดิมทั้งหน้า** ด้วย layout "Executive Overview" (รายละเอียดด้านล่าง) — user ยืนยันแล้วว่า "ไม่เก็บของเดิมเลย"
2. **เพิ่ม upload รูปโปรไฟล์ใน Admin → People** (เก็บ base64 ลง `Person.avatarUrl` ที่มีอยู่แล้ว)
3. **ไม่มี schema change ใดๆ** — ทุกตัวเลขคำนวณจากข้อมูลที่มี ห้ามสร้างตาราง/field ใหม่

สิ่งที่**ห้ามแตะ**: หน้าอื่นทั้งหมด, API routes เดิม, `ProjectDetailPanel` (ยังใช้ต่อ)

---

## ไฟล์ที่เกี่ยวข้อง

- แก้: `app/dashboard/page.tsx`, `app/dashboard/DashboardClient.tsx` (เขียนใหม่ทั้งไฟล์)
- แก้: `app/admin/panels/PeoplePanel.tsx` (เพิ่ม upload รูป — มี field `avatarUrl` เป็น text input อยู่แล้ว)
- ใช้ซ้ำ (ห้ามเขียนใหม่): `components/ui/Avatar.tsx` (รองรับ `avatarUrl` + fallback ชื่อย่ออยู่แล้ว), `components/project/ProjectDetailPanel.tsx`, `lib/utils/rag.ts` (`worstRagStatus`), `lib/utils/release.ts` (`pickActiveRelease`), `lib/utils/workload.ts` (`TARGET_RATIO`, `monthKey`, `workloadStatus`), `lib/utils/cost.ts` (`costSavingsTotals`), `lib/utils/date.ts`
- หลังเขียนเสร็จ: grep หา component เดิมใน `components/dashboard/` (`PortfolioTabs`, `SummaryBar`, `FilterBar`, `ProjectCard`, `StrategicBucketsSection`, `CostSavingsBanner`) — ตัวไหน**ไม่มีใครใช้แล้ว**ให้ลบไฟล์ทิ้ง ตัวไหนยังถูก import ที่อื่นให้เก็บไว้ (เช็คด้วย grep ก่อนลบทุกไฟล์ อย่าเดา) รวมถึง `lib/stores/dashboardStore` และ `/api/dashboard/cost-savings` (ตัวหลังถูกใช้โดย CostSavingsBanner เท่านั้น — ถ้า banner ถูกลบและไม่มีใครเรียก route นี้ ให้ลบ route ด้วย **ยกเว้น** เลือก option ที่ต้องใช้ (ดู "การ์ด Cost save" ด้านล่าง))

## Data loading (`page.tsx`)

Server Component + `export const dynamic = "force-dynamic"` ดึงครั้งเดียวส่งเข้า `DashboardClient`:

- `prisma.project.findMany` include `teamMembers: { include: { person: true } }`, `releases` (ทุก field ที่ใช้: version, status, phase, ragStatus, progressPercent, startDate, endDate, releaseDate, needsDecision, decisionNote, devEntries, aiEntries, vendorCost)
- `prisma.person.findMany` (id, name, avatarUrl, monthlyCapacityHours)
- `prisma.releaseWorkload.findMany` (releaseId, personId, month, hours)
- `prisma.interruptTask.findMany` (date, hours) — เอาทั้งหมด แล้ว filter รายเดือนฝั่ง client

Month selector เป็น client state ล้วน — เปลี่ยนเดือน**ไม่ยิง request ใหม่** คำนวณจากข้อมูลที่โหลดมาแล้ว

---

## Layout (บนลงล่าง)

### 0. Header + Month selector

- ซ้าย: หัวข้อ "Executive Overview" + คำอธิบายสั้น
- ขวา: month selector `‹ [เดือน ปี] ›` default = เดือนปัจจุบัน, มีปุ่ม "This month" โผล่เมื่อไม่ได้อยู่เดือนปัจจุบัน (pattern เดียวกับ `app/interrupts/InterruptsClient.tsx` — copy `monthLabel`/`addMonths` มาใช้ได้)
- เดือนที่เลือกมีผลกับ: การ์ด Releases เดือนนี้, งานแทรก, Overloaded, Team workload, จุดปลายกราฟ Completion rate
- **ไม่**มีผลกับ: Active projects, At risk, Cost save, รอตัดสินใจ, Portfolio table, Upcoming releases (อิงวันนี้จริงเสมอ)

### 1. KPI row — 8 การ์ด (grid 4 คอลัมน์ × 2 แถว)

| การ์ด | สูตร |
|---|---|
| Active projects | `projects.length` (ทั้งหมด 23) subtitle: จำนวน bucket ที่มีโปรเจกต์ |
| At risk / critical | จำนวนโปรเจกต์ที่ `worstRagStatus` = amber / = red (แสดง "X / Y", Y สีแดง) |
| Releases เดือนนี้ | release ที่ `(releaseDate ?? endDate)` อยู่ในเดือนที่เลือก |
| งานแทรกเดือนนี้ | Σ `InterruptTask.hours` ของเดือนที่เลือก + subtitle "% ของ capacity" = ÷ Σ `monthlyCapacityHours` ทุกคน ×100 |
| Cost save | `costSavingsTotals(allReleases).save` แสดงย่อ "15.89M฿" + "%" สีเขียว (ตัวเลขต้องตรงกับหน้า /report Current) |
| รอตัดสินใจ | จำนวน release ที่ `needsDecision=true` + subtitle ชื่อโปรเจกต์แรก |
| Overloaded เดือนนี้ | จำนวนคนที่ workload% > 110 ในเดือนที่เลือก (สูตร workload% ดูข้อ 4) — เลขสีแดงเมื่อ > 0 |
| Team members | `people.length` + avatar ซ้อนกัน (แสดง 4 คนแรก + วงกลม "+N", ใช้ `<Avatar size="sm">`, margin-left ติดลบให้ซ้อน, มี border สีพื้นการ์ดรอบแต่ละวง) |

### 2. แถวกลาง — grid `1.55fr / 1fr`

**ซ้าย: Project portfolio (ตาราง)**

- คอลัมน์: Project / Owner / Health / Progress / Due date / Release
- 1 แถว = 1 โปรเจกต์, ข้อมูลจาก **active release** (`pickActiveRelease(p.releases)`)
- Owner: `<Avatar size="sm">` ของสมาชิก role `ProjectManager` คนแรก — ถ้าไม่มี PM ใช้สมาชิกคนแรกของโปรเจกต์ — ถ้าไม่มีสมาชิกเลยแสดง "—" (hover เห็นชื่อเต็ม ผ่าน title ซึ่ง Avatar ทำให้อยู่แล้ว)
- Health: badge จาก `worstRagStatus` → green "Healthy" / amber "At Risk" / red "Critical" (ใช้ token `--color-rag-*-light` + `--color-rag-*-text` ตามแอป)
- Progress: bar เล็ก (progressPercent ของ active release) — สี bar ตาม RAG (เขียว/เหลือง/แดง)
- Due date: `endDate` ของ active release, format ผ่าน `formatDateShort` — **สีแดงเมื่อ endDate < วันนี้ และ status ยังไม่ `deployed`** — ไม่มี endDate แสดง "—"
- Release: `version`
- เรียง: โปรเจกต์ที่ due เลยกำหนดขึ้นก่อน → ตามด้วย due ใกล้สุด → ไม่มี due ไปท้าย
- แสดง 8 แถวแรก + ปุ่ม "ดูทั้งหมด 23 โปรเจกต์" toggle ขยายเต็ม/ย่อ (client state, ไม่ใช่ลิงก์ไปหน้าอื่น)
- **คลิกแถว → เปิด `ProjectDetailPanel`** (เหมือน dashboard เดิม — ดูวิธี wire ใน `DashboardClient.tsx` เดิมก่อนลบ: state `openProjectId` + render panel + onClose)

**ขวา: Project release progress (all projects)**

นับจาก release ทุกตัวในระบบ ยกเว้น `rolled_back`:

| ป้าย (ไทย) | เงื่อนไข | สี |
|---|---|---|
| เสร็จสิ้น | `status === "deployed"` | เขียว |
| กำลังดำเนินการ | `status === "in_progress"` && phase ไม่ใช่ testing/uat | น้ำเงิน (`--color-accent` ได้) |
| รอการตรวจสอบ | `status === "in_progress"` && phase เป็น `testing` หรือ `uat` | เหลือง |
| ยังไม่เริ่ม | `status === "planned"` | เทา |

แสดง 4 แถว: จุดสี + ป้าย + "N (X%)" (X = ÷ total ไม่รวม rolled_back, ปัดจำนวนเต็ม)

ใต้เส้นคั่น — **Completion rate**:
- ตัวเลขใหญ่ = เสร็จสิ้น ÷ total ×100 ณ สิ้นเดือนที่เลือก
- นิยามรายเดือน (คำนวณย้อนหลังได้ ไม่ต้องกรอก): `rate(M) = จำนวน release ที่ deployed และ (releaseDate ?? endDate) ≤ สิ้นเดือน M` ÷ `จำนวน release ทั้งหมดที่ (startDate ?? createdAt) ≤ สิ้นเดือน M` (ไม่รวม rolled_back ทั้งเศษและส่วน) — ถ้าส่วน = 0 ให้ 0
- delta: "↑/↓ X% จากเดือนก่อน" (เทียบ rate(M-1)) สีเขียวถ้าขึ้น แดงถ้าลง
- กราฟเส้น SVG inline: 6 จุด = เดือน M-5 ถึง M, จุดสุดท้ายใหญ่กว่า, label % บนบางจุด (จุดแรก จุดกลาง จุดท้าย), label เดือนย่อไทยใต้แกน — ไม่ต้องใช้ chart library เขียน polyline เอง (viewBox กว้าง ~230 สูง ~74 ตาม mockup)
- **ขอบเขตเดือนทั้งหมดใช้ UTC** (`Date.UTC`) ตาม convention — ห้ามใช้ `new Date(y, m, d)` ฝั่งการคำนวณที่เทียบกับค่าจาก DB

### 3. แถวล่าง — grid `1.55fr / 1fr`

**ซ้าย: Team workload (เดือนที่เลือก)**

- ทุกคนใน `people` เรียง % มาก→น้อย, grid `repeat(auto-fit, minmax(110px, 1fr))`
- ต่อคน: `<Avatar size="md">` + ชื่อ (ตัดสั้น) + % + bar
- สูตร %: Σ `ReleaseWorkload.hours` ที่ `monthKey(month)` = เดือนที่เลือก ÷ (`monthlyCapacityHours × TARGET_RATIO`) ×100 ปัด 1 ตำแหน่ง — สูตรเดียวกับหน้า Workload เป๊ะ (ดู `monthTotalsByPerson` ใน `WorkloadClient.tsx`)
- สี: >110 แดง, >100 เหลือง, ≥60 เขียว, <60 ม่วง/accent — ใช้ `workloadStatus()` จาก `lib/utils/workload.ts` ห้ามเขียน band ใหม่

**ขวา: Upcoming releases**

- release ที่ status ∈ {planned, in_progress} และ `(releaseDate ?? endDate)` ≥ วันนี้ เรียงใกล้สุดก่อน แสดง 5 รายการ
- แต่ละแถว: "ProjectName version" (ตัดสั้น) + ขวา "In N days" สีน้ำเงิน (N = diff วัน ปัดขึ้น, วันนี้พอดี = "Today")

### สไตล์

- ใช้ design token ของแอป (`--color-accent`, `--color-rag-*`, `--color-border`, `--color-text-*`, `rounded-card`) ให้กลมกลืนกับหน้าอื่น — mockup ที่ approve เป็นเพียง layout/เนื้อหา ไม่ต้อง copy hex จาก mockup
- การ์ดทั้งหมด: `bg-card border border-border rounded-card` เหมือนหน้า Workload/Interrupts

---

## งานที่ 2: Upload รูปใน Admin → People

แก้ `app/admin/panels/PeoplePanel.tsx` (form มีช่อง `avatarUrl` text อยู่แล้ว — เก็บช่องเดิมไว้ เพิ่ม upload ข้างๆ):

1. `<input type="file" accept="image/*">` → อ่านด้วย FileReader → วาดลง `<canvas>` ย่อเป็นสี่เหลี่ยมจัตุรัส **128×128** (crop กลางภาพแบบ cover) → `canvas.toDataURL("image/jpeg", 0.8)` → set ลง `form.avatarUrl`
2. Guard: ถ้า data URI ยาวเกิน **150,000 ตัวอักษร** แจ้ง error ไม่บันทึก (กัน DB บวม)
3. แสดง preview `<Avatar size="lg">` + ปุ่ม "ลบรูป" (set `avatarUrl` = "")
4. บันทึกผ่าน API เดิม (`avatarUrl` เป็น String ใน schema รองรับ base64 อยู่แล้ว — ไม่แก้ backend)
5. `components/ui/Avatar.tsx` แสดง img จาก avatarUrl อยู่แล้ว — ไม่ต้องแก้ ตรวจว่าหน้า People/Workload/Weekly Plan แสดงรูปตามได้เองอัตโนมัติ

---

## Acceptance criteria

- [ ] `npx tsc --noEmit` ผ่าน
- [ ] Month selector: ถอยไป ก.ค. 2569 → การ์ด Releases/งานแทรก/Overloaded + Team workload + จุดปลายกราฟเปลี่ยน / การ์ดอื่นนิ่ง / กลับ "This month" ได้
- [ ] Cost save ตรงกับ `/report` tab Current (15.89M฿ ณ ตอนเขียน spec)
- [ ] Overloaded + Team workload % ตรงกับหน้า `/workload` เดือนเดียวกันเป๊ะ (เทียบเลขจริงในเบราว์เซอร์ อย่าเทียบด้วยตาอย่างเดียว)
- [ ] ผลรวม 4 สถานะใน Release progress = จำนวน release ทั้งหมด − rolled_back (verify ด้วย psql count เทียบ)
- [ ] Due date ที่เลยกำหนดและยังไม่ deploy ขึ้นสีแดง
- [ ] คลิกแถว portfolio เปิด ProjectDetailPanel ได้ ปิดได้
- [ ] Upload รูปใน Admin แล้ว: Admin แสดงรูป, Dashboard (Team members + Owner + Workload) แสดงรูปเดียวกัน, refresh แล้วรูปยังอยู่ (persist ใน Neon จริง)
- [ ] ไม่มี component/route ที่ตายค้าง (ไฟล์เก่าที่ไม่ถูก import แล้วถูกลบหมด)
- [ ] ทดสอบบน local (ต่อ Neon) → commit → push → Vercel auto-deploy → แจ้ง user เช็ค production

## ข้อควรระวังเฉพาะงานนี้

- **DB คือ production จริง** — ตอนทดสอบ upload รูป ใช้รูปจริงของทีมหรือรูปทดสอบแล้วลบออกก่อนจบงาน อย่าทิ้งรูปขยะไว้
- การลบไฟล์เก่า: grep ยืนยันว่าไม่มี import ก่อนลบ **ทีละไฟล์**
- อย่าลืม `export const dynamic = "force-dynamic"` (มีในไฟล์เดิมอยู่แล้ว — คงไว้)
- Interrupts ดึงทั้งตารางมา filter ฝั่ง client ได้ (ข้อมูลยังเล็ก) — อย่า over-engineer เป็น API รายเดือน
