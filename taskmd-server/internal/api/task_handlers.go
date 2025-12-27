package api

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/tktomaru/taskai/taskai-server/internal/repository"
	"github.com/tktomaru/taskai/taskai-server/internal/service"
	"github.com/tktomaru/taskai/taskai-server/internal/websocket"
)

// handleListTasks handles GET /api/v1/projects/:projectId/tasks
func (s *Server) handleListTasks(c *gin.Context) {
	projectID := c.Param("projectId")

	// Parse query parameters
	filters := &repository.TaskFilters{}

	if statuses, ok := c.GetQueryArray("status"); ok {
		filters.Statuses = statuses
	}

	if priorities, ok := c.GetQueryArray("priority"); ok {
		filters.Priorities = priorities
	}

	if assignees, ok := c.GetQueryArray("assignee"); ok {
		filters.Assignees = assignees
	}

	if labels, ok := c.GetQueryArray("label"); ok {
		filters.Labels = labels
	}

	// Get tasks
	taskService := service.NewTaskService(repository.NewTaskRepository(s.db.DB))
	tasks, err := taskService.List(c.Request.Context(), projectID, filters)
	if err != nil {
		log.Printf("ERROR: Failed to list tasks for project %s: %v", projectID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "internal_server_error",
			"message": "Failed to list tasks",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": tasks,
	})
}

// handleCreateTask handles POST /api/v1/projects/:projectId/tasks
func (s *Server) handleCreateTask(c *gin.Context) {
	projectID := c.Param("projectId")

	var req service.CreateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("ERROR: Failed to bind JSON for create task in project %s: %v", projectID, err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid_request",
			"message": "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// TODO: Get user ID from authentication context
	req.CreatedBy = "system"

	// Create task
	taskService := service.NewTaskService(repository.NewTaskRepository(s.db.DB))
	task, err := taskService.Create(c.Request.Context(), projectID, &req)
	if err != nil {
		log.Printf("ERROR: Failed to create task in project %s: %v", projectID, err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_error",
			"message": "Failed to create task",
			"details": err.Error(),
		})
		return
	}

	// Index in search engine (async)
	if s.meili != nil {
		go func() {
			searchService := service.NewSearchService(repository.NewTaskRepository(s.db.DB), s.meili)
			_ = searchService.IndexTask(c.Request.Context(), task)
		}()
	}

	// Broadcast WebSocket event
	s.wsHub.Broadcast(websocket.EventTaskCreated, projectID, task.ID, task)

	c.JSON(http.StatusCreated, gin.H{
		"data": task,
	})
}

// handleGetTask handles GET /api/v1/projects/:projectId/tasks/:taskId
func (s *Server) handleGetTask(c *gin.Context) {
	projectID := c.Param("projectId")
	taskID := c.Param("taskId")

	taskService := service.NewTaskService(repository.NewTaskRepository(s.db.DB))
	task, err := taskService.GetByID(c.Request.Context(), projectID, taskID)
	if err != nil {
		log.Printf("ERROR: Failed to get task %s in project %s: %v", taskID, projectID, err)
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "not_found",
			"message": "Task not found",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": task,
	})
}

// handleUpdateTask handles PUT /api/v1/projects/:projectId/tasks/:taskId
func (s *Server) handleUpdateTask(c *gin.Context) {
	projectID := c.Param("projectId")
	taskID := c.Param("taskId")

	var req service.UpdateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("ERROR: Failed to bind JSON for update task %s in project %s: %v", taskID, projectID, err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid_request",
			"message": "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// TODO: Get user ID from authentication context
	req.UpdatedBy = "system"

	// Update task
	taskService := service.NewTaskService(repository.NewTaskRepository(s.db.DB))
	task, err := taskService.Update(c.Request.Context(), projectID, taskID, &req)
	if err != nil {
		log.Printf("ERROR: Failed to update task %s in project %s: %v", taskID, projectID, err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_error",
			"message": "Failed to update task",
			"details": err.Error(),
		})
		return
	}

	// Update search index (async)
	if s.meili != nil {
		go func() {
			searchService := service.NewSearchService(repository.NewTaskRepository(s.db.DB), s.meili)
			_ = searchService.UpdateTaskIndex(c.Request.Context(), task)
		}()
	}

	// Broadcast WebSocket event
	s.wsHub.Broadcast(websocket.EventTaskUpdated, projectID, task.ID, task)

	c.JSON(http.StatusOK, gin.H{
		"data": task,
	})
}

// handleDeleteTask handles DELETE /api/v1/projects/:projectId/tasks/:taskId
func (s *Server) handleDeleteTask(c *gin.Context) {
	projectID := c.Param("projectId")
	taskID := c.Param("taskId")

	taskService := service.NewTaskService(repository.NewTaskRepository(s.db.DB))
	err := taskService.Delete(c.Request.Context(), projectID, taskID)
	if err != nil {
		log.Printf("ERROR: Failed to delete task %s in project %s: %v", taskID, projectID, err)
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "not_found",
			"message": "Task not found",
			"details": err.Error(),
		})
		return
	}

	// Remove from search index (async)
	if s.meili != nil {
		go func() {
			searchService := service.NewSearchService(repository.NewTaskRepository(s.db.DB), s.meili)
			_ = searchService.DeleteTaskIndex(c.Request.Context(), taskID)
		}()
	}

	// Broadcast WebSocket event
	s.wsHub.Broadcast(websocket.EventTaskDeleted, projectID, taskID, gin.H{"id": taskID})

	c.JSON(http.StatusNoContent, nil)
}
