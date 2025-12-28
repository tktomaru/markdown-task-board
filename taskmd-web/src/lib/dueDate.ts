// Due date utility functions

export type DueDateCategory = 'overdue' | 'today' | 'soon' | 'later' | 'no_due'

export interface DueDateInfo {
  category: DueDateCategory
  label: string
  color: string
  backgroundColor: string
}

export const getDueDateCategory = (dueDate: string | null | undefined): DueDateCategory => {
  if (!dueDate) return 'no_due'

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)

  const diffTime = due.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'overdue'
  if (diffDays === 0) return 'today'
  if (diffDays <= 3) return 'soon'
  return 'later'
}

export const getDueDateInfo = (dueDate: string | null | undefined): DueDateInfo => {
  const category = getDueDateCategory(dueDate)

  const infoMap: Record<DueDateCategory, DueDateInfo> = {
    overdue: {
      category: 'overdue',
      label: '期限切れ',
      color: '#ffffff',
      backgroundColor: '#d32f2f',
    },
    today: {
      category: 'today',
      label: '今日',
      color: '#ffffff',
      backgroundColor: '#f57c00',
    },
    soon: {
      category: 'soon',
      label: '近日',
      color: '#ffffff',
      backgroundColor: '#fbc02d',
    },
    later: {
      category: 'later',
      label: '予定あり',
      color: '#ffffff',
      backgroundColor: '#388e3c',
    },
    no_due: {
      category: 'no_due',
      label: '期限なし',
      color: 'var(--color-text-tertiary)',
      backgroundColor: 'transparent',
    },
  }

  return infoMap[category]
}

export const formatDueDate = (dueDate: string | null | undefined): string => {
  if (!dueDate) return ''

  const date = new Date(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)

  const diffTime = date.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return '今日'
  if (diffDays === 1) return '明日'
  if (diffDays === -1) return '昨日'
  if (diffDays > 0 && diffDays <= 7) return `${diffDays}日後`
  if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)}日前`

  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })
}
