import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { taskPackApi } from '@/lib/api'
import type { Task, TaskPackRequest } from '@/types'

type TemplateType = 'IMPLEMENT' | 'BUGFIX' | 'RESEARCH' | 'REVIEW'

export function useTaskPack() {
  const [toastMessage, setToastMessage] = useState('')
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [pendingTasks, setPendingTasks] = useState<Task[]>([])
  const [projectId, setProjectId] = useState<string>('')

  const showToast = (message: string) => {
    setToastMessage(message)
    setTimeout(() => setToastMessage(''), 3000)
  }

  const generateTaskPackMutation = useMutation({
    mutationFn: (request: TaskPackRequest) => taskPackApi.generate(request),
    onSuccess: (response) => {
      console.log('Task Pack response:', response)
      if (!response || !response.markdown) {
        console.error('Invalid response structure:', response)
        showToast('❌ Task Pack生成に失敗しました（無効なレスポンス）')
        return
      }
      navigator.clipboard.writeText(response.markdown)
      showToast(`📦 Task Pack生成完了 (${response.task_count}タスク)`)
      setIsTemplateModalOpen(false)
    },
    onError: (error) => {
      console.error('Task Pack generation failed:', error)
      showToast('❌ Task Pack生成に失敗しました')
    },
  })

  const openTemplateModal = (tasks: Task[], projectIdParam: string) => {
    if (!tasks || tasks.length === 0) {
      showToast('⚠️ タスクが選択されていません')
      return
    }
    setPendingTasks(tasks)
    setProjectId(projectIdParam)
    setIsTemplateModalOpen(true)
  }

  const generateWithTemplate = (template: TemplateType, includeRelated: boolean = false) => {
    const taskIds = pendingTasks.map(task => task.id)
    generateTaskPackMutation.mutate({
      project_id: projectId,
      task_ids: taskIds,
      template,
      include_related: includeRelated,
    })
  }

  const closeTemplateModal = () => {
    setIsTemplateModalOpen(false)
    setPendingTasks([])
  }

  return {
    toastMessage,
    isTemplateModalOpen,
    openTemplateModal,
    generateWithTemplate,
    closeTemplateModal,
    isGenerating: generateTaskPackMutation.isPending,
  }
}
