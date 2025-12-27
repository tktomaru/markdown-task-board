import { useParams } from 'react-router-dom'

export default function TaskPage() {
  const { projectId, taskId } = useParams()

  return (
    <div>
      <h1>Task: {taskId}</h1>
      <p style={{ marginTop: '0.5rem', color: '#888' }}>
        Project: {projectId}
      </p>

      <div style={{ marginTop: '2rem' }}>
        <h2>Task Details</h2>
        <p style={{ marginTop: '1rem', color: '#888' }}>
          Task details and Markdown body will be displayed here.
        </p>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <button>Edit Task</button>
        <button style={{ marginLeft: '0.5rem' }}>Generate Task Pack</button>
      </div>
    </div>
  )
}
