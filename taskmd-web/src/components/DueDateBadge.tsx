import { getDueDateInfo, formatDueDate } from '@/lib/dueDate'

interface DueDateBadgeProps {
  dueDate: string | null | undefined
  showDate?: boolean
}

export default function DueDateBadge({ dueDate, showDate = true }: DueDateBadgeProps) {
  const info = getDueDateInfo(dueDate)

  if (info.category === 'no_due' && !showDate) return null

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.25rem 0.75rem',
        fontSize: '0.75rem',
        fontWeight: '600',
        color: info.color,
        backgroundColor: info.backgroundColor,
        border: info.category === 'no_due' ? '1px solid var(--color-border)' : 'none',
        borderRadius: '12px',
        whiteSpace: 'nowrap',
      }}
    >
      {info.label}
      {showDate && dueDate && info.category !== 'no_due' && (
        <span style={{ opacity: 0.9 }}>
          ({formatDueDate(dueDate)})
        </span>
      )}
    </span>
  )
}
