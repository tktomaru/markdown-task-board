import axios, { AxiosError } from 'axios'
import type {
  Task,
  Project,
  SavedView,
  User,
  ApiResponse,
  ApiError,
  TaskPackRequest,
  TaskPackResponse,
} from '@/types'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api/v1'

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// Error handler
export function handleApiError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>
    const errorData = axiosError.response?.data
    const message = errorData?.message || axiosError.message
    const details = errorData?.details

    // Log detailed error information
    console.error('API Error:', {
      message,
      details,
      status: axiosError.response?.status,
      data: errorData,
    })

    // Include details in error message if available
    const fullMessage = details ? `${message}\n詳細: ${details}` : message
    throw new Error(fullMessage)
  }
  throw error
}

// Projects API
export const projectsApi = {
  list: async (): Promise<Project[]> => {
    try {
      const response = await api.get<ApiResponse<Project[]>>('/projects')
      return response.data.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  get: async (projectId: string): Promise<Project> => {
    try {
      const response = await api.get<ApiResponse<Project>>(`/projects/${projectId}`)
      return response.data.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  create: async (data: Partial<Project>): Promise<Project> => {
    try {
      const response = await api.post<ApiResponse<Project>>('/projects', data)
      return response.data.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  update: async (projectId: string, data: Partial<Project>): Promise<Project> => {
    try {
      const response = await api.put<ApiResponse<Project>>(`/projects/${projectId}`, data)
      return response.data.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  delete: async (projectId: string): Promise<void> => {
    try {
      await api.delete(`/projects/${projectId}`)
    } catch (error) {
      return handleApiError(error)
    }
  },
}

// Tasks API
export const tasksApi = {
  list: async (projectId: string, query?: string): Promise<Task[]> => {
    try {
      const response = await api.get<ApiResponse<Task[]>>(`/projects/${projectId}/tasks`, {
        params: { query },
      })
      return response.data.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  get: async (projectId: string, taskId: string): Promise<Task> => {
    try {
      const response = await api.get<ApiResponse<Task>>(
        `/projects/${projectId}/tasks/${taskId}`
      )
      return response.data.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  create: async (projectId: string, data: Partial<Task>): Promise<Task> => {
    try {
      const response = await api.post<ApiResponse<Task>>(
        `/projects/${projectId}/tasks`,
        data
      )
      return response.data.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  update: async (
    projectId: string,
    taskId: string,
    data: Partial<Task>
  ): Promise<Task> => {
    try {
      const response = await api.put<ApiResponse<Task>>(
        `/projects/${projectId}/tasks/${taskId}`,
        data
      )
      return response.data.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  delete: async (projectId: string, taskId: string): Promise<void> => {
    try {
      await api.delete(`/projects/${projectId}/tasks/${taskId}`)
    } catch (error) {
      return handleApiError(error)
    }
  },
}

// SavedViews API
export const savedViewsApi = {
  list: async (projectId: string): Promise<SavedView[]> => {
    try {
      const response = await api.get<ApiResponse<SavedView[]>>(
        `/projects/${projectId}/views`
      )
      return response.data.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  get: async (projectId: string, viewId: string): Promise<SavedView> => {
    try {
      const response = await api.get<ApiResponse<SavedView>>(
        `/projects/${projectId}/views/${viewId}`
      )
      return response.data.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  create: async (projectId: string, data: Partial<SavedView>): Promise<SavedView> => {
    try {
      const response = await api.post<ApiResponse<SavedView>>(
        `/projects/${projectId}/views`,
        data
      )
      return response.data.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  update: async (
    projectId: string,
    viewId: string,
    data: Partial<SavedView>
  ): Promise<SavedView> => {
    try {
      const response = await api.put<ApiResponse<SavedView>>(
        `/projects/${projectId}/views/${viewId}`,
        data
      )
      return response.data.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  delete: async (projectId: string, viewId: string): Promise<void> => {
    try {
      await api.delete(`/projects/${projectId}/views/${viewId}`)
    } catch (error) {
      return handleApiError(error)
    }
  },

  execute: async (projectId: string, viewId: string): Promise<Task[]> => {
    try {
      const response = await api.post<ApiResponse<Task[]>>(
        `/projects/${projectId}/views/${viewId}/execute`
      )
      return response.data.data
    } catch (error) {
      return handleApiError(error)
    }
  },
}

// Task Pack API
export const taskPackApi = {
  generate: async (data: TaskPackRequest): Promise<TaskPackResponse> => {
    try {
      console.log('Task Pack request:', data)
      const response = await api.post<ApiResponse<TaskPackResponse>>(
        '/task-packs',
        data
      )
      console.log('Task Pack API response:', response.data)
      return response.data.data
    } catch (error) {
      console.error('Task Pack API error:', error)
      return handleApiError(error)
    }
  },
}

// Auth API
export const authApi = {
  login: async (email: string, password: string): Promise<User> => {
    try {
      const response = await api.post<ApiResponse<User>>('/auth/login', {
        email,
        password,
      })
      return response.data.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      return handleApiError(error)
    }
  },

  me: async (): Promise<User> => {
    try {
      const response = await api.get<ApiResponse<User>>('/auth/me')
      return response.data.data
    } catch (error) {
      return handleApiError(error)
    }
  },
}

// Convenience exports for direct usage
export const getProjects = projectsApi.list
export const getProject = projectsApi.get
export const createProject = projectsApi.create
export const updateProject = projectsApi.update
export const deleteProject = projectsApi.delete

export const getTasks = tasksApi.list
export const getTask = tasksApi.get
export const createTask = tasksApi.create
export const updateTask = tasksApi.update
export const deleteTask = tasksApi.delete

export default api
