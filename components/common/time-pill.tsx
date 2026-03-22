import { formatRelativeTime } from '@/lib/date'

interface TimePillProps {
  dateString: string
  prefix?: string
}

export function TimePill({ dateString, prefix }: TimePillProps) {
  return (
    <span className="inline-flex items-center text-xs text-[#94a3b8]">
      {prefix && <span className="mr-1">{prefix}</span>}
      <time dateTime={dateString}>{formatRelativeTime(dateString)}</time>
    </span>
  )
}
