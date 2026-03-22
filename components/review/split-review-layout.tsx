import React from 'react'

interface ReviewLayoutProps {
  breadcrumb: React.ReactNode
  preview: React.ReactNode
  sidebar: React.ReactNode
}

export function SplitReviewLayout({ breadcrumb, preview, sidebar }: ReviewLayoutProps) {
  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Breadcrumb */}
      <div>{breadcrumb}</div>

      {/* Main content: preview hero + sidebar */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Preview — ~65% width on desktop, full width on mobile */}
        <div className="w-full lg:w-[65%] flex-shrink-0">
          {preview}
        </div>

        {/* Sidebar — ~35% width on desktop, full width on mobile */}
        <div className="w-full lg:w-[35%] flex flex-col gap-4">
          {sidebar}
        </div>
      </div>
    </div>
  )
}
