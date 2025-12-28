import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProject, getTasks, tasksApi } from '@/lib/api'
import CreateTaskModal from '@/components/CreateTaskModal'
import TaskPackModal from '@/components/TaskPackModal'
import BulkEditModal, { type BulkUpdateData } from '@/components/BulkEditModal'
import DueDateBadge from '@/components/DueDateBadge'
import { useCopyTasks } from '@/hooks/useCopyTasks'
import { useTaskPack } from '@/hooks/useTaskPack'
import { priorityLabels, statusLabels } from '@/lib/labels'

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false)
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false)

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

  const { toastMessage: copyToastMessage, copyTasksAsMarkdown, copyTasksAsText } = useCopyTasks()
  const {
    toastMessage: packToastMessage,
    isTemplateModalOpen,
    openTemplateModal,
    generateWithTemplate,
    closeTemplateModal,
    isGenerating,
  } = useTaskPack()

  const bulkUpdateMutation = useMutation<
    { updated_count: number },
    Error,
    { taskIds: string[]; updates: BulkUpdateData }
  >({
    mutationFn: (data) =>
      tasksApi.bulkUpdate(projectId!, data.taskIds, data.updates),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
      setSelectedTaskIds(new Set())
      setIsBulkEditModalOpen(false)
      alert(`${result.updated_count}件のタスクを更新しました`)
    },
    onError: (error) => {
      alert(`更新に失敗しました: ${error.message}`)
    },
  })

  const handleBulkUpdate = (updates: BulkUpdateData) => {
    bulkUpdateMutation.mutate({
      taskIds: Array.from(selectedTaskIds),
      updates,
    })
  }

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(taskId)) {
        newSet.delete(taskId)
      } else {
        newSet.add(taskId)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedTaskIds.size === tasks?.length) {
      setSelectedTaskIds(new Set())
    } else if (tasks) {
      setSelectedTaskIds(new Set(tasks.map(t => t.id)))
    }
  }

  const selectedTasks = tasks?.filter(t => selectedTaskIds.has(t.id)) || []

  const toastMessage = copyToastMessage || packToastMessage

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
              onClick={() => copyTasksAsText(tasks || [], project?.name || projectId || 'プロジェクト')}
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
          <>
            {/* Bulk Edit Toolbar */}
            {selectedTaskIds.size > 0 && (
              <div style={{
                marginBottom: '1rem',
                padding: '1rem',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontWeight: '600' }}>
                    {selectedTaskIds.size}件のタスクを選択中
                  </span>
                  <button
                    onClick={() => setSelectedTaskIds(new Set())}
                    style={{
                      backgroundColor: 'transparent',
                      color: 'white',
                      border: '1px solid white',
                      padding: '0.25rem 0.75rem',
                      fontSize: '0.875rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    選択解除
                  </button>
                </div>
                <button
                  onClick={() => setIsBulkEditModalOpen(true)}
                  style={{
                    backgroundColor: 'white',
                    color: 'var(--color-primary)',
                    border: 'none',
                    padding: '0.5rem 1.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  一括編集
                </button>
              </div>
            )}

            <div style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              overflow: 'hidden',
            }}>
              {/* Select All Header */}
              <div style={{
                padding: '0.75rem 1.5rem',
                borderBottom: '2px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-tertiary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}>
                <input
                  type="checkbox"
                  checked={tasks.length > 0 && selectedTaskIds.size === tasks.length}
                  onChange={toggleSelectAll}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer',
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                  すべて選択
                </span>
              </div>

              {tasks.map((task) => (
                <div
                  key={task.id}
                  style={{
                    padding: '1rem 1.5rem',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    backgroundColor: selectedTaskIds.has(task.id) ? 'var(--color-bg-tertiary)' : 'transparent',
                    transition: 'background-color 0.2s ease',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedTaskIds.has(task.id)}
                    onChange={() => toggleTaskSelection(task.id)}
                    style={{
                      width: '18px',
                      height: '18px',
                      marginTop: '0.25rem',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div
                    onClick={() => navigate(`/projects/${projectId}/tasks/${task.id}`)}
                    style={{
                      flex: 1,
                      cursor: 'pointer',
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
                      alignItems: 'center',
                    }}>
                      <span>ステータス: {statusLabels[task.status] || task.status}</span>
                      <span>優先度: {priorityLabels[task.priority] || task.priority}</span>
                      {task.start_date && (
                        <span>開始: {new Date(task.start_date).toLocaleDateString('ja-JP')}</span>
                      )}
                      <DueDateBadge dueDate={task.due_date} showDate={true} />
                      {task.assignees && task.assignees.length > 0 && (
                        <span>担当: {task.assignees.join(', ')}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
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

      <TaskPackModal
        isOpen={isTemplateModalOpen}
        onClose={closeTemplateModal}
        onGenerate={generateWithTemplate}
        isGenerating={isGenerating}
      />

      <BulkEditModal
        isOpen={isBulkEditModalOpen}
        onClose={() => setIsBulkEditModalOpen(false)}
        selectedTasks={selectedTasks}
        onUpdate={handleBulkUpdate}
        isUpdating={bulkUpdateMutation.isPending}
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
