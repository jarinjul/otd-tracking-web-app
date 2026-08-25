# Resource Planning — เห็นปัจจุบัน/อนาคต → จัดการได้ → แนะนำได้

> เอกสารนี้เขียนไว้ให้ AI developer (Sonnet 5) อ่านแล้วลงมือทำต่อได้ทันที
> **อ่าน `docs/DEV-PLAN.md` หัวข้อ "ข้อตกลงของโปรเจกต์นี้" ให้จบก่อนเริ่มทุกครั้ง** — สรุปข้อที่พลาดแล้วเจ็บที่สุด:
> - DB Neon ตัวเดียวใช้ทั้ง dev และ production — แก้ข้อมูลตอน dev = แก้ production จริง
> - วันที่/เดือนที่เทียบกับ DB ต้องเป็น UTC เสมอ — ดู `parseMonthParam` ใน `app/api/workload/route.ts` เป็นแบบอย่าง
> - เสร็จทุกเฟส: `npx tsc --noEmit` ผ่าน → ทดสอบจริงใน browser ทั้ง day/night mode → commit แยกเฟส → push
>
> **ข่าวดี: ทั้ง 3 เฟสไม่ต้องแก้ schema เลย** — ใช้ `ReleaseWorkload` / `Person` / `InterruptTask` / `ProjectMember` ที่มีอยู่ครบแล้ว จึงไม่มี migration และไม่ต้อง restart dev server เพราะ prisma generate

---

## Concept: 4 ชั้นของการบริหารทีม

| ชั้น | คำถามที่ตอบ | อยู่ที่ไหน |
|------|-------------|-----------|
| Workload | รู้ว่าเกิดอะไรขึ้น | ✅ หน้า `/workload` เดิม (มีแล้ว ไม่แตะ) |
| Capacity Planning | รู้ว่าอนาคตจะเกิดอะไร | **Phase 1** (หน้าใหม่ `/resource-planning`) |
| Resource Planning | จัดการว่าจะทำอะไร | **Phase 2** (แก้ไข allocation ได้จากหน้าเดียวกัน) |
| Advisor | บอกว่าควรทำอะไร | **Phase 3** (rule-based recommendation + ปุ่ม Apply) |

ลำดับเฟสจงใจเรียงแบบนี้: สร้างนิสัยดูข้อมูล (P1) → สร้างนิสัยอัปเดตข้อมูล (P2) → ค่อยให้ระบบแนะนำ (P3) เพราะคำแนะนำจะฉลาดได้ก็ต่อเมื่อข้อมูล allocation สดจริง

## สิ่งที่ตัดออกโดยตั้งใจ (อย่าทำ ถึงจะเห็นในภาพ mockup อ้างอิง)

- **Allocation รายวัน** — ข้อมูลจริงเก็บรายเดือน (`ReleaseWorkload.month`) และทีม 7 คนไม่มีกำลังดูแลข้อมูลรายวันให้สด ใช้ **รายเดือน** เป็น granularity ทั้ง 3 เฟส
- **Drag & drop คนลงตาราง** — ใช้ click → dialog แทน (Phase 2)
- **What-if Scenario** — ต้องมี sandbox แยก ยังไม่มี pain รองรับ
- **Notification / user account / กระดิ่งแจ้งเตือน** — แอปนี้เป็น password เดียว ไม่มี account
- **Sidebar layout ใหม่** — เพิ่มเป็น 1 หน้าใน navbar เดิมเท่านั้น (label "Resources", icon lucide เช่น `CalendarRange` — ระวัง navbar แน่นแล้ว เช็คว่าไม่ล้นจอ 1280px)
- **Skills / Work preference / Notice period บน Person** — ทีมภายในรู้จักกันหมด ใช้ `Person.roles` ที่มีอยู่พอ

---

## สถาปัตยกรรมเดิมที่ต้องรู้ (อ่านไฟล์จริงประกอบ)

- `prisma/schema.prisma`:
  - `ReleaseWorkload` — hours ราย (releaseId, personId, month) โดย month = วันที่ 1 ของเดือน UTC, unique 3 คีย์นี้
  - `Person` — `monthlyCapacityHours` (default 160), `roles: ProjectRole[]`, avatarUrl
  - `InterruptTask` — งานแทรกราย (personId, date, hours) นับรวมใน utilization ของเดือนนั้น
  - `ProjectMember` — ใครอยู่โปรเจกต์ไหน role อะไร (ใช้ใน Phase 3 หา candidate)
