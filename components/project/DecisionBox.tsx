import { ClipboardList } from "lucide-react"

interface DecisionBoxProps {
  note?: string | null
}

export function DecisionBox({ note }: DecisionBoxProps) {
  return (
    <div className="bg-rag-amber-light border-l-4 border-l-rag-amber rounded-r-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <ClipboardList size={16} className="text-rag-amber-text" />
        <span className="font-semibold text-sm text-rag-amber-text">ต้องการการตัดสินใจจากผู้บริหาร</span>
      </div>
      {note && <p className="text-sm text-rag-amber-text">{note}</p>}
    </div>
  )
}
