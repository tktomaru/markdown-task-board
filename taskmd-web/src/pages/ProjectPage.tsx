import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getProject, getTasks } from '@/lib/api'
import CreateTaskModal from '@/components/CreateTaskModal'

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false)

  const { data: project, isLoading: projectLoading, error: projectError } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId!),
    enabled: !!projectId,
  })

  const { data: tasks, isLoading: tasksLoading, error: tasksError } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => getTasks(projectId!),
    enabled: !!projectId,
  })

  if (projectLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>{t('project.loading')}</p>
      </div>
    )
  }

  if (projectError) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-error)' }}>
          プロジェクトの読み込みに失敗しました
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Project Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1>{project?.name || projectId}</h1>
          <button
            onClick={() => navigate(`/projects/${projectId}/views`)}
            style={{
              backgroundColor: 'transparent',
              color: 'var(--color-primary)',
              border: '2px solid var(--color-primary)',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary)'
              e.currentTarget.style.color = 'white'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = 'var(--color-primary)'
            }}
          >
            📊 Saved Views
          </button>
        </div>
        {project?.description && (
          <p style={{ marginTop: '0.5rem', color: 'var(--color-text-secondary)' }}>
            {project.description}
          </p>
        )}
      </div>

      {/* Tasks Section */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
        }}>
          <h2>{t('project.tasksTitle')}</h2>
          <button
            onClick={() => setIsCreateTaskModalOpen(true)}
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
            ➕ {t('project.newTask')}
          </button>
        </div>

        {tasksError ? (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            backgroundColor: 'var(--color-bg-secondary)',
            borderRadius: '8px',
            border: '2px solid var(--color-error)',
          }}>
            <p style={{ color: 'var(--color-error)' }}>
              タスクの読み込みに失敗しました
            </p>
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
            <p style={{ marginBottom: '0.5rem', color: 'var(--color-text-secondary)' }}>
              {t('project.noTasks')}
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>
              {t('project.createFirstTask')}
            </p>
            <button
              onClick={() => setIsCreateTaskModalOpen(true)}
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
              ➕ {t('project.newTask')}
            </button>
          </div>
        )}
      </div>

      <CreateTaskModal
        isOpen={isCreateTaskModalOpen}
        onClose={() => setIsCreateTaskModalOpen(false)}
        projectId={projectId!}
      />
    </div>
  )
}
