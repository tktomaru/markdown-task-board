// Task types
export type TaskStatus = 'open' | 'in_progress' | 'review' | 'blocked' | 'done' | 'archived'
export type TaskPriority = 'P0' | 'P1' | 'P2' | 'P3' | 'P4'

export interface Task {
  id: string
  project_id: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  assignees: string[]
  labels: string[]
  start_date?: string
  due_date?: string
  markdown_body: string
  extra_meta: Record<string, unknown>
  created_at: string
  updated_at: string
  completed_at?: string
  archived_at?: string
  created_by?: string
  updated_by?: string
}

// Project types
export type ProjectVisibility = 'private' | 'team' | 'public'

export interface Project {
  id: string
  name: string
  description?: string
  visibility: ProjectVisibility
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
  archived_at?: string
}

// SavedView types
export type ViewScope = 'private' | 'shared'

export interface SavedView {
  id: string
  project_id: string
  owner_user_id?: string
  name: string
  description?: string
  scope: ViewScope
  raw_query: string
  normalized_query: string
  presentation: {
    sort?: string
    group?: string
    cols?: string[]
    view?: 'table' | 'board'
    limit?: number
  }
  use_count: number
  last_used_at?: string
  created_at: string
  updated_at: string
}

// User types
export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  preferences: Record<string, unknown>
  created_at: string
  updated_at: string
  last_login_at?: string
}

// API response types
export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  error: string
  message: string
  details?: unknown
}

// Task Pack types
export interface TaskPackRequest {
  project_id: string
  task_ids: string[]
  template: 'IMPLEMENT' | 'BUGFIX' | 'RESEARCH' | 'REVIEW'
  include_related?: boolean
}

export interface TaskPackResponse {
  markdown: string
  task_count: number
}
