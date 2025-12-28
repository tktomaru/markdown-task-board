import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { savedViewsApi } from '@/lib/api'

export default function Sidebar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { projectId } = useParams<{ projectId: string }>()

  const { data: views, isLoading } = useQuery({
    queryKey: ['views', projectId],
    queryFn: () => savedViewsApi.list(projectId!),
    enabled: !!projectId,
  })

  const handleViewClick = (viewId: string) => {
    if (projectId) {
      navigate(`/projects/${projectId}/views/${viewId}`)
    }
  }

  const handleManageViews = () => {
    if (projectId) {
      navigate(`/projects/${projectId}/views`)
    }
  }

  return (
    <aside style={{
      width: '250px',
      borderRight: '1px solid var(--color-border)',
      padding: '1rem',
      overflow: 'auto',
      backgroundColor: 'var(--color-bg-secondary)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem',
      }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 'bold' }}>
          {t('sidebar.savedViews', 'Saved Views')}
        </h2>
        {projectId && (
          <button
            onClick={handleManageViews}
            style={{
              backgroundColor: 'transparent',
              color: 'var(--color-primary)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.2rem',
              padding: '0.25rem',
            }}
            title={t('sidebar.manageViews', 'ビューを管理')}
          >
            ⚙️
          </button>
        )}
      </div>

      {!projectId ? (
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>
          {t('sidebar.selectProject', 'プロジェクトを選択してください')}
        </p>
      ) : isLoading ? (
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>
          {t('sidebar.loading', '読み込み中...')}
        </p>
      ) : views && views.length > 0 ? (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {views.map((view) => {
            const isActive = location.pathname.includes(`/views/${view.id}`)
            return (
              <li
                key={view.id}
                onClick={() => handleViewClick(view.id)}
                style={{
                  padding: '0.5rem 0.75rem',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  marginBottom: '0.25rem',
                  backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                  color: isActive ? 'white' : 'var(--color-text)',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }
                }}
              >
                <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                  {view.name}
                </div>
                {view.description && (
                  <div style={{
                    fontSize: '0.75rem',
                    opacity: 0.8,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {view.description}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>
          <p style={{ marginBottom: '0.5rem' }}>
            {t('sidebar.noViews', '保存されたビューがありません')}
          </p>
          <button
            onClick={handleManageViews}
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              padding: '0.5rem 0.75rem',
              fontSize: '0.75rem',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            {t('sidebar.createView', 'ビューを作成')}
          </button>
        </div>
      )}
    </aside>
  )
}
