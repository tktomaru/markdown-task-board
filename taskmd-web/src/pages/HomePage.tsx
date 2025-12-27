import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getProjects } from '@/lib/api'
import CreateProjectModal from '@/components/CreateProjectModal'

export default function HomePage() {
  const { t } = useTranslation()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const { data: projects, isLoading, error, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      console.log('Fetching projects...')
      try {
        const result = await getProjects()
        console.log('Projects fetched:', result)
        return result
      } catch (err) {
        console.error('Error fetching projects:', err)
        throw err
      }
    },
  })

  console.log('HomePage render:', { projects, isLoading, error })

  return (
    <div>
      <h1>{t('home.welcome')}</h1>
      <p style={{ marginTop: '1rem', color: 'var(--color-text-secondary)' }}>
        {t('home.tagline')}
      </p>

      <div style={{ marginTop: '2rem' }}>
        <h2>{t('home.gettingStarted')}</h2>
        <ul style={{ marginTop: '1rem', marginLeft: '2rem', color: 'var(--color-text-secondary)' }}>
          <li>{t('home.steps.createProject')}</li>
          <li>{t('home.steps.addTasks')}</li>
          <li>{t('home.steps.useSavedViews')}</li>
          <li>{t('home.steps.generateTaskPacks')}</li>
        </ul>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2>{t('home.projectsTitle')}</h2>
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
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)'
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = 'var(--shadow-lg)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary)'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'var(--shadow-md)'
            }}
          >
            ➕ {t('home.createProject')}
          </button>
        </div>

        {error ? (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            backgroundColor: 'var(--color-bg-secondary)',
            borderRadius: '8px',
            border: '2px solid var(--color-error)',
          }}>
            <p style={{ marginBottom: '0.5rem', color: 'var(--color-error)' }}>
              ❌ プロジェクトの読み込みに失敗しました
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)', marginBottom: '1rem' }}>
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
            <button onClick={() => refetch()}>
              再読み込み
            </button>
          </div>
        ) : isLoading ? (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--color-text-tertiary)',
          }}>
            <p>読み込み中...</p>
          </div>
        ) : projects && projects.length > 0 ? (
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                style={{
                  padding: '1.5rem',
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <h3 style={{ marginBottom: '0.5rem', color: 'var(--color-text)' }}>{project.name}</h3>
                {project.description && (
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                    {project.description}
                  </p>
                )}
              </Link>
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
              {t('home.noProjects')}
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>
              {t('home.createFirstProject')}
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              style={{
                marginTop: '1rem',
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
              ➕ {t('home.createProject')}
            </button>
          </div>
        )}
      </div>

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  )
}
