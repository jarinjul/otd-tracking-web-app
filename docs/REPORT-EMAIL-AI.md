# Feature Spec: Generate Report Email by AI (Weekly Plan)

> **สถานะ:** ✅ Implemented และทดสอบ end-to-end แล้ว (2026-09-06) — design mockup ดูได้จาก artifact "Zenith Report Email"
> **ผู้ implement:** Claude Sonnet 5 (ปรับ provider เป็น OpenRouter ภายหลังโดยผู้ดูแล)
> **ขอบเขต:** จบที่ "copy พร้อมส่ง" — **ไม่**ส่งอีเมลออกจากระบบเอง (ไม่มี SMTP/mail service)
>
> **หมายเหตุการเปลี่ยนแปลงจาก draft เดิม:** สเปกฉบับร่างด้านล่างเขียนไว้ให้เรียก Anthropic API
> โดยตรง (`ANTHROPIC_API_KEY` + `@anthropic-ai/sdk`) แต่ implementation จริงเปลี่ยนไปเรียกผ่าน
> **OpenRouter** แทน (ผู้ใช้มีคีย์ OpenRouter อยู่แล้ว ไม่มี Anthropic key โดยตรง) — ดูรายละเอียดจริงใน
> §6b ด้านล่าง ส่วนที่เหลือของสเปก (data gathering, prompt, modal UX, acceptance criteria) ยังตรงกับ
> ของจริงทั้งหมด

## 1. Overview

เพิ่มปุ่ม **"Generate Report Email"** บนหน้า Weekly Plan (`app/weekly-plan/WeeklyPlanClient.tsx`)
กดแล้วระบบรวบรวมข้อมูลของ**สัปดาห์ที่กำลังดูอยู่** — แผนงานแยกตามโปรเจกต์, checklist,
Meeting Notes (kickoff/wrap-up), งานแทรก, สถานะสุขภาพโปรเจกต์ — ส่งให้ Claude เรียบเรียง
เป็นอีเมลรายงานหัวหน้าภาษาไทย แล้วแสดงใน modal พร้อมปุ่ม Copy (rich text + plain text)

## 2. UX Flow (ตาม mockup)

1. ปุ่มอยู่ใน header row ของหน้า Weekly Plan ข้าง `WeekNav` — ปุ่ม primary สี accent (`--color-accent`) พร้อมไอคอน sparkle
2. กดปุ่ม → เปิด modal ทันที เข้า state **Loading** (spinner + ข้อความขั้นตอนหมุนเวียน + skeleton) — ปุ่มบน header disable และเปลี่ยนข้อความเป็น "กำลังสร้าง…"
3. สำเร็จ → state **Success**: แสดง Subject (copy แยกได้) + preview เนื้อหาอีเมล (scroll ได้, max-height ~320px) + footer มี tone selector (ทางการ/กระชับ), ปุ่ม "Generate ใหม่", ปุ่ม primary "Copy อีเมลทั้งหมด"
4. ล้มเหลว → state **Error**: ข้อความสาเหตุเป็นภาษาคน + ปุ่ม "ลองอีกครั้ง"
5. สัปดาห์ว่าง (ไม่มี item และไม่มี notes) → state **Empty**: แจ้งว่ายังไม่มีข้อมูล — **เช็คฝั่ง client ก่อนยิง API** เพื่อไม่เสียค่าเรียก AI
6. ปิด modal ได้ด้วย ✕ / คลิก backdrop / Esc — ถ้ากำลัง loading ให้ abort request ด้วย `AbortController`
7. Copy สำเร็จ → toast "คัดลอกอีเมลแล้ว — วางใน Outlook/Gmail ได้เลย ✓"

## 3. ไฟล์ที่ต้องสร้าง/แก้

| ไฟล์ | ประเภท | รายละเอียด |
|---|---|---|
| `lib/reportEmail.ts` | ใหม่ | รวบรวมข้อมูลสัปดาห์จาก DB + สร้าง prompt + เรียก Claude |
| `app/api/weekly-plan/report-email/route.ts` | ใหม่ | `POST` endpoint |
| `components/weekly-plan/ReportEmailModal.tsx` | ใหม่ | Modal 5 states (idle/loading/success/error/empty) |
| `app/weekly-plan/WeeklyPlanClient.tsx` | แก้ | เพิ่มปุ่มใน header + mount modal |
| `.env.example` | แก้ | เพิ่ม `ANTHROPIC_API_KEY=` |
| `package.json` | แก้ | `npm install @anthropic-ai/sdk` |

