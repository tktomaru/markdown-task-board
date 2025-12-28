import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getTask } from '@/lib/api'

export default function TaskPage() {
  const { projectId, taskId } = useParams<{ projectId: string; taskId: string }>()
  const navigate = useNavigate()

  const { data: task, isLoading, error } = useQuery({
    queryKey: ['task', projectId, taskId],
    queryFn: () => getTask(projectId!, taskId!),
    enabled: !!projectId && !!taskId,
  })

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>読み込み中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-error)' }}>
          タスクの読み込みに失敗しました
        </p>
      </div>
    )
  }

  if (!task) {
    return null
  }

  const statusLabels: { [key: string]: string } = {
    open: '未着手',
    in_progress: '進行中',
    review: 'レビュー待ち',
    blocked: 'ブロック中',
    done: '完了',
    archived: 'アーカイブ',
  }

  const priorityLabels: { [key: string]: string } = {
    P0: 'P0 - 緊急',
    P1: 'P1 - 今すぐ重要',
    P2: 'P2 - 計画内重要',
    P3: 'P3 - 余裕があれば',
    P4: 'P4 - いつか',
  }

  const priorityColors: { [key: string]: string } = {
    P0: '#d32f2f',
    P1: '#f57c00',
    P2: '#1976d2',
    P3: '#388e3c',
    P4: '#757575',
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => navigate(`/projects/${projectId}`)}
          style={{
            backgroundColor: 'transparent',
            color: 'var(--color-text-secondary)',
            border: 'none',
            padding: '0.5rem 0',
            cursor: 'pointer',
            fontSize: '0.875rem',
            marginBottom: '1rem',
          }}
        >
          ← プロジェクトに戻る
        </button>

        <h1 style={{ marginBottom: '1rem' }}>{task.title}</h1>

        {/* Metadata */}
        <div style={{
          display: 'flex',
          gap: '1.5rem',
          flexWrap: 'wrap',
          fontSize: '0.875rem',
        }}>
          <div>
            <span style={{ color: 'var(--color-text-tertiary)' }}>タスクID: </span>
            <span style={{ color: 'var(--color-text)', fontWeight: '500' }}>{task.id}</span>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-tertiary)' }}>ステータス: </span>
            <span style={{
              color: 'var(--color-text)',
              fontWeight: '500',
              padding: '0.25rem 0.5rem',
              backgroundColor: 'var(--color-bg-secondary)',
              borderRadius: '4px',
            }}>
              {statusLabels[task.status] || task.status}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-tertiary)' }}>優先度: </span>
            <span style={{
              color: 'white',
              fontWeight: '500',
              padding: '0.25rem 0.5rem',
              backgroundColor: priorityColors[task.priority] || '#757575',
              borderRadius: '4px',
            }}>
              {priorityLabels[task.priority] || task.priority}
            </span>
          </div>
        </div>

        {/* Assignees and Labels */}
        {(task.assignees?.length > 0 || task.labels?.length > 0) && (
          <div style={{
            display: 'flex',
            gap: '1.5rem',
            marginTop: '1rem',
            fontSize: '0.875rem',
          }}>
            {task.assignees?.length > 0 && (
              <div>
                <span style={{ color: 'var(--color-text-tertiary)' }}>担当者: </span>
                {task.assignees.map((assignee, index) => (
                  <span
                    key={index}
                    style={{
                      display: 'inline-block',
                      marginLeft: '0.25rem',
                      padding: '0.25rem 0.5rem',
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderRadius: '4px',
                      color: 'var(--color-text)',
                    }}
                  >
                    {assignee}
                  </span>
                ))}
              </div>
            )}
            {task.labels?.length > 0 && (
              <div>
                <span style={{ color: 'var(--color-text-tertiary)' }}>ラベル: </span>
                {task.labels.map((label, index) => (
                  <span
                    key={index}
                    style={{
                      display: 'inline-block',
                      marginLeft: '0.25rem',
                      padding: '0.25rem 0.5rem',
                      backgroundColor: 'var(--color-primary)',
                      borderRadius: '4px',
                      color: 'white',
                      fontSize: '0.75rem',
                    }}
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Dates */}
        {(task.start_date || task.due_date) && (
          <div style={{
            display: 'flex',
            gap: '1.5rem',
            marginTop: '1rem',
            fontSize: '0.875rem',
          }}>
            {task.start_date && (
              <div>
                <span style={{ color: 'var(--color-text-tertiary)' }}>開始日: </span>
                <span style={{ color: 'var(--color-text)' }}>
                  {new Date(task.start_date).toLocaleDateString('ja-JP')}
                </span>
              </div>
            )}
            {task.due_date && (
              <div>
                <span style={{ color: 'var(--color-text-tertiary)' }}>期限: </span>
                <span style={{ color: 'var(--color-text)' }}>
                  {new Date(task.due_date).toLocaleDateString('ja-JP')}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Markdown Body */}
      <div style={{
        backgroundColor: 'var(--color-bg-secondary)',
        borderRadius: '8px',
        padding: '2rem',
        border: '1px solid var(--color-border)',
        marginBottom: '2rem',
      }}>
        <h2 style={{ marginBottom: '1rem' }}>詳細</h2>
        <div style={{
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          lineHeight: '1.6',
          color: 'var(--color-text)',
          fontFamily: 'monospace',
          fontSize: '0.875rem',
        }}>
          {task.markdown_body}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          style={{
            backgroundColor: 'var(--color-primary)',
            color: 'white',
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            fontWeight: '600',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          編集
        </button>
        <button
          style={{
            backgroundColor: 'transparent',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            fontWeight: '600',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          タスクパックを生成
        </button>
      </div>

      {/* Timestamps */}
      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        backgroundColor: 'var(--color-bg-secondary)',
        borderRadius: '4px',
        fontSize: '0.75rem',
        color: 'var(--color-text-tertiary)',
      }}>
        <div>作成日時: {new Date(task.created_at).toLocaleString('ja-JP')}</div>
        <div>更新日時: {new Date(task.updated_at).toLocaleString('ja-JP')}</div>
        {task.completed_at && (
          <div>完了日時: {new Date(task.completed_at).toLocaleString('ja-JP')}</div>
        )}
      </div>
    </div>
  )
}