- `lib/utils/workload.ts` — **ต้อง reuse ห้ามเขียนสูตรใหม่**:
  - `TARGET_RATIO = 0.8` (target = 80% ของ capacity)
  - `monthKey(d)` — "YYYY-MM" ฝั่ง client
  - `workloadStatus(pct)` — เกณฑ์สี: <60 Underutilized / ≤100 On Track / ≤110 Warning / >110 Overload
  - `computePersonFocus(person, projects, month)` — สรุป allocation รายคนต่อเดือน (ใช้ทำ side panel ได้เลย)
- `app/api/workload/route.ts` — **API เขียนมีอยู่แล้ว**: `POST` upsert 1 ช่อง (releaseId, personId, month "YYYY-MM", hours; hours ≤ 0 = ลบ) — Phase 2 ใช้ตัวนี้ ไม่ต้องสร้าง API ใหม่
- หน้า `/workload` (`app/workload/WorkloadClient.tsx`) — วิธีคำนวณ utilization ต่อคนต่อเดือน (release hours + interrupt hours เทียบ capacity) — **ตัวเลขหน้าใหม่ต้องตรงกับหน้านี้ทุกช่อง ไม่งั้นความเชื่อถือพังทั้งคู่**
- สไตล์: Tailwind v4 tokens `var(--color-*)` เท่านั้น (มี dark mode แล้ว), ไอคอน lucide-react, ทุกหน้า server component ที่อ่าน DB ต้องมี `export const dynamic = "force-dynamic"`

---

## Phase 1 — เห็นปัจจุบัน + เห็นอนาคต (read-only, คุ้มสุด ทำก่อน)

### เป้าหมาย
หน้าใหม่ `/resource-planning` ตอบ 2 คำถามโดยไม่ต้องกรอกอะไรเพิ่ม: "ตอนนี้ใครทำอะไร ใครล้น ใครว่าง" และ "อีก 3-6 เดือนข้างหน้า จะล้น/ว่างตรงไหน"

### โครงหน้า (บนลงล่าง)
1. **Header** — title "Resource Planning" + คำอธิบายไทยสั้นๆ + ตัวเลือกเดือนเริ่ม (default เดือนปัจจุบัน) + toggle ช่วงมอง 3/6 เดือน
2. **แถบ KPI ของเดือนปัจจุบัน** (การ์ดแบบเดียวกับ Dashboard):
   - Total Capacity = Σ `monthlyCapacityHours` ทุกคน
   - Planned = Σ release hours + interrupt hours เดือนนั้น
   - Available (vs Target) = Σ max(0, capacity×0.8 − planned ของแต่ละคน) — โชว์เป็น hrs พร้อม % และหมายเหตุ "เทียบ target 80%"
   - Overloaded = จำนวนคน status Overload, Underutilized = จำนวนคน <60%
3. **Resource Grid (หัวใจของหน้า)** — ตาราง แถว = คน (Avatar + ชื่อ + capacity), คอลัมน์ = เดือน (เดือนปัจจุบัน → +3 หรือ +6):
   - แต่ละเซลล์: ชั่วโมงรวม + % + สีพื้นตาม `workloadStatus` (ใช้ token `--color-rag-*-light` เป็นพื้น + `-text` เป็นตัวอักษร)
   - คลิกแถว (คน) → เปิด **side panel** ด้านขวา
   - คลิกเซลล์ → side panel เดียวกันแต่ focus เดือนนั้น
4. **Side panel รายคน** (pattern เดียวกับ `ProjectDetailPanel` ที่มีอยู่ — overlay ขวา มีปุ่มปิด):
   - หัว: Avatar + ชื่อ + roles (badge)
   - Utilization เดือนที่เลือก: ตัวเลขใหญ่ % + แถบ + status badge
   - Current Allocation: รายการ โปรเจกต์/release + ชั่วโมง (ได้จาก `computePersonFocus` — reuse)
   - งานแทรกเดือนนั้น (ถ้ามี): รวม h
   - Available: target − planned (ติดลบ = โชว์แดงว่าเกิน target กี่ h)
