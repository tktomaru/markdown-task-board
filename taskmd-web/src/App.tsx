import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import ProjectPage from './pages/ProjectPage'
import TaskPage from './pages/TaskPage'
import SavedViewsPage from './pages/SavedViewsPage'
import ViewDetailPage from './pages/ViewDetailPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="projects/:projectId" element={<ProjectPage />} />
        <Route path="projects/:projectId/tasks/:taskId" element={<TaskPage />} />
        <Route path="projects/:projectId/views" element={<SavedViewsPage />} />
        <Route path="projects/:projectId/views/:viewId" element={<ViewDetailPage />} />
      </Route>
    </Routes>
  )
}

export default App
