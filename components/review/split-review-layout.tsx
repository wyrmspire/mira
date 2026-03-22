interface SplitReviewLayoutProps {
  left: React.ReactNode
  right: React.ReactNode
}

export function SplitReviewLayout({ left, right }: SplitReviewLayoutProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      <div className="flex flex-col gap-4">{left}</div>
      <div className="flex flex-col gap-4">{right}</div>
    </div>
  )
}
