import { ArrowUpDown } from "lucide-react"

export const metadata = { title: "Landscape — Nexus Hub" }

function TeamCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card overflow-hidden ${className}`}>
      <div className="px-4 py-2.5 bg-rag-green-light">
        <p className="text-sm font-bold text-text-primary">{title}</p>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function SubBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="px-3 py-1.5 bg-rag-green-light">
        <p className="text-xs font-bold text-text-primary">{title}</p>
      </div>
      <div className="p-3 flex flex-col gap-1 text-xs text-text-muted">{children}</div>
    </div>
  )
}

const REPCONEX_PRODUCTS = [
  "Competency Professional REPCO",
  "DBT (Digital Boiler Twin)",
  "Web repconexis.com",
  "ROOTS",
  "SFNEX (Smart Flow NEX)",
  "SmartOFA NEX",
  "UHM (Unified Health Management)",
  "UOC Landing Page for UHM",
  "ZenithNEX",
  "AIMS",
]

export default function LandscapePage() {
  return (
    <div className="px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Tech Landscape</h1>
        <p className="text-text-muted mt-1">แผนภาพภาพรวม: ทีม เครื่องมือ และ software ทั้งหมดที่เชื่อมโยงกัน</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <TeamCard title="Tech Development Team">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SubBox title="Requirements & Design">
              <span>STMNEX</span>
              <span>BlueFin</span>
            </SubBox>
            <SubBox title="Development">
              <div className="grid grid-cols-2 gap-x-3">
                <span>Claude Code</span><span>MANTA</span>
                <span>Cursor</span><span>VS Code</span>
                <span>Codex</span><span>KRAKEN</span>
              </div>
            </SubBox>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            <SubBox title="Management Dev Board">
              <span>NEXUS HUB NEX</span>
            </SubBox>
            <SubBox title="Testing">
              <span>QA Automate Testing</span>
              <span>Pre-VA scan</span>
              <span>Serpent</span>
            </SubBox>
            <SubBox title="Deployment">
              <span>Azure DevOps</span>
              <span>SecDevOps CI/CD</span>
            </SubBox>
          </div>
        </TeamCard>

        <TeamCard title="Operation Team">
          <SubBox title="Operation Dashboard">
            <span>Operation Monitoring</span>
            <span>Management</span>
          </SubBox>
        </TeamCard>
      </div>

      <div className="flex items-center justify-center gap-2 py-3 text-text-muted">
        <ArrowUpDown size={18} />
        <span className="text-xs">เชื่อมโยงข้อมูล & แจ้งเตือนระหว่างทีม</span>
      </div>

      <div className="rounded-2xl border-2 border-dashed border-accent/40 bg-accent-light/40 p-5">
        <p className="text-sm font-bold text-accent mb-3">CenAI (Centralization AI) · LLM / Integration Layer</p>

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-bold text-text-primary">Application Portfolio · Appsight NEX</p>
          <p className="text-xs text-text-muted mb-3">Tracks every project · 23 total</p>

          <div className="rounded-lg border border-dashed border-border p-4">
            <p className="text-xs font-bold text-text-primary mb-2">REPCONEX Software Platform</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-sm text-text-primary">
              {REPCONEX_PRODUCTS.map((name) => (
                <span key={name} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
