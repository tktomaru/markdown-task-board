import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { savedViewsApi } from '@/lib/api'
import CreateViewModal from '@/components/CreateViewModal'
import type { SavedView } from '@/types'

export default function SavedViewsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingView, setEditingView] = useState<SavedView | null>(null)

  const { data: views, isLoading, error } = useQuery({
    queryKey: ['views', projectId],
    queryFn: () => savedViewsApi.list(projectId!),
    enabled: !!projectId,
  })

  const deleteViewMutation = useMutation({
    mutationFn: (viewId: string) => savedViewsApi.delete(projectId!, viewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['views', projectId] })
    },
  })

  const handleEdit = (view: SavedView) => {
    setEditingView(view)
    setIsCreateModalOpen(true)
  }

  const handleDelete = async (viewId: string) => {
    if (confirm('このビューを削除しますか？')) {
      deleteViewMutation.mutate(viewId)
    }
  }

  const handleCloseModal = () => {
    setIsCreateModalOpen(false)
    setEditingView(null)
  }

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

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
        }}>
          <h1>Saved Views</h1>
          <button
            onClick={() => setIsCreateModalOpen(true)}
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
            ➕ 新規ビュー作成
          </button>
        </div>
      </div>

      {/* Views List */}
      {views && views.length > 0 ? (
        <div style={{
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        }}>
          {views.map((view) => (
            <div
              key={view.id}
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                padding: '1.5rem',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary)'
                e.currentTarget.style.boxShadow = 'var(--shadow-md)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <h3 style={{ marginBottom: '0.5rem' }}>{view.name}</h3>
              {view.description && (
                <p style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: '0.875rem',
                  marginBottom: '1rem',
                }}>
                  {view.description}
                </p>
              )}
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                fontSize: '0.75rem',
                color: 'var(--color-text-tertiary)',
                marginBottom: '1rem',
              }}>
                <span>使用回数: {view.use_count}</span>
                {view.last_used_at && (
                  <span>最終使用: {new Date(view.last_used_at).toLocaleDateString('ja-JP')}</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => navigate(`/projects/${projectId}/views/${view.id}`)}
                  style={{
                    flex: 1,
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  表示
                </button>
                <button
                  onClick={() => handleEdit(view)}
                  style={{
                    flex: 1,
                    backgroundColor: 'transparent',
                    color: 'var(--color-text)',
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    borderRadius: '4px',
                    border: '1px solid var(--color-border)',
                    cursor: 'pointer',
                  }}
                >
                  編集
                </button>
                <button
                  onClick={() => handleDelete(view.id)}
                  style={{
                    backgroundColor: 'transparent',
                    color: 'var(--color-error)',
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    borderRadius: '4px',
                    border: '1px solid var(--color-error)',
                    cursor: 'pointer',
                  }}
                >
                  削除
                </button>
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
          <p style={{ marginBottom: '0.5rem', color: 'var(--color-text-secondary)' }}>
            保存されたビューがありません
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)', marginBottom: '1rem' }}>
            ビューを作成して、カスタムフィルター条件でタスクを表示できます
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
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
            ➕ 新規ビュー作成
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      <CreateViewModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModal}
        projectId={projectId!}
        view={editingView}
      />
    </div>
  )
}
