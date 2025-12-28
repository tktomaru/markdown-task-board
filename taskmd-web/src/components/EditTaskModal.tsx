import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateTask } from '@/lib/api'
import type { Task } from '@/types'

interface EditTaskModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  task: Task
}

export default function EditTaskModal({ isOpen, onClose, projectId, task }: EditTaskModalProps) {
  const queryClient = useQueryClient()
  const [markdownBody, setMarkdownBody] = useState(task.markdown_body)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  useEffect(() => {
    if (isOpen) {
      setMarkdownBody(task.markdown_body)
      setError(null)
      setSuccess(false)
      setValidationErrors([])
    }
  }, [isOpen, task.markdown_body])

  const validateMarkdown = (markdown: string): string[] => {
    const errors: string[] = []

    // Check for YAML frontmatter
    if (!markdown.includes('```yaml')) {
      errors.push('YAMLフロントマターが見つかりません（```yaml ... ```）')
    }

    // Check for required fields in YAML
    const yamlMatch = markdown.match(/```yaml\n([\s\S]*?)\n```/)
    if (yamlMatch) {
      const yamlContent = yamlMatch[1]

      if (!yamlContent.includes('id:')) {
        errors.push('YAMLにid:フィールドが必要です')
      }
      if (!yamlContent.includes('status:')) {
        errors.push('YAMLにstatus:フィールドが必要です')
      }
      if (!yamlContent.includes('priority:')) {
        errors.push('YAMLにpriority:フィールドが必要です')
      }
      if (!yamlContent.includes('assignees:')) {
        errors.push('YAMLにassignees:フィールドが必要です')
      }
      if (!yamlContent.includes('labels:')) {
        errors.push('YAMLにlabels:フィールドが必要です')
      }

      // Check for valid status values
      const statusMatch = yamlContent.match(/status:\s*(\w+)/)
      if (statusMatch) {
        const validStatuses = ['open', 'in_progress', 'review', 'blocked', 'done', 'archived']
        if (!validStatuses.includes(statusMatch[1])) {
          errors.push(`無効なステータス: ${statusMatch[1]}（有効: ${validStatuses.join(', ')}）`)
        }
      }

      // Check for valid priority values
      const priorityMatch = yamlContent.match(/priority:\s*(\w+)/)
      if (priorityMatch) {
        const validPriorities = ['P0', 'P1', 'P2', 'P3', 'P4']
        if (!validPriorities.includes(priorityMatch[1])) {
          errors.push(`無効な優先度: ${priorityMatch[1]}（有効: ${validPriorities.join(', ')}）`)
        }
      }
    }

    // Check for unclosed code blocks
    const codeBlockCount = (markdown.match(/```/g) || []).length
    if (codeBlockCount % 2 !== 0) {
      errors.push('コードブロックが閉じられていません（``` の数が奇数です）')
    }

    return errors
  }

  const handleMarkdownChange = (value: string) => {
    setMarkdownBody(value)
    const errors = validateMarkdown(value)
    setValidationErrors(errors)
  }

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateTask(projectId, task.id, data),
    onSuccess: () => {
      setSuccess(true)
      setError(null)

      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['task', projectId, task.id] })
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
        setSuccess(false)
        onClose()
      }, 1000)
    },
    onError: (err: Error) => {
      setError(err.message || 'タスクの更新に失敗しました')
      setSuccess(false)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const errors = validateMarkdown(markdownBody)
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }

    setError(null)
    const taskData = { markdown_body: markdownBody }
    updateMutation.mutate(taskData)
  }

  const handleClose = () => {
    setMarkdownBody(task.markdown_body)
    setError(null)
    setSuccess(false)
    setValidationErrors([])
    onClose()
  }

  if (!isOpen) return null

  return (
    <div style={{
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
    }}>
      <div style={{
        backgroundColor: 'var(--color-bg)',
        padding: '2rem',
        borderRadius: '8px',
        width: '90%',
        maxWidth: '1200px',
        boxShadow: 'var(--shadow-lg)',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        <h2 style={{ marginBottom: '1.5rem' }}>タスクを編集</h2>

        {error && (
          <div style={{
            padding: '0.75rem',
            marginBottom: '1rem',
            backgroundColor: 'var(--color-error)',
            color: 'white',
            borderRadius: '4px',
            fontSize: '0.875rem',
          }}>
            ❌ {error}
          </div>
        )}

        {success && (
          <div style={{
            padding: '0.75rem',
            marginBottom: '1rem',
            backgroundColor: 'var(--color-success)',
            color: 'white',
            borderRadius: '4px',
            fontSize: '0.875rem',
          }}>
            ✅ タスクを更新しました！
          </div>
        )}

        {validationErrors.length > 0 && (
          <div style={{
            padding: '0.75rem',
            marginBottom: '1rem',
            backgroundColor: '#fff3cd',
            color: '#856404',
            borderRadius: '4px',
            fontSize: '0.875rem',
            border: '1px solid #ffeeba',
          }}>
            <strong>⚠️ 検証エラー:</strong>
            <ul style={{ marginTop: '0.5rem', marginBottom: 0, paddingLeft: '1.5rem' }}>
              {validationErrors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}>
              Markdown
            </label>
            <textarea
              value={markdownBody}
              onChange={(e) => handleMarkdownChange(e.target.value)}
              rows={20}
              style={{
                width: '100%',
                resize: 'vertical',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text)',
                border: `1px solid ${validationErrors.length > 0 ? '#f57c00' : 'var(--color-border)'}`,
                borderRadius: '4px',
                padding: '1rem',
              }}
            />
            <p style={{
              marginTop: '0.5rem',
              fontSize: '0.75rem',
              color: 'var(--color-text-tertiary)',
            }}>
              Markdown形式で記述してください。YAMLフロントマターは必須です。
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={updateMutation.isPending}
              style={{
                backgroundColor: 'transparent',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: updateMutation.isPending ? 'not-allowed' : 'pointer',
                opacity: updateMutation.isPending ? 0.5 : 1,
              }}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending || success || validationErrors.length > 0}
              style={{
                backgroundColor: success ? 'var(--color-success)' : 'var(--color-primary)',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1.5rem',
                borderRadius: '4px',
                cursor: (updateMutation.isPending || success || validationErrors.length > 0) ? 'not-allowed' : 'pointer',
                opacity: (updateMutation.isPending || success || validationErrors.length > 0) ? 0.8 : 1,
                fontWeight: '500',
              }}
            >
              {updateMutation.isPending ? '⏳ 更新中...' : success ? '✅ 更新完了' : '更新'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
