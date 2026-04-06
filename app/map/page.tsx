import { DEFAULT_USER_ID } from '@/lib/constants'
import { createBoard, getBoardGraph, getBoardSummaries } from '@/lib/services/mind-map-service'
import { ThinkCanvas } from '@/components/think/think-canvas'

export const dynamic = 'force-dynamic'

interface MapPageProps {
  searchParams: { boardId?: string }
}

export default async function MapPage({ searchParams }: MapPageProps) {
  const userId = DEFAULT_USER_ID
  let summaries = await getBoardSummaries(userId)

  if (summaries.length === 0) {
    // Auto-create a strategic board if none exists
    await createBoard(userId, 'Strategic Focus', 'strategy')
    summaries = await getBoardSummaries(userId)
  }

  const activeBoardId = searchParams.boardId || summaries[0]?.id
  const activeBoard = summaries.find(b => b.id === activeBoardId) || summaries[0]
  
  if (!activeBoard) {
    return <div className="text-white p-4">Error loading boards. Please try again.</div>
  }

  // Parallel fetch board graph
  const { nodes, edges } = await getBoardGraph(activeBoard.id)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#050510]">
      <div className="flex-1 relative overflow-hidden h-full">
        <ThinkCanvas 
          boardId={activeBoard.id}
          initialNodes={nodes}
          initialEdges={edges}
          userId={userId}
          boards={summaries as any}
        />
        
        {/* Board Context Overlay */}
        <div className="absolute top-6 left-0 right-0 z-10 pointer-events-none flex justify-center">
          <div className="flex flex-col items-center opacity-40 hover:opacity-100 transition-opacity">
            <h1 className="text-xs font-medium text-[#f1f5f9] tracking-widest uppercase">{activeBoard.name}</h1>
          </div>
        </div>

        {/* Back Navigation */}
        <div className="absolute top-6 left-6 z-20">
          <a href="/" className="px-4 py-2 rounded-lg bg-[#1e1e2e]/80 hover:bg-[#2e2e3e] border border-[#2e2e3e] text-xs font-bold text-[#94a3b8] hover:text-white backdrop-blur-md transition-all shadow-lg flex items-center gap-2">
            <span>←</span> Back to Studio
          </a>
        </div>
      </div>
    </div>
  )
}