5. **Capacity Outlook (มุมมองอนาคต)** — ใต้ grid:
   - รายการ "จุดเสี่ยง" อัตโนมัติ: `คน × เดือนอนาคต` ที่ pct > 100 เรียงตามเดือน เช่น "Oct 2026 — Nutratanon 118% (188/160h)"
   - รายการ "ช่องว่าง": เดือนที่ทีมรวมต่ำกว่า 60% ของ target รวม
   - Releases ที่กำลังจะเริ่มในช่วงมอง (จาก `Release.startDate`) ที่ **ยังไม่มี** `ReleaseWorkload` เลย → ธงเตือน "ยังไม่ได้วางคน" — อันนี้สำคัญ เป็นตัวเชื่อมไป Phase 2

### Data
Server component ดึงครั้งเดียว: people ทั้งหมด, `releaseWorkload` ในช่วง [เดือนปัจจุบัน, +6 เดือน] (query ด้วย `month: { gte, lt }` เป็น UTC), interrupts เดือนปัจจุบัน, projects+releases (สำหรับชื่อ/วันที่) — ส่งเข้า client component คำนวณฝั่ง client แบบหน้าอื่น

### Acceptance criteria — Phase 1
- [ ] ตัวเลข utilization ของเดือนปัจจุบันตรงกับหน้า `/workload` ทุกคน (เทียบมือทีละคน)
- [ ] เปลี่ยนช่วงมอง 3↔6 เดือน grid ปรับตาม ไม่มี layout พัง
- [ ] เซลล์อนาคตที่ไม่มีข้อมูล = แสดง "—" ไม่ใช่ 0% สีเขียว (ไม่มีข้อมูล ≠ ว่างจริง)
- [ ] จุดเสี่ยง/ช่องว่าง/release ที่ยังไม่วางคน คำนวณถูก (ทดสอบกับข้อมูลจริงอย่างน้อย 1 เคสต่ออย่าง)
- [ ] Side panel เปิด-ปิดได้ ข้อมูลตรงกับ grid
- [ ] Navbar item ใหม่ไม่ทำให้ navbar ล้นที่จอ 1280px

---

## Phase 2 — จัดการได้ (เขียน allocation จากหน้านี้)

### เป้าหมาย
แก้ allocation ได้จาก grid โดยตรง — ไม่ต้องสลับไปหน้า Workload — ใช้ `POST /api/workload` เดิมทั้งหมด

### UI
1. **เซลล์ใน grid กดแก้ได้** — คลิกเซลล์ → side panel โหมดแก้ไข: รายการ release ของคนนั้นเดือนนั้น แต่ละแถวมี input ชั่วโมง (แก้แล้ว upsert ทันทีแบบ optimistic, hours=0 = ลบแถว)
2. **ปุ่ม "+ Assign"** ใน side panel และในธง "ยังไม่ได้วางคน" ของ Capacity Outlook → dialog เลือก: โปรเจกต์ → release → เดือน → ชั่วโมง (default: คนที่เปิด panel อยู่/เดือนที่ focus อยู่) — เสนอ release ที่ active ช่วงเดือนนั้นก่อน (startDate ≤ สิ้นเดือน AND endDate ≥ ต้นเดือน)
3. หลังเขียนสำเร็จ: อัปเดต state ทันที, KPI + จุดเสี่ยง คำนวณใหม่, แสดง % ใหม่ของคนนั้นให้เห็นผลของการตัดสินใจ

### กับดัก
- month ที่ส่งไป API เป็น "YYYY-MM" — สร้างจาก key ของคอลัมน์ grid ตรงๆ ห้ามผ่าน `new Date()` local
- คนเดียว/release เดียว/เดือนเดียว มี unique constraint — upsert ผ่าน API เดิมจัดการให้แล้ว อย่า insert ตรง
- Optimistic update ต้อง rollback ถ้า API fail (แสดง error สั้นๆ)

