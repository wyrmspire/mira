import { COPY } from '@/lib/studio-copy'

type Filter = 'all' | 'unread' | 'errors'

interface InboxFilterTabsProps {
  filter: Filter
  onChange: (filter: Filter) => void
  counts?: {
    all: number
    unread: number
    errors: number
  }
}

export function InboxFilterTabs({ filter, onChange, counts }: InboxFilterTabsProps) {
  const tabs: { value: Filter; label: string }[] = [
    { value: 'all', label: `${COPY.inbox.filters.all}${counts ? ` (${counts.all})` : ''}` },
    { value: 'unread', label: `${COPY.inbox.filters.unread}${counts ? ` (${counts.unread})` : ''}` },
    { value: 'errors', label: `${COPY.inbox.filters.errors}${counts ? ` (${counts.errors})` : ''}` },
  ]

  return (
    <div className="flex gap-1 p-1 bg-[#12121a] border border-[#1e1e2e] rounded-lg w-fit">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${
            filter === tab.value
              ? 'bg-[#1e1e2e] text-[#e2e8f0]'
              : 'text-[#94a3b8] hover:text-[#e2e8f0]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
