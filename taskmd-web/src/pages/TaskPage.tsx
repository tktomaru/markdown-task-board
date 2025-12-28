import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTask, updateTask } from '@/lib/api'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import EditTaskModal from '@/components/EditTaskModal'
import AssigneeEditor from '@/components/AssigneeEditor'
import TaskPackModal from '@/components/TaskPackModal'
import { useTaskPack } from '@/hooks/useTaskPack'

export default function TaskPage() {
  const { projectId, taskId } = useParams<{ projectId: string; taskId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [summary, setSummary] = useState('')

  const {
    toastMessage: packToastMessage,
    isTemplateModalOpen,
    openTemplateModal,
    generateWithTemplate,
    closeTemplateModal,
    isGenerating,
  } = useTaskPack()

  const { data: task, isLoading, error } = useQuery({
    queryKey: ['task', projectId, taskId],
    queryFn: () => getTask(projectId!, taskId!),
    enabled: !!projectId && !!taskId,
  })

  // Update local summary state when task is loaded
  useEffect(() => {
    if (task) {
      setSummary((task.extra_meta as any)?.summary || '')
    }
  }, [task])

  const updateTaskMutation = useMutation({
    mutationFn: (data: any) => updateTask(projectId!, taskId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', projectId, taskId] })
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
    },
    onError: (err: Error) => {
      console.error('Failed to update task:', err)
      alert('タスクの更新に失敗しました: ' + err.message)
    },
  })

  const updateYamlField = (markdown: string, field: string, value: string): string => {
    // Extract YAML frontmatter
    const yamlMatch = markdown.match(/([\s\S]*?```yaml\n)([\s\S]*?)(\n```[\s\S]*)/)
    if (!yamlMatch) {
      console.error('YAML frontmatter not found')
      return markdown
    }

    const [, before, yamlContent, after] = yamlMatch

    // Update the field value
    const fieldRegex = new RegExp(`(${field}:\\s*)\\S+`, 'm')
    const updatedYaml = yamlContent.replace(fieldRegex, `$1${value}`)

    return before + updatedYaml + after
  }

  const handleStatusChange = (newStatus: string) => {
    if (!task) return
    const updatedMarkdown = updateYamlField(task.markdown_body, 'status', newStatus)
    updateTaskMutation.mutate({ markdown_body: updatedMarkdown })
  }

  const handlePriorityChange = (newPriority: string) => {
    if (!task) return
    const updatedMarkdown = updateYamlField(task.markdown_body, 'priority', newPriority)
    updateTaskMutation.mutate({ markdown_body: updatedMarkdown })
  }

  const handleDateChange = (field: string, value: string) => {
    if (!task) return

    const yamlMatch = task.markdown_body.match(/([\s\S]*?```yaml\n)([\s\S]*?)(\n```[\s\S]*)/)
    if (!yamlMatch) return

    const [, before, yamlContent, after] = yamlMatch
    let updatedYaml = yamlContent

    // start_date and due_date are regular YAML fields
    if (field === 'start_date' || field === 'due_date') {
      const fieldRegex = new RegExp(`(${field}:\\s*)\\S*`, 'm')
      if (yamlContent.match(fieldRegex)) {
        // Update existing field
        updatedYaml = yamlContent.replace(fieldRegex, `$1${value}`)
      } else {
        // Add new field
        updatedYaml = yamlContent + `\n${field}: ${value}`
      }
    } else {
      // actual_start_date and actual_end_date go in extra_meta
      const extraMetaMatch = yamlContent.match(/extra_meta:\s*\{[^}]*\}/)

      if (extraMetaMatch) {
        // Update existing extra_meta
        const currentExtraMeta = extraMetaMatch[0]
        const extraMetaObj = currentExtraMeta.match(/\{([^}]*)\}/)?.[1] || ''

        // Parse existing fields
        const fields: { [key: string]: string } = {}
        extraMetaObj.split(',').forEach(pair => {
          const [k, v] = pair.split(':').map(s => s.trim())
          if (k && v) fields[k.replace(/"/g, '')] = v.replace(/"/g, '')
        })

        // Update field
        fields[field] = value

        // Rebuild extra_meta
        const newExtraMeta = `extra_meta: {${Object.entries(fields).map(([k, v]) => `"${k}": "${v}"`).join(', ')}}`
        updatedYaml = yamlContent.replace(/extra_meta:\s*\{[^}]*\}/, newExtraMeta)
      } else {
        // Add extra_meta
        updatedYaml = yamlContent + `\nextra_meta: {"${field}": "${value}"}`
      }
    }

    const updatedMarkdown = before + updatedYaml + after
    updateTaskMutation.mutate({ markdown_body: updatedMarkdown })
  }

  const handleAssigneesChange = (newAssignees: string[]) => {
    if (!task) return

    const yamlMatch = task.markdown_body.match(/([\s\S]*?```yaml\n)([\s\S]*?)(\n```[\s\S]*)/)
    if (!yamlMatch) return

    const [, before, yamlContent, after] = yamlMatch

    // Update assignees array
    const assigneesStr = `[${newAssignees.map(a => `"${a}"`).join(', ')}]`
    const updatedYaml = yamlContent.replace(/assignees:\s*\[[^\]]*\]/, `assignees: ${assigneesStr}`)

    const updatedMarkdown = before + updatedYaml + after
    updateTaskMutation.mutate({ markdown_body: updatedMarkdown })
  }

  const handleSummaryBlur = () => {
    if (!task) return

    // Only update if summary has changed
    const currentSummary = (task.extra_meta as any)?.summary || ''
    if (summary === currentSummary) return

    handleDateChange('summary', summary)
  }

  const handleCopyMarkdown = async () => {
    if (!task) return

    try {
      await navigator.clipboard.writeText(task.markdown_body)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Convert {{collapse}} syntax to HTML details/summary tags
  const processCollapseBlocks = (markdown: string): string => {
    // Pattern: {{collapse(optional title)\ncontent\n}}
    const collapsePattern = /\{\{collapse(\([^)]+\))?\n([\s\S]*?)\n\}\}/g

    return markdown.replace(collapsePattern, (_match, titleGroup, content) => {
      const title = titleGroup ? titleGroup.slice(1, -1) : '詳細を表示'
      return `<details>\n<summary>${title}</summary>\n\n${content}\n\n</details>`
    })
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
          タスクの読み込みに失敗しました
        </p>
      </div>
    )
  }

  if (!task) {
    return null
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
            <label style={{ color: 'var(--color-text-tertiary)', marginRight: '0.5rem' }}>
              ステータス:
            </label>
            <select
              value={task.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={updateTaskMutation.isPending}
              style={{
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text)',
                fontWeight: '500',
                cursor: updateTaskMutation.isPending ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
              }}
            >
              <option value="open">未着手</option>
              <option value="in_progress">進行中</option>
              <option value="review">レビュー待ち</option>
              <option value="blocked">ブロック中</option>
              <option value="done">完了</option>
              <option value="archived">アーカイブ</option>
            </select>
          </div>
          <div>
            <label style={{ color: 'var(--color-text-tertiary)', marginRight: '0.5rem' }}>
              優先度:
            </label>
            <select
              value={task.priority}
              onChange={(e) => handlePriorityChange(e.target.value)}
              disabled={updateTaskMutation.isPending}
              style={{
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                border: '1px solid var(--color-border)',
                backgroundColor: priorityColors[task.priority] || '#757575',
                color: 'white',
                fontWeight: '500',
                cursor: updateTaskMutation.isPending ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
              }}
            >
              <option value="P0" style={{ backgroundColor: priorityColors.P0 }}>P0 - 緊急</option>
              <option value="P1" style={{ backgroundColor: priorityColors.P1 }}>P1 - 今すぐ重要</option>
              <option value="P2" style={{ backgroundColor: priorityColors.P2 }}>P2 - 計画内重要</option>
              <option value="P3" style={{ backgroundColor: priorityColors.P3 }}>P3 - 余裕があれば</option>
              <option value="P4" style={{ backgroundColor: priorityColors.P4 }}>P4 - いつか</option>
            </select>
          </div>
        </div>

        {/* Dates */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginTop: '1rem',
          fontSize: '0.875rem',
        }}>
          <div>
            <label style={{ display: 'block', color: 'var(--color-text-tertiary)', marginBottom: '0.25rem' }}>
              予定開始日:
            </label>
            <input
              type="date"
              value={task.start_date ? new Date(task.start_date).toISOString().split('T')[0] : ''}
              onChange={(e) => handleDateChange('start_date', e.target.value)}
              disabled={updateTaskMutation.isPending}
              style={{
                width: '100%',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text)',
                fontSize: '0.875rem',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', color: 'var(--color-text-tertiary)', marginBottom: '0.25rem' }}>
              予定終了日:
            </label>
            <input
              type="date"
              value={task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : ''}
              onChange={(e) => handleDateChange('due_date', e.target.value)}
              disabled={updateTaskMutation.isPending}
              style={{
                width: '100%',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text)',
                fontSize: '0.875rem',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', color: 'var(--color-text-tertiary)', marginBottom: '0.25rem' }}>
              実績開始日:
            </label>
            <input
              type="date"
              value={(task.extra_meta as any)?.actual_start_date || ''}
              onChange={(e) => handleDateChange('actual_start_date', e.target.value)}
              disabled={updateTaskMutation.isPending}
              style={{
                width: '100%',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text)',
                fontSize: '0.875rem',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', color: 'var(--color-text-tertiary)', marginBottom: '0.25rem' }}>
              実績終了日:
            </label>
            <input
              type="date"
              value={(task.extra_meta as any)?.actual_end_date || ''}
              onChange={(e) => handleDateChange('actual_end_date', e.target.value)}
              disabled={updateTaskMutation.isPending}
              style={{
                width: '100%',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text)',
                fontSize: '0.875rem',
              }}
            />
          </div>
        </div>

        {/* Assignees Editor */}
        <div style={{ marginTop: '1rem' }}>
          <label style={{ display: 'block', color: 'var(--color-text-tertiary)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
            担当者:
          </label>
          <AssigneeEditor
            assignees={task.assignees || []}
            onChange={handleAssigneesChange}
            disabled={updateTaskMutation.isPending}
          />
        </div>

        {/* Summary Field */}
        <div style={{ marginTop: '1rem' }}>
          <label style={{ display: 'block', color: 'var(--color-text-tertiary)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
            概要（一言要約）:
          </label>
          <input
            type="text"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            onBlur={handleSummaryBlur}
            disabled={updateTaskMutation.isPending}
            placeholder="タスクの概要を一言で記入してください"
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text)',
              fontSize: '0.875rem',
            }}
          />
        </div>
      </div>

      {/* Markdown Body */}
      <div style={{
        backgroundColor: 'var(--color-bg-secondary)',
        borderRadius: '8px',
        padding: '2rem',
        border: '1px solid var(--color-border)',
        marginBottom: '2rem',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}>
          <h2>詳細</h2>
          <button
            onClick={handleCopyMarkdown}
            style={{
              backgroundColor: copySuccess ? 'var(--color-success)' : 'var(--color-primary)',
              color: 'white',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
          >
            {copySuccess ? '✓ コピーしました' : '📋 Markdownをコピー'}
          </button>
        </div>
        <div
          className="markdown-body"
          style={{
            lineHeight: '1.6',
            color: 'var(--color-text)',
          }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              details: ({ children }) => (
                <details style={{
                  marginBottom: '1rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  padding: '0.5rem',
                }}>
                  {children}
                </details>
              ),
              summary: ({ children }) => (
                <summary style={{
                  cursor: 'pointer',
                  fontWeight: '600',
                  padding: '0.5rem',
                  userSelect: 'none',
                  listStyle: 'none',
                  outline: 'none',
                }}>
                  {children}
                </summary>
              ),
              code({ className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '')
                const isInline = !match
                return !isInline && match ? (
                  <SyntaxHighlighter
                    style={vscDarkPlus as any}
                    language={match[1]}
                    PreTag="div"
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props} style={{
                    backgroundColor: 'rgba(175, 184, 193, 0.2)',
                    padding: '0.2em 0.4em',
                    borderRadius: '3px',
                    fontSize: '85%',
                  }}>
                    {children}
                  </code>
                )
              },
              h1: ({ children }) => <h1 style={{ marginTop: '1.5rem', marginBottom: '0.75rem' }}>{children}</h1>,
              h2: ({ children }) => <h2 style={{ marginTop: '1.5rem', marginBottom: '0.75rem' }}>{children}</h2>,
              h3: ({ children }) => <h3 style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>{children}</h3>,
              p: ({ children }) => <p style={{ marginBottom: '1rem' }}>{children}</p>,
              ul: ({ children }) => <ul style={{ marginBottom: '1rem', paddingLeft: '2rem' }}>{children}</ul>,
              ol: ({ children }) => <ol style={{ marginBottom: '1rem', paddingLeft: '2rem' }}>{children}</ol>,
              li: ({ children }) => <li style={{ marginBottom: '0.25rem' }}>{children}</li>,
              blockquote: ({ children }) => (
                <blockquote style={{
                  borderLeft: '4px solid var(--color-primary)',
                  paddingLeft: '1rem',
                  marginLeft: 0,
                  marginBottom: '1rem',
                  color: 'var(--color-text-secondary)',
                }}>
                  {children}
                </blockquote>
              ),
              table: ({ children }) => (
                <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
                  <table style={{
                    borderCollapse: 'collapse',
                    width: '100%',
                  }}>
                    {children}
                  </table>
                </div>
              ),
              th: ({ children }) => (
                <th style={{
                  border: '1px solid var(--color-border)',
                  padding: '0.5rem',
                  backgroundColor: 'var(--color-bg-tertiary)',
                }}>
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td style={{
                  border: '1px solid var(--color-border)',
                  padding: '0.5rem',
                }}>
                  {children}
                </td>
              ),
            }}
          >
            {processCollapseBlocks(task.markdown_body)}
          </ReactMarkdown>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          onClick={() => setIsEditModalOpen(true)}
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
          onClick={() => task && openTemplateModal([task], projectId!)}
          disabled={!task}
          style={{
            backgroundColor: 'transparent',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            fontWeight: '600',
            borderRadius: '6px',
            cursor: task ? 'pointer' : 'not-allowed',
            opacity: task ? 1 : 0.5,
          }}
        >
          📦 タスクパックを生成
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

      {/* Edit Modal */}
      {task && (
        <EditTaskModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          projectId={projectId!}
          task={task}
        />
      )}

      {/* Task Pack Modal */}
      <TaskPackModal
        isOpen={isTemplateModalOpen}
        onClose={closeTemplateModal}
        onGenerate={generateWithTemplate}
        isGenerating={isGenerating}
      />

      {/* Toast Notification */}
      {packToastMessage && (
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
          {packToastMessage}
        </div>
      )}
    </div>
  )
}
