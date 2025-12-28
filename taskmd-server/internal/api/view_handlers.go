package api

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/tktomaru/taskai/taskai-server/internal/repository"
	"github.com/tktomaru/taskai/taskai-server/internal/service"
)

// handleListViews handles GET /api/v1/projects/:projectId/views
func (s *Server) handleListViews(c *gin.Context) {
	projectID := c.Param("projectId")

	// TODO: Get user ID from authentication context
	userID := "system"

	viewService := service.NewViewService(repository.NewViewRepository(s.db.DB), s.cfg.Logging.Debug)
	views, err := viewService.List(c.Request.Context(), projectID, &userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "internal_server_error",
			"message": "Failed to list views",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": views,
	})
}

// handleCreateView handles POST /api/v1/projects/:projectId/views
func (s *Server) handleCreateView(c *gin.Context) {
	projectID := c.Param("projectId")

	var req service.CreateViewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid_request",
			"message": "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// TODO: Get user ID from authentication context
	req.OwnerUserID = "system"

	if s.cfg.Logging.Debug {
		fmt.Printf("[DEBUG] handleCreateView called\n")
		fmt.Printf("[DEBUG]   Project ID: %s\n", projectID)
		fmt.Printf("[DEBUG]   View ID: %s\n", req.ID)
		fmt.Printf("[DEBUG]   Name: %s\n", req.Name)
		fmt.Printf("[DEBUG]   Scope: %s\n", req.Scope)
		fmt.Printf("[DEBUG]   Raw Query: %s\n", req.RawQuery)
	}

	viewService := service.NewViewService(repository.NewViewRepository(s.db.DB), s.cfg.Logging.Debug)
	view, err := viewService.Create(c.Request.Context(), projectID, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_error",
			"message": "Failed to create view",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data": view,
	})
}

// handleGetView handles GET /api/v1/projects/:projectId/views/:viewId
func (s *Server) handleGetView(c *gin.Context) {
	projectID := c.Param("projectId")
	viewID := c.Param("viewId")

	viewService := service.NewViewService(repository.NewViewRepository(s.db.DB), s.cfg.Logging.Debug)
	view, err := viewService.GetByID(c.Request.Context(), projectID, viewID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "not_found",
			"message": "View not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": view,
	})
}

// handleUpdateView handles PUT /api/v1/projects/:projectId/views/:viewId
func (s *Server) handleUpdateView(c *gin.Context) {
	projectID := c.Param("projectId")
	viewID := c.Param("viewId")

	var req service.UpdateViewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid_request",
			"message": "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	if s.cfg.Logging.Debug {
		fmt.Printf("[DEBUG] handleUpdateView called\n")
		fmt.Printf("[DEBUG]   Project ID: %s\n", projectID)
		fmt.Printf("[DEBUG]   View ID: %s\n", viewID)
		fmt.Printf("[DEBUG]   Name: %s\n", req.Name)
		fmt.Printf("[DEBUG]   Scope: %s\n", req.Scope)
		fmt.Printf("[DEBUG]   Raw Query: %s\n", req.RawQuery)
	}

	viewService := service.NewViewService(repository.NewViewRepository(s.db.DB), s.cfg.Logging.Debug)
	view, err := viewService.Update(c.Request.Context(), projectID, viewID, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_error",
			"message": "Failed to update view",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": view,
	})
}

// handleDeleteView handles DELETE /api/v1/projects/:projectId/views/:viewId
func (s *Server) handleDeleteView(c *gin.Context) {
	projectID := c.Param("projectId")
	viewID := c.Param("viewId")

	viewService := service.NewViewService(repository.NewViewRepository(s.db.DB), s.cfg.Logging.Debug)
	err := viewService.Delete(c.Request.Context(), projectID, viewID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "not_found",
			"message": "View not found",
		})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

// handleExecuteView handles POST /api/v1/projects/:projectId/views/:viewId/execute
func (s *Server) handleExecuteView(c *gin.Context) {
	projectID := c.Param("projectId")
	viewID := c.Param("viewId")

	if s.cfg.Logging.Debug {
		fmt.Printf("[DEBUG] handleExecuteView called\n")
		fmt.Printf("[DEBUG]   Project ID: %s\n", projectID)
		fmt.Printf("[DEBUG]   View ID: %s\n", viewID)
		fmt.Printf("[DEBUG]   Method: %s\n", c.Request.Method)
		fmt.Printf("[DEBUG]   Path: %s\n", c.Request.URL.Path)
	}

	viewService := service.NewViewService(repository.NewViewRepository(s.db.DB), s.cfg.Logging.Debug)
	tasks, err := viewService.Execute(c.Request.Context(), projectID, viewID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "execution_error",
			"message": "Failed to execute view",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": tasks,
	})
}