## 4. API Contract

### `POST /api/weekly-plan/report-email`

Request body:

```json
{ "week": "2026-08-24", "tone": "formal" }
```

- `week`: `YYYY-MM-DD` — ใช้ `normalizeWeekStart` logic เดียวกับ `lib/weeklyPlan.ts` (Monday UTC midnight)
- `tone`: `"formal" | "concise"` (default `"formal"`)

Response `200`:

```json
{
  "subject": "[Weekly Report] ทีมพัฒนา — สัปดาห์ 24–30 ส.ค. 2026",
  "bodyHtml": "<p>เรียน …</p>…",
  "bodyText": "เรียน …\n…"
}
```

Response errors:

- `400` — week param ไม่ valid
- `422` — `{ "error": "empty_week" }` สัปดาห์ไม่มีข้อมูลเลย (server ตรวจซ้ำอีกชั้นแม้ client เช็คแล้ว)
- `500` — `{ "error": "generation_failed", "message": "…" }` (รวมกรณี `ANTHROPIC_API_KEY` ไม่ได้ตั้ง — message บอกชัดว่า "ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY ใน .env")

ใน route ให้ export `export const maxDuration = 60` (กัน serverless timeout) และเช็ค auth ตาม pattern เดียวกับ route อื่นในโปรเจกต์ (ดู `lib/auth.ts` และ route ข้างเคียงว่า protect อย่างไร แล้วทำให้เหมือนกัน)

## 5. การรวบรวมข้อมูล (ใน `lib/reportEmail.ts`)

สร้าง `async function gatherWeekReportData(weekParam: string)` ดึงข้อมูลต่อไปนี้ (ใช้ Prisma models ที่มีอยู่แล้วใน `prisma/schema.prisma`):

1. **WeekPlan** ของสัปดาห์นั้น (ผ่าน `getOrCreateWeekPlan` จาก `lib/weeklyPlan.ts` — reuse, อย่าเขียน query ซ้ำ) → `items` (พร้อม `checklist`), `kickoffNotes`, `wrapupNotes`
2. **จัดกลุ่ม items ตาม `projectName`** (item ที่ `projectName` เป็น null รวมเป็นกลุ่ม "อื่น ๆ") — แต่ละ item เอา: `title`, `status` (pending/done/carried_over), `itemType`, `owner`, `note`, checklist (`text` + `done`)
3. **สรุปตัวเลข**: total / done / pending / carried_over
4. **InterruptTask** ในช่วง weekStart–weekEnd → รวมชั่วโมง + รายการ (date, person.name, source, hours)
5. **Project health**: ทุก Project + active release (ใช้ logic `pickActiveRelease` แบบเดียวกับใน `WeeklyPlanClient.tsx` — ย้าย/ทำซ้ำฝั่ง server ได้) → version, ragStatus, phase, progressPercent, isDelayed, delayDays, needsDecision, decisionNote

แปลงทั้งหมดเป็น **structured plain text** (ไม่ใช่ JSON dump) ให้อ่านง่ายสำหรับ model เช่น:

```
สัปดาห์: 24–30 ส.ค. 2026
สรุป: ทั้งหมด 12 | เสร็จ 7 | ค้าง 3 | ยกไปสัปดาห์หน้า 2

## โปรเจกต์: SmartOFA (v2.4, RAG: red, Phase: UAT, 68%, needs decision: "รอ confirm scope")
- [done] ปิด defect UAT รอบแรก (owner: ก้อง)
  - checklist: [x] แก้ defect 14 รายการ, [ ] เตรียม test data ชุดใหม่
- [carried_over] เตรียม test data ชุดใหม่
...

## Meeting Notes
จันทร์ (kickoff): ...
ศุกร์ (wrap-up): ...

## งานแทรก (รวม 6 ชม.)
- 26 ส.ค. · เมย์ · หน่วยงานบัญชี · 4h
```

