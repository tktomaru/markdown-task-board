# WebSocket Real-time Updates

## Overview

The TaskMD server provides WebSocket endpoints for real-time updates on task changes. When tasks are created, updated, or deleted, all connected clients subscribed to the project will receive instant notifications.

## Connection

### Endpoint

```
GET /api/v1/projects/:projectId/ws
```

### Example (JavaScript)

```javascript
// Connect to WebSocket for a specific project
const projectId = 'my-project';
const ws = new WebSocket(`ws://localhost:8080/api/v1/projects/${projectId}/ws`);

// Handle connection opened
ws.onopen = () => {
  console.log('WebSocket connected');
};

// Handle incoming messages
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);

  // Handle different event types
  switch (message.type) {
    case 'task.created':
      console.log('New task created:', message.data);
      // Update UI to show new task
      break;

    case 'task.updated':
      console.log('Task updated:', message.data);
      // Update UI to reflect changes
      break;

    case 'task.deleted':
      console.log('Task deleted:', message.task_id);
      // Remove task from UI
      break;

    default:
      console.log('Unknown event type:', message.type);
  }
};

// Handle connection closed
ws.onclose = () => {
  console.log('WebSocket disconnected');
  // Implement reconnection logic here
};

// Handle errors
ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};
```

## Message Format

All WebSocket messages follow this structure:

```json
{
  "type": "task.created|task.updated|task.deleted",
  "project_id": "project-id",
  "task_id": "task-id",
  "data": {
    // Full task object or event-specific data
  }
}
```

### Event Types

#### `task.created`

Sent when a new task is created.

```json
{
  "type": "task.created",
  "project_id": "my-project",
  "task_id": "TASK-001",
  "data": {
    "id": "TASK-001",
    "title": "New Task",
    "status": "open",
    "markdown_body": "...",
    // ... full task object
  }
}
```

#### `task.updated`

Sent when a task is updated.

```json
{
  "type": "task.updated",
  "project_id": "my-project",
  "task_id": "TASK-001",
  "data": {
    "id": "TASK-001",
    "title": "Updated Task",
    "status": "in_progress",
    // ... full updated task object
  }
}
```

#### `task.deleted`

Sent when a task is deleted.

```json
{
  "type": "task.deleted",
  "project_id": "my-project",
  "task_id": "TASK-001",
  "data": {
    "id": "TASK-001"
  }
}
```

## React Integration Example

```typescript
import { useEffect, useState } from 'react';

function useTaskWebSocket(projectId: string) {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const websocket = new WebSocket(
      `ws://localhost:8080/api/v1/projects/${projectId}/ws`
    );

    websocket.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    websocket.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setWs(websocket);

    // Cleanup on unmount
    return () => {
      websocket.close();
    };
  }, [projectId]);

  return { ws, isConnected };
}

// Usage in component
function TaskList({ projectId }: { projectId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { ws, isConnected } = useTaskWebSocket(projectId);

  useEffect(() => {
    if (!ws) return;

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'task.created':
          setTasks((prev) => [...prev, message.data]);
          break;

        case 'task.updated':
          setTasks((prev) =>
            prev.map((task) =>
              task.id === message.task_id ? message.data : task
            )
          );
          break;

        case 'task.deleted':
          setTasks((prev) =>
            prev.filter((task) => task.id !== message.task_id)
          );
          break;
      }
    };
  }, [ws]);

  return (
    <div>
      <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      {/* Render tasks */}
    </div>
  );
}
```

## Connection Statistics

You can check WebSocket connection statistics:

```bash
# Get overall stats
curl http://localhost:8080/api/v1/ws/stats

# Get stats for specific project
curl http://localhost:8080/api/v1/ws/stats?project_id=my-project
```

Response:

```json
{
  "status": "ok",
  "project_id": "my-project",
  "client_count": 3
}
```

## Production Considerations

1. **Reconnection Logic**: Implement exponential backoff for reconnection attempts
2. **Heartbeat**: The server sends ping frames every 54 seconds; clients respond with pong
3. **Authentication**: The WebSocket endpoint respects authentication middleware
4. **CORS**: Configure proper CORS origins in production
5. **Load Balancing**: Use sticky sessions if deploying behind a load balancer
6. **Message Buffering**: Client send channels buffer up to 256 messages

## Security

- WebSocket connections use the same authentication as HTTP endpoints
- JWT tokens can be passed via query parameters or cookies
- All messages are broadcast only to clients subscribed to the same project
- No client-to-client messaging is supported (broadcast-only)
