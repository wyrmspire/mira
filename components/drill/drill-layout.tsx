interface DrillLayoutProps {
  children: React.ReactNode
  progress?: React.ReactNode
}

export function DrillLayout({ children, progress }: DrillLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      {progress && (
        <div className="w-full border-b border-[#1e1e2e]">
          {progress}
        </div>
      )}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          {children}
        </div>
      </div>
    </div>
  )
}
