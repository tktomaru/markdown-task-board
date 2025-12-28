import { useState } from 'react'
import type { Task } from '@/types'
import { statusLabels } from '@/lib/labels'

interface TaskDiffModalProps {
  isOpen: boolean
  onClose: () => void
  currentTasks: Task[]
  projectName: string
}

interface DiffResult {
  added: Task[]
  removed: Task[]
  modified: Task[]
  unchanged: Task[]
}

interface TaskNode {
  task: Task
  children: TaskNode[]
  depth: number
}

export default function TaskDiffModal({
  isOpen,
  onClose,
  currentTasks,
  projectName,
}: TaskDiffModalProps) {
  const [baselineTasks, setBaselineTasks] = useState<Task[]>([])
  const [highlightColor, setHighlightColor] = useState('#0066cc')
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null)
  const [toastMessage, setToastMessage] = useState('')
  const [lineBreak, setLineBreak] = useState<'lf' | 'crlf' | 'br' | 'marker'>('lf')
  const [customMarker, setCustomMarker] = useState('[[MARKMD-BR]]')

  const showToast = (message: string) => {
    setToastMessage(message)
    setTimeout(() => setToastMessage(''), 3000)
  }

  // Build hierarchical structure from flat task list
  const buildTaskTree = (tasks: Task[]): TaskNode[] => {
    const taskMap = new Map<string, TaskNode>()
    const rootNodes: TaskNode[] = []

    // Create nodes for all tasks
    tasks.forEach(task => {
      taskMap.set(task.id, { task, children: [], depth: 0 })
    })

    // Build tree structure
    tasks.forEach(task => {
      const node = taskMap.get(task.id)!
      if (task.parent_id && taskMap.has(task.parent_id)) {
        // This is a child task
        const parentNode = taskMap.get(task.parent_id)!
        node.depth = parentNode.depth + 1
        parentNode.children.push(node)
      } else {
        // This is a root task
        rootNodes.push(node)
      }
    })

    return rootNodes
  }

  // Flatten tree to list with depth information
  const flattenTaskTree = (nodes: TaskNode[]): TaskNode[] => {
    const result: TaskNode[] = []

    const traverse = (node: TaskNode) => {
      result.push(node)
      node.children.forEach(child => traverse(child))
    }

    nodes.forEach(node => traverse(node))
    return result
  }

  const getLineBreakChar = () => {
    switch (lineBreak) {
      case 'lf':
        return '\n'
      case 'crlf':
        return '\r\n'
      case 'br':
        return '<br>'
      case 'marker':
        return customMarker
      default:
        return '\n'
    }
  }

  const copyMarkerToClipboard = () => {
    navigator.clipboard.writeText(customMarker)
    showToast(`📋 "${customMarker}" をコピーしました`)
  }

  if (!isOpen) return null

  const calculateDiff = () => {
    const baselineMap = new Map(baselineTasks.map(t => [t.id, t]))
    const currentMap = new Map(currentTasks.map(t => [t.id, t]))

    const added: Task[] = []
    const removed: Task[] = []
    const modified: Task[] = []
    const unchanged: Task[] = []

    // Check for added and modified tasks
    currentTasks.forEach(task => {
      const baselineTask = baselineMap.get(task.id)
      if (!baselineTask) {
        added.push(task)
      } else if (JSON.stringify(task) !== JSON.stringify(baselineTask)) {
        modified.push(task)
      } else {
        unchanged.push(task)
      }
    })

    // Check for removed tasks
    baselineTasks.forEach(task => {
      if (!currentMap.has(task.id)) {
        removed.push(task)
      }
    })

    setDiffResult({ added, removed, modified, unchanged })
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const tasks = JSON.parse(event.target?.result as string) as Task[]
        setBaselineTasks(tasks)
        showToast(`✅ ${tasks.length}件のタスクを読み込みました`)
      } catch (error) {
        showToast('❌ JSONファイルの読み込みに失敗しました')
      }
    }
    reader.readAsText(file)
  }

  const formatTaskAsHtml = (task: Task, depth: number = 0, color?: string, lineBreakChar?: string, baselineTask?: Task) => {
    const summary = (task.extra_meta as any)?.summary || ''
    const status = statusLabels[task.status] || task.status
    const lb = lineBreakChar || '\n'
    const isMarker = lb === '[[MARKMD-BR]]'

    // Indentation for hierarchy (use full-width spaces)
    const indent = '　'.repeat(depth)

    // Helper to wrap text in color if changed
    const colorize = (text: string, hasChanged: boolean) => {
      return hasChanged && color ? `<span style="color: ${color};">${text}</span>` : text
    }

    // Helper to get diff of text (only changed parts are colored)
    const getTextDiff = (oldText: string, newText: string, highlightColor: string): string => {
      if (!oldText || oldText === newText) return newText

      // Find common prefix
      let prefixLen = 0
      while (prefixLen < oldText.length && prefixLen < newText.length &&
             oldText[prefixLen] === newText[prefixLen]) {
        prefixLen++
      }

      // Find common suffix
      let suffixLen = 0
      while (suffixLen < (oldText.length - prefixLen) &&
             suffixLen < (newText.length - prefixLen) &&
             oldText[oldText.length - 1 - suffixLen] === newText[newText.length - 1 - suffixLen]) {
        suffixLen++
      }

      const prefix = newText.substring(0, prefixLen)
      const changed = newText.substring(prefixLen, newText.length - suffixLen)
      const suffix = newText.substring(newText.length - suffixLen)

      if (!changed) return newText

      return prefix + `<span style="color: ${highlightColor};">${changed}</span>` + suffix
    }

    // Check what changed
    const titleChanged = baselineTask && task.title !== baselineTask.title
    const statusChanged = baselineTask && task.status !== baselineTask.status
    const startDateChanged = baselineTask && task.start_date !== baselineTask.start_date
    const dueDateChanged = baselineTask && task.due_date !== baselineTask.due_date
    const assigneesChanged = baselineTask && JSON.stringify(task.assignees) !== JSON.stringify(baselineTask.assignees)
    const summaryChanged = baselineTask && (task.extra_meta as any)?.summary !== (baselineTask.extra_meta as any)?.summary

    // Format date range
    let dateRange = ''
    if (task.start_date && task.due_date) {
      const startDate = new Date(task.start_date).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/')
      const endDate = new Date(task.due_date).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/')
      const startPart = colorize(startDate, startDateChanged || false)
      const endPart = colorize(endDate, dueDateChanged || false)
      dateRange = ` ${startPart}-${endPart}`
    } else if (task.start_date) {
      const startDate = new Date(task.start_date).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/')
      dateRange = ` ${colorize(startDate, startDateChanged || false)}-`
    } else if (task.due_date) {
      const endDate = new Date(task.due_date).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/')
      dateRange = ` -${colorize(endDate, dueDateChanged || false)}`
    }

    const assignees = task.assignees && task.assignees.length > 0 ? ` 担当: ${colorize(task.assignees.join(', '), assigneesChanged || false)}` : ''

    // Build main line with selective coloring
    const titlePart = colorize(task.title, titleChanged || false)
    const statusPart = colorize(`【${status}】`, statusChanged || false)

    // Format summary with diff highlighting
    let summaryPart = ''
    if (summary) {
      if (summaryChanged && color && baselineTask) {
        const baselineSummary = (baselineTask.extra_meta as any)?.summary || ''
        summaryPart = getTextDiff(baselineSummary, summary, color)
      } else {
        summaryPart = summary
      }
    }

    // For marker mode, use inline text without div tags
    if (isMarker) {
      const mainText = `${indent}・${titlePart} ${statusPart}${dateRange}${assignees}`
      const summaryText = summaryPart ? `${indent}　⇒${summaryPart}` : ''
      return mainText + (summaryText ? lb + summaryText : '')
    }

    // For normal modes, use div tags
    const mainLine = `<div>${indent}・${titlePart} ${statusPart}${dateRange}${assignees}</div>`
    const summaryLine = summaryPart ? `<div>${indent}　⇒${summaryPart}</div>` : ''

    return mainLine + (summaryLine ? lb + summaryLine : '')
  }

  const copyAsHtml = () => {
    if (!diffResult) {
      showToast('⚠️ まず差分を計算してください')
      return
    }

    const lb = getLineBreakChar()
    const isMarker = lb === '[[MARKMD-BR]]'

    // Format header based on mode
    const header = isMarker
      ? `<span style="font-weight: bold;">■${projectName}</span>${lb}`
      : `<div style="font-weight: bold;">■${projectName}</div>${lb}`

    const htmlParts: string[] = []

    // Build hierarchical structure and flatten with depth
    const tree = buildTaskTree(currentTasks)
    const flattenedTasks = flattenTaskTree(tree)

    // Process tasks in hierarchical order
    flattenedTasks.forEach(({ task, depth }) => {
      const isAdded = diffResult.added.some(t => t.id === task.id)
      const isModified = diffResult.modified.some(t => t.id === task.id)

      if (isAdded) {
        // Added task - full highlight
        htmlParts.push(formatTaskAsHtml(task, depth, highlightColor, lb))
      } else if (isModified) {
        // Modified task - highlight only changed fields
        const baselineTask = baselineTasks.find(t => t.id === task.id)
        htmlParts.push(formatTaskAsHtml(task, depth, highlightColor, lb, baselineTask))
      } else {
        // Unchanged task - normal display
        htmlParts.push(formatTaskAsHtml(task, depth, undefined, lb))
      }
    })

    // Add removed tasks at the end with strikethrough
    if (diffResult.removed.length > 0) {
      diffResult.removed.forEach(task => {
        const taskHtml = formatTaskAsHtml(task, 0, '#999', lb)
        const styledHtml = isMarker
          ? `<span style="text-decoration: line-through;">${taskHtml}</span>`
          : taskHtml.replace('<div', '<div style="text-decoration: line-through;"')
        htmlParts.push(styledHtml)
      })
    }

    const htmlContent = header + htmlParts.join(lb)

    // Copy as both HTML and plain text
    const blob = new Blob([htmlContent], { type: 'text/html' })
    const plainText = htmlContent.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')

    const clipboardItem = new ClipboardItem({
      'text/html': blob,
      'text/plain': new Blob([plainText], { type: 'text/plain' }),
    })

    navigator.clipboard.write([clipboardItem]).then(() => {
      showToast('✅ 色付きHTMLとしてコピーしました')
    }).catch(() => {
      // Fallback to plain text
      navigator.clipboard.writeText(plainText)
      showToast('⚠️ プレーンテキストとしてコピーしました')
    })
  }

  const exportCurrentAsJson = () => {
    const json = JSON.stringify(currentTasks, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tasks-${projectName}-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      style={{
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
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--color-bg)',
          borderRadius: '8px',
          padding: '2rem',
          maxWidth: '800px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: '1rem' }}>タスクリスト差分表示</h2>

        {/* Instructions */}
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          backgroundColor: 'var(--color-bg-secondary)',
          borderRadius: '6px',
          fontSize: '0.875rem',
        }}>
          <p style={{ marginBottom: '0.5rem' }}>
            <strong>使い方:</strong>
          </p>
          <ol style={{ marginLeft: '1.5rem', lineHeight: '1.6' }}>
            <li>「現在のタスクをエクスポート」で現在の状態をJSON保存</li>
            <li>後で比較したいタイミングで「基準タスクを選択」から以前保存したJSONを読み込み</li>
            <li>「差分を計算」で変更内容を確認</li>
            <li>「色付きHTMLでコピー」でWordやメールに貼り付け可能</li>
          </ol>
        </div>

        {/* Export current tasks */}
        <div style={{ marginBottom: '1.5rem' }}>
          <button
            onClick={exportCurrentAsJson}
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            📥 現在のタスクをエクスポート (JSON)
          </button>
        </div>

        {/* Upload baseline */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
            基準タスク（比較元）を選択
          </label>
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            style={{
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid var(--color-border)',
              width: '100%',
            }}
          />
          {baselineTasks.length > 0 && (
            <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              ✓ {baselineTasks.length}件のタスクを読み込みました
            </p>
          )}
        </div>

        {/* Color picker */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
            差分の色
          </label>
          <input
            type="color"
            value={highlightColor}
            onChange={(e) => setHighlightColor(e.target.value)}
            style={{
              width: '100px',
              height: '40px',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          />
          <span style={{ marginLeft: '1rem', fontSize: '0.875rem' }}>{highlightColor}</span>
        </div>

        {/* Line break selector */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
            改行コード
          </label>
          <select
            value={lineBreak}
            onChange={(e) => setLineBreak(e.target.value as 'lf' | 'crlf' | 'br' | 'marker')}
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text)',
              fontSize: '0.875rem',
            }}
          >
            <option value="lf">LF (\n) - Excel推奨 / CHAR(10)</option>
            <option value="crlf">CRLF (\r\n) - Windows</option>
            <option value="br">BR (&lt;br&gt;) - HTML</option>
            <option value="marker">カスタムマーカー - 置換用マーカー</option>
          </select>
          <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            {lineBreak === 'lf' && '📊 Excelでセル内改行として認識されます (CHAR(10))'}
            {lineBreak === 'crlf' && '💻 Windowsの標準改行コードです'}
            {lineBreak === 'br' && '🌐 HTMLの改行タグとして挿入されます'}
            {lineBreak === 'marker' && '🔧 後で置換できるマーカー文字列として挿入されます'}
          </p>
        </div>

        {/* Custom marker input - only show when marker mode is selected */}
        {lineBreak === 'marker' && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              カスタムマーカー文字列
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                value={customMarker}
                onChange={(e) => setCustomMarker(e.target.value)}
                placeholder="例: [[MARKMD-BR]]"
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text)',
                  fontSize: '0.875rem',
                  fontFamily: 'monospace',
                }}
              />
              <button
                onClick={copyMarkerToClipboard}
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  whiteSpace: 'nowrap',
                }}
                title="マーカー文字列をコピー"
              >
                📋 コピー
              </button>
            </div>
            <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              💡 コピー後に検索・置換で好きな改行コードに一括変換できます
            </p>
          </div>
        )}

        {/* Calculate diff */}
        <div style={{ marginBottom: '1.5rem' }}>
          <button
            onClick={calculateDiff}
            disabled={baselineTasks.length === 0}
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              cursor: baselineTasks.length === 0 ? 'not-allowed' : 'pointer',
              opacity: baselineTasks.length === 0 ? 0.5 : 1,
              fontSize: '0.875rem',
              fontWeight: '600',
            }}
          >
            🔍 差分を計算
          </button>
        </div>

        {/* Diff results */}
        {diffResult && (
          <>
            <div style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              backgroundColor: 'var(--color-bg-secondary)',
              borderRadius: '6px',
            }}>
              <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>差分結果</h3>
              <div style={{ fontSize: '0.875rem', lineHeight: '1.8' }}>
                <div style={{ color: highlightColor }}>
                  ✚ 追加: {diffResult.added.length}件
                </div>
                <div style={{ color: highlightColor }}>
                  ✎ 変更: {diffResult.modified.length}件
                </div>
                <div style={{ color: '#999' }}>
                  ✖ 削除: {diffResult.removed.length}件
                </div>
                <div>
                  ― 変更なし: {diffResult.unchanged.length}件
                </div>
              </div>
            </div>

            {/* HTML Preview */}
            <div style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              backgroundColor: 'var(--color-bg-secondary)',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
            }}>
              <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                👁️ プレビュー
                <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--color-text-secondary)' }}>
                  （コピー後の表示イメージ）
                </span>
              </h3>
              <div style={{
                maxHeight: '400px',
                overflowY: 'auto',
                padding: '1rem',
                backgroundColor: 'white',
                borderRadius: '4px',
                fontSize: '0.875rem',
                lineHeight: '1.6',
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>■{projectName}</div>

                {(() => {
                  const tree = buildTaskTree(currentTasks)
                  const flattenedTasks = flattenTaskTree(tree)

                  return flattenedTasks.map(({ task, depth }, idx) => {
                    const isAdded = diffResult.added.some(t => t.id === task.id)
                    const isModified = diffResult.modified.some(t => t.id === task.id)

                    if (isAdded) {
                      // Added task - full highlight
                      return (
                        <div key={`task-${idx}`} dangerouslySetInnerHTML={{ __html: formatTaskAsHtml(task, depth, highlightColor, '\n') }} />
                      )
                    } else if (isModified) {
                      // Modified task - highlight only changed fields
                      const baselineTask = baselineTasks.find(t => t.id === task.id)
                      return (
                        <div key={`task-${idx}`} dangerouslySetInnerHTML={{ __html: formatTaskAsHtml(task, depth, highlightColor, '\n', baselineTask) }} />
                      )
                    } else {
                      // Unchanged task - normal display
                      return (
                        <div key={`task-${idx}`} dangerouslySetInnerHTML={{ __html: formatTaskAsHtml(task, depth, undefined, '\n') }} />
                      )
                    }
                  })
                })()}

                {diffResult.removed.length > 0 && diffResult.removed.map((task, idx) => (
                  <div key={`removed-${idx}`} style={{ textDecoration: 'line-through' }} dangerouslySetInnerHTML={{ __html: formatTaskAsHtml(task, 0, '#999', '\n') }} />
                ))}
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={copyAsHtml}
            disabled={!diffResult}
            style={{
              flex: 1,
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: '600',
              borderRadius: '6px',
              border: 'none',
              cursor: !diffResult ? 'not-allowed' : 'pointer',
              opacity: !diffResult ? 0.6 : 1,
            }}
          >
            📋 色付きHTMLでコピー
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              color: 'var(--color-text)',
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: '600',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              cursor: 'pointer',
            }}
          >
            閉じる
          </button>
        </div>

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
              zIndex: 2000,
              animation: 'slideInUp 0.3s ease-out',
            }}
          >
            {toastMessage}
          </div>
        )}
      </div>
    </div>
  )
}