ถ้า `items.length === 0 && !kickoffNotes && !wrapupNotes` → return null (route ตอบ 422)

## 6. การเรียก Claude — ~~ผ่าน Anthropic API ตรง~~ (draft เดิม, ไม่ได้ใช้จริง)

> ส่วนนี้คือแผนเดิมที่เขียนไว้ก่อน implement — เก็บไว้เป็นข้อมูลอ้างอิงเผื่อวันหนึ่งย้ายกลับมาใช้
> Anthropic API ตรง (มี `ANTHROPIC_API_KEY` แล้ว) ของจริงที่ deploy อยู่คือ §6b ด้านล่าง

ใช้ `@anthropic-ai/sdk` — client สร้างแบบ `new Anthropic()` (อ่าน `ANTHROPIC_API_KEY` จาก env เอง) **ฝั่ง server เท่านั้น**

```typescript
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic()

const response = await client.beta.messages.create({
  model: "claude-opus-5",
  max_tokens: 16000,
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default", // server-side fallback หาก request ถูก refuse — กันงานสะดุด
  system: SYSTEM_PROMPT, // ดู §7
  messages: [{ role: "user", content: structuredWeekData }],
  output_config: {
    format: {
      type: "json_schema",
      schema: {
        type: "object",
        properties: {
          subject: { type: "string" },
          bodyHtml: { type: "string" },
          bodyText: { type: "string" },
        },
        required: ["subject", "bodyHtml", "bodyText"],
        additionalProperties: false,
      },
    },
  },
})

// ตรวจ stop_reason ก่อนอ่าน content เสมอ
if (response.stop_reason === "refusal") throw new Error("generation_refused")
const block = response.content.find((b) => b.type === "text")
const result = JSON.parse(block.text)
```

## 6b. การเรียก Claude — ผ่าน OpenRouter (ของจริงที่ใช้งานอยู่)

ผู้ใช้มีคีย์ **OpenRouter** (`sk-or-v1-...`) อยู่แล้ว ไม่มี Anthropic API key โดยตรง — จึงเปลี่ยนมาเรียก
Claude ผ่าน OpenRouter's OpenAI-compatible chat-completions endpoint ด้วย `fetch` ธรรมดา (ไม่ต้องมี
SDK เพิ่ม) แทนการใช้ `@anthropic-ai/sdk`

- **Env var:** `OPENROUTER_API_KEY` (ไม่ใช่ `ANTHROPIC_API_KEY`)
- **Endpoint:** `POST https://openrouter.ai/api/v1/chat/completions`
- **Model slug:** `anthropic/claude-opus-5` (ยืนยันจาก `GET https://openrouter.ai/api/v1/models` ว่ามีจริง — ชื่อรุ่นบน OpenRouter เปลี่ยนได้ตามเวลา ควรเช็คซ้ำถ้าจะอัปเกรดในอนาคต)
- **Headers:** `Authorization: Bearer <OPENROUTER_API_KEY>`, `Content-Type: application/json`, และ header เสริม `HTTP-Referer` / `X-Title` (OpenRouter ใช้จัดอันดับแอปในหน้าสถิติของเขา — ใส่หรือไม่ใส่ก็ได้)
- **Structured output:** ใช้ `response_format: { type: "json_schema", json_schema: { name, strict: true, schema } }` (รูปแบบ OpenAI-compatible ต่างจาก Anthropic ที่ใช้ `output_config.format`)
- **Response shape:** `data.choices[0].message.content` คือ JSON string (ต้อง `JSON.parse` เอง) — ต่างจาก Anthropic ที่เนื้อหาอยู่ใน `content[].text` ของ content block
- **Refusal-equivalent:** เช็ค `choices[0].finish_reason === "content_filter"` แทน `stop_reason === "refusal"` ของ Anthropic

โค้ดจริงอยู่ที่ `lib/reportEmail.ts` — ฟังก์ชัน `generateReportEmail()`

