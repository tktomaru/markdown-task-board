import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { savedViewsApi } from '@/lib/api'

export default function ViewDetailPage() {
  const { projectId, viewId } = useParams<{ projectId: string; viewId: string }>()
  const navigate = useNavigate()

  const { data: view, isLoading: viewLoading, error: viewError } = useQuery({
    queryKey: ['view', projectId, viewId],
    queryFn: () => savedViewsApi.get(projectId!, viewId!),
    enabled: !!projectId && !!viewId,
  })

  const { data: tasks, isLoading: tasksLoading, error: tasksError } = useQuery({
    queryKey: ['view-tasks', projectId, viewId],
    queryFn: async () => {
      try {
        return await savedViewsApi.execute(projectId!, viewId!)
      } catch (err: any) {
        console.error('Error executing view:', err)
        console.error('Error details:', err.response?.data)
        throw err
      }
    },
    enabled: !!projectId && !!viewId,
  })

  if (viewLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>読み込み中...</p>
      </div>
    )
  }

  if (viewError) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-error)' }}>
          ビューの読み込みに失敗しました
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => navigate(`/projects/${projectId}/views`)}
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
          ← Saved Viewsに戻る
        </button>

        <h1>{view?.name}</h1>
        {view?.description && (
          <p style={{ marginTop: '0.5rem', color: 'var(--color-text-secondary)' }}>
            {view.description}
          </p>
        )}

        <div style={{
          marginTop: '1rem',
          display: 'flex',
          gap: '1rem',
          fontSize: '0.875rem',
          color: 'var(--color-text-tertiary)',
        }}>
          <span>使用回数: {view?.use_count}</span>
          <span>公開範囲: {view?.scope === 'private' ? 'プライベート' : '共有'}</span>
          {view?.last_used_at && (
            <span>最終使用: {new Date(view.last_used_at).toLocaleDateString('ja-JP')}</span>
          )}
        </div>

        {/* Debug: Show query */}
        {view?.raw_query && (
          <details style={{
            marginTop: '1rem',
            padding: '0.5rem',
            backgroundColor: 'var(--color-bg-secondary)',
            borderRadius: '4px',
            fontSize: '0.75rem',
          }}>
            <summary style={{ cursor: 'pointer', fontWeight: '600' }}>クエリ情報</summary>
            <pre style={{
              marginTop: '0.5rem',
              padding: '0.5rem',
              backgroundColor: 'var(--color-bg-tertiary)',
              borderRadius: '4px',
              overflow: 'auto',
            }}>
              {view.raw_query}
            </pre>
          </details>
        )}
      </div>

      {/* Tasks */}
      <div>
        <h2 style={{ marginBottom: '1.5rem' }}>タスク一覧</h2>

        {tasksError ? (
          <div style={{
            padding: '2rem',
            backgroundColor: 'var(--color-bg-secondary)',
            borderRadius: '8px',
            border: '2px solid var(--color-error)',
          }}>
            <p style={{ color: 'var(--color-error)', marginBottom: '1rem' }}>
              タスクの読み込みに失敗しました
            </p>
            <details style={{ fontSize: '0.875rem' }}>
              <summary style={{ cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                エラー詳細
              </summary>
              <pre style={{
                marginTop: '0.5rem',
                padding: '0.5rem',
                backgroundColor: 'var(--color-bg-tertiary)',
                borderRadius: '4px',
                overflow: 'auto',
                color: 'var(--color-text-secondary)',
                fontSize: '0.75rem',
              }}>
                {tasksError instanceof Error ? tasksError.message : JSON.stringify(tasksError, null, 2)}
              </pre>
            </details>
          </div>
        ) : tasksLoading ? (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--color-text-tertiary)',
          }}>
            <p>読み込み中...</p>
          </div>
        ) : tasks && tasks.length > 0 ? (
          <div style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
            overflow: 'hidden',
          }}>
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => navigate(`/projects/${projectId}/tasks/${task.id}`)}
                style={{
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <h3 style={{ marginBottom: '0.5rem' }}>{task.title}</h3>
                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  fontSize: '0.875rem',
                  color: 'var(--color-text-secondary)',
                  flexWrap: 'wrap',
                }}>
                  <span>ステータス: {task.status}</span>
                  <span>優先度: {task.priority}</span>
                  {task.start_date && (
                    <span>開始: {new Date(task.start_date).toLocaleDateString('ja-JP')}</span>
                  )}
                  {task.due_date && (
                    <span>期限: {new Date(task.due_date).toLocaleDateString('ja-JP')}</span>
                  )}
                  {task.assignees && task.assignees.length > 0 && (
                    <span>担当: {task.assignees.join(', ')}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            padding: '3rem',
            textAlign: 'center',
            backgroundColor: 'var(--color-bg-secondary)',
            borderRadius: '8px',
            border: '2px dashed var(--color-border)',
          }}>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              このビューに該当するタスクがありません
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
