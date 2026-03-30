import { DEFAULT_USER_ID } from '@/lib/constants'
import { getBoards, createBoard, getBoardGraph } from '@/lib/services/mind-map-service'
import { ThinkCanvas } from '@/components/think/think-canvas'
import { ThinkBoardSwitcher } from '@/components/think/think-board-switcher'
import { COPY } from '@/lib/studio-copy'

export const dynamic = 'force-dynamic'

interface MapPageProps {
  searchParams: { boardId?: string }
}

export default async function MapPage({ searchParams }: MapPageProps) {
  const userId = DEFAULT_USER_ID
  let boards = await getBoards(userId)

  if (boards.length === 0) {
    // Auto-create a default board if none exists
    const newBoard = await createBoard(userId, 'My Thinking Space')
    boards = [newBoard]
  }

  const activeBoardId = searchParams.boardId || boards[0].id
  const activeBoard = boards.find(b => b.id === activeBoardId) || boards[0]
  const { nodes, edges } = await getBoardGraph(activeBoard.id)

  return (
    <div className="flex flex-col h-screen bg-[#050510]">
      <div className="flex items-center justify-between p-4 border-b border-[#1e1e2e] bg-[#0a0a1a]">
        <div>
          <h1 className="text-xl font-bold text-[#e2e8f0]">{COPY.mindMap.heading}</h1>
          <p className="text-sm text-[#94a3b8]">{COPY.mindMap.subheading}</p>
        </div>
        <div className="flex items-center gap-3">
          <ThinkBoardSwitcher boards={boards} activeBoardId={activeBoard.id} />
        </div>
      </div>
      
      <div className="flex-1 relative overflow-hidden">
        <ThinkCanvas 
          boardId={activeBoard.id}
          initialNodes={nodes}
          initialEdges={edges}
          userId={userId}
        />
      </div>
    </div>
  )
}
