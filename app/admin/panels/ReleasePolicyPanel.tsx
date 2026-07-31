const inputStyle = { borderColor: "var(--color-border)", background: "white" }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-5" style={inputStyle}>
      <h2 className="text-sm font-bold mb-3" style={{ color: "var(--color-text-primary)" }}>{title}</h2>
      {children}
    </div>
  )
}

const VERSION_SEGMENTS = [
  { part: "2026", label: "ปี", desc: "ปีของรอบการพัฒนา", color: "var(--color-accent)" },
  { part: "R1", label: "R", desc: "Major release ลำดับที่ของปี (ปีละ 2 รอบ: R1, R2)", color: "var(--color-rag-red)" },
  { part: ".1", label: "Minor", desc: "เพิ่ม feature ย่อย/improvement โดยยัง backward compatible", color: "var(--color-rag-amber)" },
  { part: ".0", label: "Patch", desc: "แก้ bug หรือ hotfix เท่านั้น ไม่มี feature ใหม่", color: "var(--color-rag-green)" },
]

const BUMP_RULES = [
  { from: "2026R1", to: "2026R2", when: "ออก major release รอบใหม่ → ขยับ R" },
  { from: "2026R1.0.0", to: "2026R1.1.0", when: "เพิ่ม feature ย่อย → ขยับเลขกลาง" },
  { from: "2026R1.1.0", to: "2026R1.1.1", when: "แก้ bug อย่างเดียว → ขยับเลขท้าย" },
]

const TIMELINE = [
  { range: "เดือน 1–4", label: "พัฒนา Feature", color: "var(--color-accent)" },
  { range: "เดือน 5", label: "Feature Freeze — Stabilization (แก้ bug + regression test)", color: "var(--color-rag-amber)" },
  { range: "เดือน 6", label: "ปล่อย Release", color: "var(--color-rag-green)" },
]

const HOTFIX_STEPS = [
  "แก้ bug บน release branch เช่น release/2026R1",
  "ปล่อย patch version เช่น 2026R1.0.1 พร้อม tag",
  "Merge กลับ main ทันที เพื่อไม่ให้ bug เดิมกลับมาในรอบถัดไป",
]

const CHECKLIST = [
  "Tag ใน Git ตรงกับเลขเวอร์ชัน",
  "Changelog สรุปว่ารอบนี้มีอะไรเปลี่ยน",
  "ผ่าน smoke test checklist ครบทุกข้อ",
]