**⚠️ Latency ที่วัดได้จริง:** เรียกผ่าน OpenRouter ใช้เวลา **80–120 วินาที ต่อครั้ง** (ช้ากว่าการเรียก
Anthropic API ตรงพอสมควร เพราะ OpenRouter ต้อง route ผ่านชั้นกลางอีกที) ผลกระทบที่ต้องรู้:
- `maxDuration` ในไฟล์ route ถูกปรับจาก 60 → **300** วินาทีแล้ว
- **ถ้า deploy บน Vercel plan Hobby จะยังพังอยู่ดี** เพราะ Hobby บังคับ hard cap 60 วินาทีไม่ว่า `maxDuration` จะตั้งเท่าไหร่ — ต้องอัปเกรดเป็น Pro (รองรับถึง 300s) ขึ้นไป หรือไม่ก็เปลี่ยนไปใช้โมเดล/provider ที่เร็วกว่า
- Modal ฝั่ง client ไม่มี timeout ของตัวเอง (มีแค่ผู้ใช้กด × ปิดถึงจะ abort) จึงรอได้นานเท่าที่ server ตอบ ไม่ error เอง

หมายเหตุอื่น ๆ:
- ห้าม hardcode API key, ห้าม expose key ไป client (เหมือนเดิม)
- ถ้าจะย้ายกลับไปใช้ Anthropic API ตรงในอนาคต (มี `ANTHROPIC_API_KEY` แล้ว) ให้ดูโค้ดตัวอย่างใน §6 ด้านบนเป็นจุดเริ่มต้น — latency จะลดลงมากเพราะตัดชั้น proxy ออก

## 7. System Prompt (ต้นแบบ — ปรับได้)

```
คุณคือผู้ช่วยของ Tech Lead ทีมพัฒนาซอฟต์แวร์ หน้าที่คือเรียบเรียง "อีเมลรายงานประจำสัปดาห์"
ภาษาไทยสำหรับส่งหัวหน้า จากข้อมูลดิบที่ให้มา

โครงสร้างอีเมล (bodyHtml ใช้ <p>, <h4>, <ul>/<li>, <strong> เท่านั้น — ไม่มี CSS/inline style):
1. คำขึ้นต้น "เรียน …" + ประโยคเปิด 1 บรรทัดบอกช่วงสัปดาห์
2. "ภาพรวม" — 2-3 ประโยค: จำนวนงานเสร็จ/ค้าง/ยกไป, ชั่วโมงงานแทรก, ประเด็นใหญ่สุดของสัปดาห์
3. รายละเอียดรายโปรเจกต์ (เรียงโปรเจกต์ที่มีปัญหา/critical ก่อน) — แต่ละโปรเจกต์:
   หัวข้อ = ชื่อ + version + phase + progress, ตามด้วย bullet สิ่งที่เสร็จ (✅) / กำลังทำ / ติดขัด
4. "ประเด็นจากที่ประชุม" — สรุปจาก kickoff/wrap-up notes (ข้ามหัวข้อนี้ถ้าไม่มี notes)
5. "สิ่งที่ต้องขอการตัดสินใจ" — จาก needsDecision/decisionNote (ข้ามถ้าไม่มี)
6. คำลงท้าย "จึงเรียนมาเพื่อโปรดทราบ / ขอบคุณครับ"

กติกา:
- เขียนจากข้อมูลที่ให้เท่านั้น ห้ามแต่งตัวเลขหรือเหตุการณ์เพิ่ม
- ถ้าข้อมูลส่วนไหนว่าง ให้ข้ามหัวข้อนั้น ไม่ต้องเขียนว่า "ไม่มีข้อมูล"
- โทน {tone}: "formal" = ภาษาทางการ สุภาพ ครบถ้วน | "concise" = กระชับ bullet สั้น อ่านจบใน 1 นาที
- subject รูปแบบ: [Weekly Report] ทีมพัฒนา — สัปดาห์ {ช่วงวันที่ภาษาไทย}
- bodyText = เนื้อหาเดียวกับ bodyHtml แบบ plain text (ใช้ - นำ bullet)
```

## 8. Modal Component (`ReportEmailModal.tsx`)

