import { useState } from 'react'
import type { Task } from '@/types'
import { priorityLabels, statusLabels } from '@/lib/labels'

export function useCopyTasks() {
  const [toastMessage, setToastMessage] = useState('')

  const showToast = (message: string) => {
    setToastMessage(message)
    setTimeout(() => setToastMessage(''), 3000)
  }

  const copyTasksAsMarkdown = (tasks: Task[]) => {
    if (!tasks || tasks.length === 0) return

    const markdown = tasks.map(task => {
      const summary = (task.extra_meta as any)?.summary || ''
      const lines = [
        `## ${task.id}: ${task.title}`,
        summary ? `> ${summary}` : '',
        '',
        `- **ステータス**: ${statusLabels[task.status] || task.status}`,
        `- **優先度**: ${priorityLabels[task.priority] || task.priority}`,
        task.start_date ? `- **開始日**: ${new Date(task.start_date).toLocaleDateString('ja-JP')}` : '',
        task.due_date ? `- **期限**: ${new Date(task.due_date).toLocaleDateString('ja-JP')}` : '',
        task.assignees && task.assignees.length > 0 ? `- **担当者**: ${task.assignees.join(', ')}` : '',
        '',
      ].filter(line => line !== '')
      return lines.join('\n')
    }).join('\n---\n\n')

    navigator.clipboard.writeText(markdown)
    showToast('📋 Markdown形式でコピーしました')
  }

  const copyTasksAsText = (tasks: Task[], headerName: string) => {
    if (!tasks || tasks.length === 0) return

    const header = `■${headerName}\n`

    const taskLines = tasks.map(task => {
      const summary = (task.extra_meta as any)?.summary || ''
      const status = statusLabels[task.status] || task.status

      // Date range
      let dateRange = ''
      if (task.start_date && task.due_date) {
        const startDate = new Date(task.start_date).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/')
        const endDate = new Date(task.due_date).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/')
        dateRange = ` ${startDate}-${endDate}`
      } else if (task.start_date) {
        dateRange = ` ${new Date(task.start_date).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/')}-`
      } else if (task.due_date) {
        dateRange = ` -${new Date(task.due_date).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/')}`
      }

      // Assignees
      const assignees = task.assignees && task.assignees.length > 0 ? ` 担当: ${task.assignees.join(', ')}` : ''

      const mainLine = `・${task.title} 【${status}】${dateRange}${assignees}`
      const summaryLine = summary ? `　⇒${summary}` : ''

      return summaryLine ? `${mainLine}\n${summaryLine}` : mainLine
    }).join('\n')

    const text = header + taskLines

    navigator.clipboard.writeText(text)
    showToast('📄 テキスト形式でコピーしました')
  }

  return {
    toastMessage,
    copyTasksAsMarkdown,
    copyTasksAsText,
  }
}