export function ReleasePolicyPanel() {
  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>Release Cycle & Versioning Policy</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          กติกาการตั้งเลขเวอร์ชันและรอบการออก Release ของทีม
        </p>
      </div>

      <div className="flex flex-col gap-5">
        {/* Version format */}
        <Section title="รูปแบบเลขเวอร์ชัน">
          <p className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>
            รูปแบบ: <code className="px-1.5 py-0.5 rounded font-mono text-xs" style={{ background: "var(--color-surface)" }}>YYYY R{"{n}"}.{"{minor}"}.{"{patch}"}</code> เช่น <strong style={{ color: "var(--color-text-primary)" }}>2026R1.1.0</strong>
          </p>

          <div className="flex items-stretch gap-1.5 mb-4 flex-wrap">
            {VERSION_SEGMENTS.map((seg) => (
              <div key={seg.label} className="rounded-lg overflow-hidden border" style={{ borderColor: "var(--color-border)", minWidth: 120 }}>
                <div className="px-3 py-2 text-center font-mono font-bold text-sm text-white" style={{ background: seg.color }}>
                  {seg.part}
                </div>
                <div className="px-2.5 py-2" style={{ background: "var(--color-surface)" }}>
                  <p className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>{seg.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{seg.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>กติกาการขยับเลข</p>
          <div className="flex flex-col gap-1.5">
            {BUMP_RULES.map((rule) => (
              <div key={rule.from} className="flex items-center gap-2 text-xs rounded-lg px-3 py-2" style={{ background: "var(--color-surface)" }}>
                <span className="font-mono font-semibold" style={{ color: "var(--color-text-primary)" }}>{rule.from}</span>
                <span style={{ color: "var(--color-text-muted)" }}>→</span>
                <span className="font-mono font-semibold" style={{ color: "var(--color-accent)" }}>{rule.to}</span>
                <span className="ml-auto" style={{ color: "var(--color-text-muted)" }}>{rule.when}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Release cadence */}
        <Section title="รอบการออก Release">
          <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
            ออก major release <strong style={{ color: "var(--color-text-primary)" }}>ปีละ 2 รอบ</strong> (ประมาณทุก 6 เดือน) — <strong>R1</strong> ครึ่งปีแรก, <strong>R2</strong> ครึ่งปีหลัง
          </p>

          <div className="flex items-center gap-1 mb-4">
            {TIMELINE.map((t, i) => (
              <div key={t.range} className="flex-1 flex flex-col items-center">
                <div className="w-full h-2 rounded-full" style={{ background: t.color }} />
                <p className="text-xs font-semibold mt-2" style={{ color: "var(--color-text-primary)" }}>{t.range}</p>
                <p className="text-xs text-center mt-0.5" style={{ color: "var(--color-text-muted)" }}>{t.label}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg px-3 py-2.5 mb-3" style={{ background: "var(--color-rag-amber-light)" }}>
            <p className="text-xs" style={{ color: "var(--color-rag-amber-text)" }}>
              <strong>หลักการสำคัญ:</strong> วันออก release ผูกกับ "วันที่" ไม่ใช่ "feature เสร็จ" — feature ที่ไม่ทันรอบนี้ให้เลื่อนไปรอบถัดไป ไม่เลื่อนวัน release
            </p>
          </div>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            <strong style={{ color: "var(--color-text-primary)" }}>Minor release:</strong> ออกเมื่อของพร้อม ไม่กำหนดรอบเวลาตายตัว
          </p>
        </Section>

        {/* Support policy */}
        <Section title="Support Policy">
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Support เฉพาะ <strong style={{ color: "var(--color-text-primary)" }}>R ล่าสุดรอบเดียว</strong> — ถ้าพบ bug ในเวอร์ชันเก่า การแก้ไขจะอยู่ในเวอร์ชันล่าสุด กรุณา upgrade เพื่อรับ fix ยกเว้น critical / security issue จะพิจารณา backport เป็นกรณีไป
          </p>
        </Section>

        {/* Git workflow */}
        <Section title="Git Workflow">
          <ul className="flex flex-col gap-1.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
            <li>• ทำงานบน <code className="font-mono">main</code> เป็นหลัก (trunk-based) ใช้ branch สั้นๆ แล้ว merge เร็ว</li>
            <li>• ตอน feature freeze ตัด branch <code className="font-mono">release/2026R1</code> แยกออกมา ส่วน <code className="font-mono">main</code> เดินหน้าต่อสำหรับรอบถัดไป</li>
            <li>• <strong style={{ color: "var(--color-text-primary)" }}>Tag ทุกครั้งที่ปล่อย</strong> ให้ตรงกับเลขเวอร์ชัน เช่น <code className="font-mono">2026R1.0.0</code>, <code className="font-mono">2026R1.0.1</code></li>
          </ul>
        </Section>

        {/* Hotfix path */}
        <Section title="Hotfix Path (เมื่อ Production มีปัญหา)">
          <ol className="flex flex-col gap-2">
            {HOTFIX_STEPS.map((step, i) => (
              <li key={step} className="flex items-start gap-2.5 text-xs">
                <span
                  className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-semibold text-white"
                  style={{ background: "var(--color-accent)", fontSize: 10 }}
                >
                  {i + 1}
                </span>
                <span style={{ color: "var(--color-text-muted)" }}>{step}</span>
              </li>
            ))}
          </ol>
        </Section>

        {/* Checklist */}
        <Section title="Checklist ก่อนปล่อยทุกครั้ง">
          <div className="flex flex-col gap-2">
            {CHECKLIST.map((item) => (
              <label key={item} className="flex items-center gap-2.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                <input type="checkbox" disabled className="w-4 h-4 accent-accent" />
                {item}
              </label>
            ))}
          </div>
        </Section>
      </div>
    </div>
  )
}
