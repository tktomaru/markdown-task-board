import { useState } from 'react'
import type { Task } from '@/types'
import { priorityLabels, statusLabels } from '@/lib/labels'

interface TaskNode {
  task: Task
  children: TaskNode[]
  depth: number
}

export function useCopyTasks() {
  const [toastMessage, setToastMessage] = useState('')

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

  const copyTasksAsMarkdown = (tasks: Task[]) => {
    if (!tasks || tasks.length === 0) return

    const tree = buildTaskTree(tasks)
    const flattenedTasks = flattenTaskTree(tree)

    const markdown = flattenedTasks.map(({ task, depth }) => {
      const summary = (task.extra_meta as any)?.summary || ''
      const indent = '  '.repeat(depth)
      const headingLevel = depth === 0 ? '##' : '###'

      const lines = [
        `${indent}${headingLevel} ${task.id}: ${task.title}`,
        summary ? `${indent}> ${summary}` : '',
        '',
        `${indent}- **ステータス**: ${statusLabels[task.status] || task.status}`,
        `${indent}- **優先度**: ${priorityLabels[task.priority] || task.priority}`,
        task.start_date ? `${indent}- **開始日**: ${new Date(task.start_date).toLocaleDateString('ja-JP')}` : '',
        task.due_date ? `${indent}- **期限**: ${new Date(task.due_date).toLocaleDateString('ja-JP')}` : '',
        task.assignees && task.assignees.length > 0 ? `${indent}- **担当者**: ${task.assignees.join(', ')}` : '',
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

    const tree = buildTaskTree(tasks)
    const flattenedTasks = flattenTaskTree(tree)

    const taskLines = flattenedTasks.map(({ task, depth }) => {
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

      // Indentation for hierarchy (use full-width spaces for child tasks)
      const indent = '　'.repeat(depth)

      const mainLine = `${indent}・${task.title} 【${status}】${dateRange}${assignees}`
      const summaryLine = summary ? `${indent}　⇒${summary}` : ''

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