### Acceptance criteria — Phase 2
- [ ] แก้ชั่วโมงจากเซลล์ → refresh หน้า `/workload` แล้วเห็นค่าเดียวกัน (สอง view แหล่งเดียวกันจริง)
- [ ] Assign คนใหม่ลง release ที่ยังไม่เคยมี entry ได้ / ใส่ 0 แล้วแถวหายทั้งสองหน้า
- [ ] ธง "ยังไม่ได้วางคน" หายไปหลัง assign คนแรกลง release นั้น
- [ ] กดเร็วๆ หลายครั้งไม่เกิด entry ซ้ำ (unique constraint + upsert)

---

## Phase 3 — แนะนำได้ (rule-based advisor + Apply)

### เป้าหมาย
กล่อง "คำแนะนำ" ในหน้าเดียวกัน: ตรวจทุกเดือนในช่วงมอง หา overload แล้วเสนอการย้ายชั่วโมงที่ทำได้จริง พร้อมปุ่ม Apply — **ไม่เรียก LLM ไม่มี external API** เป็น pure function ฝั่ง server

### Rule (ทำใน `lib/advisor.ts` เป็น pure function มี unit-testable signature ชัดๆ)
สำหรับแต่ละเดือน m ในช่วงมอง:
1. giver = คนที่ pct(m) > 110 (เกณฑ์ Overload เดียวกับ `workloadStatus`)
2. excess = planned(m) − capacity×0.8 (เอาลงมาที่ target)
3. ไล่ entry ของ giver เดือนนั้นจากชั่วโมงมาก → น้อย หา receiver ต่อ entry:
   - เงื่อนไขบังคับ: receiver.pct(m) < 100 **หลังรับชั่วโมงแล้วต้องไม่เกิน 100**
   - ลำดับความชอบ: (a) เป็น `ProjectMember` ของโปรเจกต์นั้นอยู่แล้ว → (b) มี `ProjectRole` ทับซ้อนกับ roles ของ giver → (c) คนที่ pct ต่ำสุด
4. เสนอย้าย `min(excess, entry.hours, ช่องว่างของ receiver)` ปัดเป็นจำนวนเต็มชั่วโมง ขั้นต่ำ 4h (น้อยกว่านั้นไม่คุ้มสลับงาน)
5. สูงสุด 5 ข้อเสนอต่อรอบ เรียงตาม excess มาก → น้อย

### UI
- การ์ด "คำแนะนำ (rule-based)" ท้ายหน้า: แต่ละข้อโชว์ ย้ายอะไร จากใคร → ไปใคร กี่ h เดือนไหน + **before → after %ทั้งสองคน** + เหตุผลสั้น ("อยู่ในโปรเจกต์นี้อยู่แล้ว" / "role ตรงกัน: Developer")
- ปุ่ม Apply ต่อข้อ → confirm dialog → เขียน 2 upsert ผ่าน API เดิม (ลด giver, เพิ่ม receiver) → คำนวณคำแนะนำใหม่ทั้งชุด
- ไม่มีอะไรจะแนะนำ = บอกตรงๆ "ไม่พบ overload ในช่วงที่ดู" — ห้าม pad คำแนะนำเกรดต่ำมาเติม

### Acceptance criteria — Phase 3
- [ ] สร้างสถานการณ์ overload จำลอง (เพิ่มชั่วโมงชั่วคราวใน dev) → ข้อเสนอโผล่ ถูกเงื่อนไข ถูกลำดับความชอบ → **ลบข้อมูลจำลองคืนหลังทดสอบ (DB = production)**
- [ ] Apply แล้ว: ชั่วโมงย้ายจริงทั้งสองฝั่ง, before/after % ตรงกับที่โชว์, คำแนะนำ refresh
- [ ] Receiver ไม่มีทางถูกดันเกิน 100% จากการ Apply
- [ ] ไม่มี overload → แสดงข้อความว่าง ไม่ error

---

## ทั่วไป (ทุกเฟส)
- [ ] `npx tsc --noEmit` ผ่าน
- [ ] ทดสอบจริงใน browser ทั้ง day และ night mode (สลับจากปุ่มบน navbar)
- [ ] Commit แยกเฟส message อธิบาย why, push แล้ว Vercel deploy ผ่าน
- [ ] ติ๊ก acceptance criteria ในไฟล์นี้หลังจบแต่ละเฟส
