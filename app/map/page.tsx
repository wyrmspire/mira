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

  const activeBoardId = searchParams.boardId || summaries[0].id
  const activeBoard = summaries.find(b => b.id === activeBoardId) || summaries[0]
  
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
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none select-none flex flex-col items-center">
          <h1 className="text-sm font-bold text-[#f1f5f9]/60 tracking-wide drop-shadow-md">{activeBoard.name}</h1>
          <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-[0.2em] mt-0.5 drop-shadow-sm">
            {activeBoard.purpose.replace('_', ' ')}
          </span>
        </div>
      </div>
    </div>
  )
}
