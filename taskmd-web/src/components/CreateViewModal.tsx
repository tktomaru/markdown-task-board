import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { savedViewsApi } from '@/lib/api'
import type { SavedView } from '@/types'

interface CreateViewModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  view?: SavedView | null
}

interface FilterCondition {
  status?: string[]
  priority?: string[]
  assignees?: string[]
  labels?: string[]
  hasStartDate?: boolean
  hasDueDate?: boolean
  startDateFrom?: string
  startDateTo?: string
  dueDateFrom?: string
  dueDateTo?: string
}

export default function CreateViewModal({ isOpen, onClose, projectId, view }: CreateViewModalProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [scope, setScope] = useState<'private' | 'shared'>('private')
  const [filters, setFilters] = useState<FilterCondition>({})

  useEffect(() => {
    if (view) {
      setName(view.name)
      setDescription(view.description || '')
      setScope(view.scope)
      // Parse raw_query to extract filters
      try {
        const parsedFilters = parseQueryToFilters(view.raw_query)
        setFilters(parsedFilters)
      } catch (e) {
        console.error('Failed to parse filters:', e)
      }
    } else {
      setName('')
      setDescription('')
      setScope('private')
      setFilters({})
    }
  }, [view])

  const parseQueryToFilters = (query: string): FilterCondition => {
    // Parser for query string
    // Format: status:(open in_progress) priority:P0 start_date:>=2024-01-01
    const filters: FilterCondition = {}
    if (!query || query.trim() === '') return filters

    const parts = query.split(' ')

    let i = 0
    while (i < parts.length) {
      const part = parts[i]
      if (!part || part.trim() === '') {
        i++
        continue
      }

      const colonIndex = part.indexOf(':')
      if (colonIndex === -1) {
        i++
        continue
      }

      const key = part.substring(0, colonIndex)
      let valueStr = part.substring(colonIndex + 1)

      // Check if value starts with parenthesis (multiple values)
      if (valueStr.startsWith('(')) {
        // Collect values until closing parenthesis
        const values: string[] = []

        // Remove opening parenthesis
        if (valueStr.length > 1 && !valueStr.endsWith(')')) {
          // Opening paren is separate from values
          valueStr = valueStr.substring(1)
          if (valueStr) values.push(valueStr)
          i++

          // Continue collecting until closing paren
          while (i < parts.length) {
            const currentPart = parts[i]
            if (currentPart.endsWith(')')) {
              const cleanValue = currentPart.substring(0, currentPart.length - 1)
              if (cleanValue) values.push(cleanValue)
              break
            } else {
              if (currentPart) values.push(currentPart)
            }
            i++
          }
        } else {
          // All in one part: key:(value) or key:()
          const inner = valueStr.substring(1, valueStr.length - 1)
          if (inner) values.push(inner)
        }

        if (key === 'status') filters.status = values
        else if (key === 'priority') filters.priority = values
        else if (key === 'assignees') filters.assignees = values
        else if (key === 'labels') filters.labels = values
      } else {
        // Single value or date with operator
        if (key === 'start_date') {
          if (valueStr.startsWith('>=')) {
            filters.startDateFrom = valueStr.substring(2)
          } else if (valueStr.startsWith('<=')) {
            filters.startDateTo = valueStr.substring(2)
          }
        } else if (key === 'due_date') {
          if (valueStr.startsWith('>=')) {
            filters.dueDateFrom = valueStr.substring(2)
          } else if (valueStr.startsWith('<=')) {
            filters.dueDateTo = valueStr.substring(2)
          }
        } else {
          // Single value
          if (key === 'status') filters.status = [valueStr]
          else if (key === 'priority') filters.priority = [valueStr]
          else if (key === 'assignees') filters.assignees = [valueStr]
          else if (key === 'labels') filters.labels = [valueStr]
        }
      }

      i++
    }

    return filters
  }

  const buildQueryFromFilters = (filters: FilterCondition): string => {
    const parts: string[] = []

    // Helper function to filter out undefined/null/empty values
    const cleanArray = (arr: string[] | undefined): string[] => {
      if (!arr) return []
      return arr.filter(v => v !== undefined && v !== null && v !== '')
    }

    const cleanStatus = cleanArray(filters.status)
    if (cleanStatus.length > 0) {
      if (cleanStatus.length === 1) {
        parts.push(`status:${cleanStatus[0]}`)
      } else {
        parts.push(`status:(${cleanStatus.join(' ')})`)
      }
    }

    const cleanPriority = cleanArray(filters.priority)
    if (cleanPriority.length > 0) {
      if (cleanPriority.length === 1) {
        parts.push(`priority:${cleanPriority[0]}`)
      } else {
        parts.push(`priority:(${cleanPriority.join(' ')})`)
      }
    }

    const cleanAssignees = cleanArray(filters.assignees)
    if (cleanAssignees.length > 0) {
      if (cleanAssignees.length === 1) {
        parts.push(`assignees:${cleanAssignees[0]}`)
      } else {
        parts.push(`assignees:(${cleanAssignees.join(' ')})`)
      }
    }

    const cleanLabels = cleanArray(filters.labels)
    if (cleanLabels.length > 0) {
      if (cleanLabels.length === 1) {
        parts.push(`labels:${cleanLabels[0]}`)
      } else {
        parts.push(`labels:(${cleanLabels.join(' ')})`)
      }
    }

    if (filters.startDateFrom && filters.startDateFrom.trim() !== '') {
      parts.push(`start_date:>=${filters.startDateFrom}`)
    }
    if (filters.startDateTo && filters.startDateTo.trim() !== '') {
      parts.push(`start_date:<=${filters.startDateTo}`)
    }
    if (filters.dueDateFrom && filters.dueDateFrom.trim() !== '') {
      parts.push(`due_date:>=${filters.dueDateFrom}`)
    }
    if (filters.dueDateTo && filters.dueDateTo.trim() !== '') {
      parts.push(`due_date:<=${filters.dueDateTo}`)
    }

    return parts.join(' ')
  }

  const createViewMutation = useMutation({
    mutationFn: (data: Partial<SavedView>) => savedViewsApi.create(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['views', projectId] })
      onClose()
    },
    onError: (error: any) => {
      console.error('Failed to create view:', error)
      console.error('Error response:', error.response?.data)
      alert(`ビューの作成に失敗しました: ${error.message || 'Unknown error'}`)
    },
  })

  const updateViewMutation = useMutation({
    mutationFn: (data: Partial<SavedView>) => savedViewsApi.update(projectId, view!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['views', projectId] })
      onClose()
    },
    onError: (error: any) => {
      console.error('Failed to update view:', error)
      console.error('Error response:', error.response?.data)
      alert(`ビューの更新に失敗しました: ${error.message || 'Unknown error'}`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const rawQuery = buildQueryFromFilters(filters)
    console.log('Generated query from filters:', rawQuery)
    console.log('Filters:', filters)

    // Validate that query is not empty
    if (!rawQuery || rawQuery.trim() === '') {
      alert('少なくとも1つのフィルター条件を設定してください')
      return
    }

    const data: Partial<SavedView> = {
      name,
      description: description || undefined,
      scope,
      raw_query: rawQuery,
      normalized_query: rawQuery, // Same as raw for now
      presentation: {},
    }

    if (view) {
      console.log('Updating view with data:', data)
      updateViewMutation.mutate(data)
    } else {
      console.log('Creating view with data:', data)
      createViewMutation.mutate(data)
    }
  }

  const toggleArrayValue = (arr: string[] | undefined, value: string): string[] => {
    if (!arr) return [value]
    return arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value]
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--color-bg)',
          borderRadius: '8px',
          padding: '2rem',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: '1.5rem' }}>
          {view ? 'ビューを編集' : '新規ビュー作成'}
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Basic Info */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              ビュー名 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              説明
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text)',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              公開範囲
            </label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as 'private' | 'shared')}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text)',
              }}
            >
              <option value="private">プライベート</option>
              <option value="shared">共有</option>
            </select>
          </div>

          {/* Filters */}
          <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
            フィルター条件
          </h3>

          {/* Status Filter */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              ステータス
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {['open', 'in_progress', 'review', 'blocked', 'done', 'archived'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilters({ ...filters, status: toggleArrayValue(filters.status, status) })}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    borderRadius: '4px',
                    border: `2px solid ${filters.status?.includes(status) ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    backgroundColor: filters.status?.includes(status) ? 'var(--color-primary)' : 'transparent',
                    color: filters.status?.includes(status) ? 'white' : 'var(--color-text)',
                    cursor: 'pointer',
                  }}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Priority Filter */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              優先度
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {['P0', 'P1', 'P2', 'P3', 'P4'].map((priority) => (
                <button
                  key={priority}
                  type="button"
                  onClick={() => setFilters({ ...filters, priority: toggleArrayValue(filters.priority, priority) })}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    borderRadius: '4px',
                    border: `2px solid ${filters.priority?.includes(priority) ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    backgroundColor: filters.priority?.includes(priority) ? 'var(--color-primary)' : 'transparent',
                    color: filters.priority?.includes(priority) ? 'white' : 'var(--color-text)',
                    cursor: 'pointer',
                  }}
                >
                  {priority}
                </button>
              ))}
            </div>
          </div>

          {/* Date Filters */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              開始日範囲
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <input
                type="date"
                value={filters.startDateFrom || ''}
                onChange={(e) => setFilters({ ...filters, startDateFrom: e.target.value })}
                placeholder="開始"
                style={{
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text)',
                }}
              />
              <input
                type="date"
                value={filters.startDateTo || ''}
                onChange={(e) => setFilters({ ...filters, startDateTo: e.target.value })}
                placeholder="終了"
                style={{
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text)',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              期限日範囲
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <input
                type="date"
                value={filters.dueDateFrom || ''}
                onChange={(e) => setFilters({ ...filters, dueDateFrom: e.target.value })}
                placeholder="開始"
                style={{
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text)',
                }}
              />
              <input
                type="date"
                value={filters.dueDateTo || ''}
                onChange={(e) => setFilters({ ...filters, dueDateTo: e.target.value })}
                placeholder="終了"
                style={{
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text)',
                }}
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
            <button
              type="submit"
              disabled={createViewMutation.isPending || updateViewMutation.isPending}
              style={{
                flex: 1,
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                fontWeight: '600',
                borderRadius: '6px',
                border: 'none',
                cursor: createViewMutation.isPending || updateViewMutation.isPending ? 'not-allowed' : 'pointer',
                opacity: createViewMutation.isPending || updateViewMutation.isPending ? 0.6 : 1,
              }}
            >
              {view ? '更新' : '作成'}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                backgroundColor: 'transparent',
                color: 'var(--color-text)',
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                fontWeight: '600',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                cursor: 'pointer',
              }}
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
