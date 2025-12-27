import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createProject } from '@/lib/api'

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function CreateProjectModal({ isOpen, onClose }: CreateProjectModalProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: (data) => {
      console.log('Project created successfully:', data)
      setSuccess(true)
      setError(null)

      // Wait a bit to show success message before closing
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['projects'] })
        setName('')
        setDescription('')
        setSuccess(false)
        onClose()
      }, 1000)
    },
    onError: (err: Error) => {
      console.error('Failed to create project:', err)
      setError(err.message || 'Failed to create project')
      setSuccess(false)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setError(null)

    const projectData = {
      name,
      description,
    }

    console.log('Creating project:', projectData)
    createMutation.mutate(projectData)
  }

  const handleClose = () => {
    setName('')
    setDescription('')
    setError(null)
    setSuccess(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div style={{
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
    }}>
      <div style={{
        backgroundColor: 'var(--color-bg)',
        padding: '2rem',
        borderRadius: '8px',
        width: '90%',
        maxWidth: '500px',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <h2 style={{ marginBottom: '1.5rem' }}>{t('project.create')}</h2>

        {error && (
          <div style={{
            padding: '0.75rem',
            marginBottom: '1rem',
            backgroundColor: 'var(--color-error)',
            color: 'white',
            borderRadius: '4px',
            fontSize: '0.875rem',
          }}>
            ❌ {error}
          </div>
        )}

        {success && (
          <div style={{
            padding: '0.75rem',
            marginBottom: '1rem',
            backgroundColor: 'var(--color-success)',
            color: 'white',
            borderRadius: '4px',
            fontSize: '0.875rem',
          }}>
            ✅ プロジェクトを作成しました！
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}>
              {t('project.name')} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}>
              {t('project.description')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={createMutation.isPending}
              style={{
                backgroundColor: 'transparent',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: createMutation.isPending ? 'not-allowed' : 'pointer',
                opacity: createMutation.isPending ? 0.5 : 1,
              }}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || success}
              style={{
                backgroundColor: success ? 'var(--color-success)' : 'var(--color-primary)',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1.5rem',
                borderRadius: '4px',
                cursor: (createMutation.isPending || success) ? 'not-allowed' : 'pointer',
                opacity: (createMutation.isPending || success) ? 0.8 : 1,
                fontWeight: '500',
              }}
            >
              {createMutation.isPending ? '⏳ 作成中...' : success ? '✅ 作成完了' : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
