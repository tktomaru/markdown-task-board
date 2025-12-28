import { useState } from 'react'

interface AssigneeEditorProps {
  assignees: string[]
  onChange: (assignees: string[]) => void
  disabled?: boolean
}

export default function AssigneeEditor({ assignees, onChange, disabled = false }: AssigneeEditorProps) {
  const [newAssignee, setNewAssignee] = useState('')

  const handleAdd = () => {
    if (!newAssignee.trim()) return
    if (assignees.includes(newAssignee.trim())) {
      alert('この担当者は既に追加されています')
      return
    }
    onChange([...assignees, newAssignee.trim()])
    setNewAssignee('')
  }

  const handleRemove = (assignee: string) => {
    onChange(assignees.filter(a => a !== assignee))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div>
      {/* Existing assignees */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        marginBottom: '0.75rem',
      }}>
        {assignees.length > 0 ? (
          assignees.map((assignee, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.25rem 0.75rem',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                borderRadius: '16px',
                fontSize: '0.875rem',
              }}
            >
              <span>{assignee}</span>
              <button
                type="button"
                onClick={() => handleRemove(assignee)}
                disabled={disabled}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'white',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  padding: 0,
                  fontSize: '1rem',
                  lineHeight: 1,
                  opacity: disabled ? 0.5 : 1,
                }}
              >
                ×
              </button>
            </div>
          ))
        ) : (
          <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.875rem' }}>
            担当者なし
          </span>
        )}
      </div>

      {/* Add new assignee */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          value={newAssignee}
          onChange={(e) => setNewAssignee(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="担当者名を入力"
          disabled={disabled}
          style={{
            flex: 1,
            padding: '0.5rem',
            borderRadius: '4px',
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-secondary)',
            color: 'var(--color-text)',
            fontSize: '0.875rem',
          }}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={disabled || !newAssignee.trim()}
          style={{
            backgroundColor: 'var(--color-primary)',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            border: 'none',
            cursor: (disabled || !newAssignee.trim()) ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
            opacity: (disabled || !newAssignee.trim()) ? 0.5 : 1,
          }}
        >
          追加
        </button>
      </div>
    </div>
  )
}
