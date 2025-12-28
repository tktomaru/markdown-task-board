import { useState } from 'react'
import type { Task } from '@/types'

interface BulkEditModalProps {
  isOpen: boolean
  onClose: () => void
  selectedTasks: Task[]
  onUpdate: (updates: BulkUpdateData) => void
  isUpdating: boolean
}

export interface BulkUpdateData {
  status?: string
  priority?: string
  assignees?: string[]
  labels?: string[]
}

export default function BulkEditModal({
  isOpen,
  onClose,
  selectedTasks,
  onUpdate,
  isUpdating,
}: BulkEditModalProps) {
  const [status, setStatus] = useState<string>('')
  const [priority, setPriority] = useState<string>('')
  const [assigneesText, setAssigneesText] = useState<string>('')
  const [labelsText, setLabelsText] = useState<string>('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const updates: BulkUpdateData = {}

    if (status) updates.status = status
    if (priority) updates.priority = priority
    if (assigneesText.trim()) {
      updates.assignees = assigneesText.split(',').map(a => a.trim()).filter(a => a)
    }
    if (labelsText.trim()) {
      updates.labels = labelsText.split(',').map(l => l.trim()).filter(l => l)
    }

    if (Object.keys(updates).length === 0) {
      alert('少なくとも1つの項目を変更してください')
      return
    }

    onUpdate(updates)
  }

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
          maxWidth: '500px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: '1rem' }}>
          一括編集 ({selectedTasks.length}件のタスク)
        </h2>
        <p style={{ marginBottom: '1.5rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          変更したい項目のみ選択してください。空欄の項目は変更されません。
        </p>

        <form onSubmit={handleSubmit}>
          {/* Status */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              ステータス
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text)',
              }}
            >
              <option value="">変更しない</option>
              <option value="open">未着手</option>
              <option value="in_progress">進行中</option>
              <option value="review">レビュー待ち</option>
              <option value="blocked">ブロック中</option>
              <option value="done">完了</option>
              <option value="archived">アーカイブ</option>
            </select>
          </div>

          {/* Priority */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              優先度
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text)',
              }}
            >
              <option value="">変更しない</option>
              <option value="P0">P0 - 緊急</option>
              <option value="P1">P1 - 今すぐ重要</option>
              <option value="P2">P2 - 計画内重要</option>
              <option value="P3">P3 - 余裕があれば</option>
              <option value="P4">P4 - いつか</option>
            </select>
          </div>

          {/* Assignees */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              担当者（カンマ区切り）
            </label>
            <input
              type="text"
              value={assigneesText}
              onChange={(e) => setAssigneesText(e.target.value)}
              placeholder="例: user1, user2, user3"
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

          {/* Labels */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              ラベル（カンマ区切り）
            </label>
            <input
              type="text"
              value={labelsText}
              onChange={(e) => setLabelsText(e.target.value)}
              placeholder="例: bug, feature, urgent"
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

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
            <button
              type="submit"
              disabled={isUpdating}
              style={{
                flex: 1,
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                fontWeight: '600',
                borderRadius: '6px',
                border: 'none',
                cursor: isUpdating ? 'not-allowed' : 'pointer',
                opacity: isUpdating ? 0.6 : 1,
              }}
            >
              {isUpdating ? '更新中...' : '一括更新'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isUpdating}
              style={{
                flex: 1,
                backgroundColor: 'transparent',
                color: 'var(--color-text)',
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                fontWeight: '600',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                cursor: isUpdating ? 'not-allowed' : 'pointer',
                opacity: isUpdating ? 0.6 : 1,
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
