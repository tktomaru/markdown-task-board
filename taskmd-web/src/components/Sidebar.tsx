export default function Sidebar() {
  return (
    <aside style={{
      width: '250px',
      borderRight: '1px solid #333',
      padding: '1rem',
      overflow: 'auto'
    }}>
      <h2 style={{ fontSize: '1rem', marginBottom: '1rem', fontWeight: 'bold' }}>
        Saved Views
      </h2>
      <ul style={{ listStyle: 'none' }}>
        <li style={{ padding: '0.5rem', cursor: 'pointer' }}>
          My Work (Today)
        </li>
        <li style={{ padding: '0.5rem', cursor: 'pointer' }}>
          My Work (This Week)
        </li>
        <li style={{ padding: '0.5rem', cursor: 'pointer' }}>
          Review Queue
        </li>
        <li style={{ padding: '0.5rem', cursor: 'pointer' }}>
          Blocked
        </li>
        <li style={{ padding: '0.5rem', cursor: 'pointer' }}>
          P0/P1 Open
        </li>
      </ul>
    </aside>
  )
}
