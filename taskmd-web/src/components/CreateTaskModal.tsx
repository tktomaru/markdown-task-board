import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { createTask, getTasks } from '@/lib/api'

interface CreateTaskModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
}

export default function CreateTaskModal({ isOpen, onClose, projectId }: CreateTaskModalProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [markdownBody, setMarkdownBody] = useState('')
  const [priority, setPriority] = useState('P2')
  const [parentId, setParentId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Fetch tasks for parent selection
  const { data: tasks } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => getTasks(projectId),
    enabled: isOpen,
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => createTask(projectId, data),
    onSuccess: (data) => {
      console.log('Task created successfully:', data)
      setSuccess(true)
      setError(null)

      // Wait a bit to show success message before closing
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
        setTitle('')
        setMarkdownBody('')
        setPriority('P2')
        setParentId('')
        setSuccess(false)
        onClose()
      }, 1000)
    },
    onError: (err: Error) => {
      console.error('Failed to create task:', err)
      setError(err.message || 'Failed to create task')
      setSuccess(false)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setError(null)

    // Generate task ID
    const taskId = `T-${Date.now()}`

    // Build Markdown with YAML metadata
    const markdown = `## ${taskId}: ${title}

\`\`\`yaml
id: ${taskId}
status: open
priority: ${priority}
${parentId ? `parent_id: ${parentId}\n` : ''}assignees: []
labels: []
\`\`\`

${markdownBody || '## 詳細\n\nタスクの詳細をここに記載します。'}
`

    const taskData = {
      markdown_body: markdown,
    }

    console.log('Creating task with markdown:', taskData)
    createMutation.mutate(taskData)
  }

  const handleClose = () => {
    setTitle('')
    setMarkdownBody('')
    setPriority('P2')
    setParentId('')
    setError(null)
    setSuccess(false)
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
        maxWidth: '700px',
        boxShadow: 'var(--shadow-lg)',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        <h2 style={{ marginBottom: '1.5rem' }}>{t('task.create')}</h2>

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
            ✅ タスクを作成しました！
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}>
              {t('task.title')} *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
              placeholder="タスクのタイトルを入力"
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}>
              {t('task.priority')}
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text)',
              }}
            >
              <option value="P0">P0 - 緊急</option>
              <option value="P1">P1 - 今すぐ重要</option>
              <option value="P2">P2 - 計画内重要</option>
              <option value="P3">P3 - 余裕があれば</option>
              <option value="P4">P4 - いつか</option>
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}>
              親タスク（グループ化）
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text)',
              }}
            >
              <option value="">なし（トップレベルタスク）</option>
              {tasks?.map(task => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
            <p style={{
              marginTop: '0.5rem',
              fontSize: '0.75rem',
              color: 'var(--color-text-tertiary)',
            }}>
              親タスクを設定すると、階層的にグループ化されます
            </p>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}>
              詳細（Markdown）
            </label>
            <textarea
              value={markdownBody}
              onChange={(e) => setMarkdownBody(e.target.value)}
              rows={10}
              placeholder="## 背景&#10;&#10;## やること&#10;&#10;## 受け入れ条件"
              style={{
                width: '100%',
                resize: 'vertical',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
              }}
            />
            <p style={{
              marginTop: '0.5rem',
              fontSize: '0.75rem',
              color: 'var(--color-text-tertiary)',
            }}>
              Markdown形式で記述できます
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={createMutation.isPending}
              style={{
                backgroundColor: 'transparent',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: createMutation.isPending ? 'not-allowed' : 'pointer',
                opacity: createMutation.isPending ? 0.5 : 1,
              }}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || success}
              style={{
                backgroundColor: success ? 'var(--color-success)' : 'var(--color-primary)',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1.5rem',
                borderRadius: '4px',
                cursor: (createMutation.isPending || success) ? 'not-allowed' : 'pointer',
                opacity: (createMutation.isPending || success) ? 0.8 : 1,
                fontWeight: '500',
              }}
            >
              {createMutation.isPending ? '⏳ 作成中...' : success ? '✅ 作成完了' : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
