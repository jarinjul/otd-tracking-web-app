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

type ProductTag = "New App" | "Upgrade Tech stack" | "Internal Use" | "Global Use"

const TAG_STYLE: Record<ProductTag, string> = {
  "New App": "bg-rag-green-light text-rag-green-text",
  "Upgrade Tech stack": "bg-rag-amber-light text-rag-amber-text",
  "Internal Use": "bg-gray-100 text-gray-600",
  "Global Use": "bg-accent-light text-accent",
}

const REPCONEX_PRODUCTS: { name: string; tags: ProductTag[] }[] = [
  { name: "Competency Professional REPCO", tags: ["New App", "Internal Use"] },
  { name: "DBT (Digital Boiler Twin)", tags: ["Upgrade Tech stack", "Global Use"] },
  { name: "Web repconexis.com", tags: ["Upgrade Tech stack", "Global Use"] },
  { name: "ROOTS", tags: ["Global Use"] },
  { name: "SFNEX (Smart Flow NEX)", tags: ["New App", "Global Use"] },
  { name: "SmartOFA NEX", tags: ["New App", "Global Use"] },
  { name: "UHM (Unified Health Management)", tags: ["Upgrade Tech stack", "Global Use"] },
  { name: "UOC Landing Page for UHM", tags: ["New App", "Internal Use"] },
  { name: "AIMS", tags: ["Global Use"] },
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
            <div className="flex flex-col gap-1">
              <span>Operation Monitoring Management</span>
              <div className="flex flex-wrap gap-1">
                {(["New App", "Internal Use"] as ProductTag[]).map((tag) => (
                  <span key={tag} className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${TAG_STYLE[tag]}`}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </SubBox>
        </TeamCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="flex items-center justify-center gap-2 py-3 text-text-muted">
          <ArrowUpDown size={18} />
          <span className="text-xs">เชื่อมโยงข้อมูล & แจ้งเตือน</span>
        </div>
        <div className="flex items-center justify-center gap-2 py-3 text-text-muted">
          <ArrowUpDown size={18} />
          <span className="text-xs">เชื่อมโยงข้อมูล & แจ้งเตือน</span>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-dashed border-accent/40 bg-accent-light/40 p-5">
        <p className="text-sm font-bold text-accent mb-3">CenAI (Centralization AI) · LLM / Integration Layer</p>

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-bold text-text-primary">Application Portfolio · Appsight NEX</p>
          <p className="text-xs text-text-muted mb-3">Tracks every project · 23 total</p>

          <div className="rounded-lg border border-dashed border-border p-4">
            <p className="text-xs font-bold text-text-primary mb-3">REPCONEX Software Platform</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {REPCONEX_PRODUCTS.map((product) => (
                <div key={product.name} className="flex flex-col gap-1">
                  <span className="flex items-center gap-2 text-sm text-text-primary">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                    {product.name}
                  </span>
                  <div className="flex flex-wrap gap-1 pl-3.5">
                    {product.tags.map((tag) => (
                      <span key={tag} className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${TAG_STYLE[tag]}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