- `"use client"` — props: `{ open, weekStart, weekEnd, onClose }`
- ยิง fetch เองภายใน component เมื่อ `open` เปลี่ยนเป็น true (พร้อม `AbortController` — abort ตอน close/unmount)
- ใช้ CSS variables ของโปรเจกต์ (`var(--color-card)`, `--color-border`, `--color-accent`, ฯลฯ) ตาม pattern component อื่นใน `components/weekly-plan/` — **ห้าม** เพิ่ม CSS framework/library ใหม่
- Overlay: `position: fixed; inset: 0` + backdrop คลิกปิดได้ + Esc ปิดได้ + `role="dialog" aria-modal="true"`
- Loading: spinner + ข้อความขั้นตอนหมุนเวียนทุก ~900ms (`กำลังรวบรวมแผนงาน…` → `อ่าน Meeting Notes…` → `AI กำลังเรียบเรียงอีเมล…`) + skeleton lines
- Success: แสดง subject ใน box + `bodyHtml` render ใน preview ผ่าน `dangerouslySetInnerHTML` (ปลอดภัยเพราะเรา constrain tags ใน prompt — แต่ให้ sanitize เบื้องต้นด้วย: strip `<script`, `on*=` attributes ก่อน render)
- Copy ทั้งหมด: `navigator.clipboard.write` ด้วย `ClipboardItem` ที่มีทั้ง `text/html` (จาก bodyHtml) และ `text/plain` (subject + "\n\n" + bodyText) — fallback เป็น `writeText` ถ้า `ClipboardItem` ไม่รองรับ
- Tone selector: เปลี่ยนค่าแล้วต้องกด "Generate ใหม่" ถึงจะ re-fetch (ไม่ auto-fetch ตอนสลับ)

## 9. การแก้ `WeeklyPlanClient.tsx`

- เพิ่มปุ่มใน header (div ที่มี `WeekNav`) — ปุ่ม primary: `background: var(--color-accent)`, ตัวอักษรขาว, ไอคอน sparkle (มี `lucide-react` อยู่แล้ว — ใช้ `Sparkles`)
- state: `const [reportOpen, setReportOpen] = useState(false)`
- disable ปุ่ม + เปลี่ยน label เป็น "กำลังสร้าง…" ระหว่าง modal อยู่ใน loading state (ให้ modal report สถานะกลับผ่าน callback หรือยก fetch state ขึ้นมาที่ parent — เลือกแบบที่โค้ดสะอาดกว่า)
- เช็ค empty ก่อนเปิด: ถ้า `items.length === 0 && !kickoffNotes && !wrapupNotes` → เปิด modal ที่ state Empty เลย ไม่ยิง API

## 10. Acceptance Criteria

- [ ] ปุ่มแสดงบน header หน้า Weekly Plan ทุกสัปดาห์ (อดีต/ปัจจุบัน) ตำแหน่งข้าง WeekNav
- [ ] กดแล้วได้อีเมลที่อ้างอิงข้อมูลจริงของสัปดาห์ที่เลือก — เปลี่ยนสัปดาห์แล้ว generate ได้ผลต่างกัน
- [ ] เนื้อหาครบ: ภาพรวมตัวเลข, รายโปรเจกต์, meeting notes (ถ้ามี), งานแทรก (ถ้ามี), ประเด็นตัดสินใจ (ถ้ามี)
- [ ] Copy แล้ววางใน Gmail/Outlook ได้ formatting ติดมา (หัวข้อ, bullet) และวางใน plain text editor ได้ข้อความอ่านรู้เรื่อง
- [ ] สัปดาห์ว่าง → เห็น Empty state โดยไม่มีการเรียก API (เช็ค network tab)
- [ ] ปิด modal ระหว่าง loading → request ถูก abort, เปิดใหม่ทำงานปกติ
- [ ] ไม่มี `ANTHROPIC_API_KEY` → Error state ข้อความบอกชัดเจน ไม่ crash
- [ ] Dark mode: modal และปุ่มอ่านชัดทั้งสองธีม (ใช้ CSS variables ตลอด)
- [ ] `npm run build` ผ่าน, ไม่มี type error

## 11. Out of Scope (phase ถัดไป — อย่าทำตอนนี้)

- ส่งอีเมลอัตโนมัติ (SMTP / mail service / mailto)
- ประวัติรายงานที่เคย generate / บันทึกลง DB
- Streaming การ generate ทีละส่วนใน modal
- ภาษาอังกฤษ / หลายผู้รับ
