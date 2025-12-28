import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { savedViewsApi } from '@/lib/api'
import TaskPackModal from '@/components/TaskPackModal'
import { useCopyTasks } from '@/hooks/useCopyTasks'
import { useTaskPack } from '@/hooks/useTaskPack'
import { priorityLabels, statusLabels } from '@/lib/labels'
import { debug } from '@/lib/debug'

export default function ViewDetailPage() {
  const { projectId, viewId } = useParams<{ projectId: string; viewId: string }>()
  const navigate = useNavigate()

  const { data: view, isLoading: viewLoading, error: viewError } = useQuery({
    queryKey: ['view', projectId, viewId],
    queryFn: () => savedViewsApi.get(projectId!, viewId!),
    enabled: !!projectId && !!viewId,
    staleTime: 0,
  })

  const { data: tasks, isLoading: tasksLoading, error: tasksError } = useQuery({
    queryKey: ['view-tasks', projectId, viewId],
    queryFn: async () => {
      try {
        debug.group('View Execution', () => {
          debug.log('Project ID:', projectId)
          debug.log('View ID:', viewId)
          debug.log('View Query:', view?.raw_query)
          debug.log('View Data:', view)
        })

        const result = await savedViewsApi.execute(projectId!, viewId!)

        debug.group('View Execution Result', () => {
          debug.log('Task Count:', result?.length || 0)
          debug.log('Tasks:', result)
          if (result && result.length > 0) {
            debug.log('Sample Task:', result[0])
            debug.table(result.map(t => ({
              id: t.id,
              title: t.title,
              status: t.status,
              priority: t.priority,
            })))
          }
        })

        return result
      } catch (err: any) {
        debug.error('View execution failed:', err)
        debug.error('Error response:', err.response)
        debug.error('Error data:', err.response?.data)
        throw err
      }
    },
    enabled: !!projectId && !!viewId && !!view,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const { toastMessage: copyToastMessage, copyTasksAsMarkdown, copyTasksAsText } = useCopyTasks()
  const {
    toastMessage: packToastMessage,
    isTemplateModalOpen,
    openTemplateModal,
    generateWithTemplate,
    closeTemplateModal,
    isGenerating,
  } = useTaskPack()

  const toastMessage = copyToastMessage || packToastMessage

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
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
        }}>
          <h2>タスク一覧</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => copyTasksAsMarkdown(tasks || [])}
              disabled={!tasks || tasks.length === 0}
              style={{
                backgroundColor: 'transparent',
                color: 'var(--color-primary)',
                border: '2px solid var(--color-primary)',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                borderRadius: '6px',
                cursor: (!tasks || tasks.length === 0) ? 'not-allowed' : 'pointer',
                opacity: (!tasks || tasks.length === 0) ? 0.5 : 1,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (tasks && tasks.length > 0) {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary)'
                  e.currentTarget.style.color = 'white'
                }
              }}
              onMouseLeave={(e) => {
                if (tasks && tasks.length > 0) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = 'var(--color-primary)'
                }
              }}
            >
              📋 Markdown
            </button>
            <button
              onClick={() => copyTasksAsText(tasks || [], view?.name || 'ビュー')}
              disabled={!tasks || tasks.length === 0}
              style={{
                backgroundColor: 'transparent',
                color: 'var(--color-primary)',
                border: '2px solid var(--color-primary)',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                borderRadius: '6px',
                cursor: (!tasks || tasks.length === 0) ? 'not-allowed' : 'pointer',
                opacity: (!tasks || tasks.length === 0) ? 0.5 : 1,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (tasks && tasks.length > 0) {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary)'
                  e.currentTarget.style.color = 'white'
                }
              }}
              onMouseLeave={(e) => {
                if (tasks && tasks.length > 0) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = 'var(--color-primary)'
                }
              }}
            >
              📄 Text
            </button>
            <button
              onClick={() => openTemplateModal(tasks || [], projectId!)}
              disabled={!tasks || tasks.length === 0}
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                borderRadius: '6px',
                cursor: (!tasks || tasks.length === 0) ? 'not-allowed' : 'pointer',
                opacity: (!tasks || tasks.length === 0) ? 0.5 : 1,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (tasks && tasks.length > 0) {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)'
                }
              }}
              onMouseLeave={(e) => {
                if (tasks && tasks.length > 0) {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary)'
                }
              }}
            >
              📦 Task Pack
            </button>
          </div>
        </div>

        {tasksError ? (
          <div style={{
            padding: '2rem',
            backgroundColor: 'var(--color-bg-secondary)',
            borderRadius: '8px',
            border: '2px solid var(--color-error)',
          }}>
            <p style={{ color: 'var(--color-error)', marginBottom: '1rem', fontWeight: '600' }}>
              ビューの実行に失敗しました
            </p>
            {tasksError instanceof Error && (
              <div style={{
                marginBottom: '1rem',
                padding: '1rem',
                backgroundColor: 'var(--color-bg-tertiary)',
                borderRadius: '4px',
                fontSize: '0.875rem',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {tasksError.message}
              </div>
            )}
            <details style={{ fontSize: '0.875rem' }}>
              <summary style={{ cursor: 'pointer', color: 'var(--color-text-secondary)', fontWeight: '600' }}>
                詳細情報
              </summary>
              <div style={{ marginTop: '0.5rem' }}>
                <p style={{ marginBottom: '0.5rem', color: 'var(--color-text-secondary)' }}>
                  ビュー情報:
                </p>
                <pre style={{
                  padding: '0.5rem',
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderRadius: '4px',
                  overflow: 'auto',
                  color: 'var(--color-text-secondary)',
                  fontSize: '0.75rem',
                  marginBottom: '1rem',
                }}>
                  {JSON.stringify({ viewId, projectId, query: view?.raw_query }, null, 2)}
                </pre>
                <p style={{ marginBottom: '0.5rem', color: 'var(--color-text-secondary)' }}>
                  エラー情報:
                </p>
                <pre style={{
                  padding: '0.5rem',
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderRadius: '4px',
                  overflow: 'auto',
                  color: 'var(--color-text-secondary)',
                  fontSize: '0.75rem',
                }}>
                  {tasksError instanceof Error ? tasksError.message : JSON.stringify(tasksError, null, 2)}
                </pre>
              </div>
            </details>
            <div style={{ marginTop: '1rem' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                ヒント: ビューのフィルター条件を再設定してみてください
              </p>
            </div>
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
                {(task.extra_meta as any)?.summary && (
                  <p style={{
                    fontSize: '0.875rem',
                    color: 'var(--color-text-secondary)',
                    marginBottom: '0.5rem',
                    fontStyle: 'italic',
                  }}>
                    {(task.extra_meta as any).summary}
                  </p>
                )}
                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  fontSize: '0.875rem',
                  color: 'var(--color-text-secondary)',
                  flexWrap: 'wrap',
                }}>
                  <span>ステータス: {statusLabels[task.status] || task.status}</span>
                  <span>優先度: {priorityLabels[task.priority] || task.priority}</span>
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

      <TaskPackModal
        isOpen={isTemplateModalOpen}
        onClose={closeTemplateModal}
        onGenerate={generateWithTemplate}
        isGenerating={isGenerating}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            backgroundColor: 'var(--color-success)',
            color: 'white',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            boxShadow: 'var(--shadow-lg)',
            fontSize: '0.875rem',
            fontWeight: '500',
            zIndex: 1000,
            animation: 'slideInUp 0.3s ease-out',
          }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  )
}
