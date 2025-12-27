package api

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/tktomaru/taskai/taskai-server/internal/repository"
	"github.com/tktomaru/taskai/taskai-server/internal/service"
)

// handleListProjects handles GET /api/v1/projects
func (s *Server) handleListProjects(c *gin.Context) {
	projectService := service.NewProjectService(repository.NewProjectRepository(s.db.DB))
	projects, err := projectService.List(c.Request.Context())
	if err != nil {
		log.Printf("ERROR: Failed to list projects: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "internal_server_error",
			"message": "Failed to list projects",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": projects,
	})
}

// handleCreateProject handles POST /api/v1/projects
func (s *Server) handleCreateProject(c *gin.Context) {
	var req service.CreateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("ERROR: Failed to bind JSON for create project: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid_request",
			"message": "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	projectService := service.NewProjectService(repository.NewProjectRepository(s.db.DB))
	project, err := projectService.Create(c.Request.Context(), &req)
	if err != nil {
		log.Printf("ERROR: Failed to create project: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_error",
			"message": "Failed to create project",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data": project,
	})
}

// handleGetProject handles GET /api/v1/projects/:projectId
func (s *Server) handleGetProject(c *gin.Context) {
	projectID := c.Param("projectId")

	projectService := service.NewProjectService(repository.NewProjectRepository(s.db.DB))
	project, err := projectService.GetByID(c.Request.Context(), projectID)
	if err != nil {
		log.Printf("ERROR: Failed to get project %s: %v", projectID, err)
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "not_found",
			"message": "Project not found",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": project,
	})
}

// handleUpdateProject handles PUT /api/v1/projects/:projectId
func (s *Server) handleUpdateProject(c *gin.Context) {
	projectID := c.Param("projectId")

	var req service.UpdateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("ERROR: Failed to bind JSON for update project %s: %v", projectID, err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid_request",
			"message": "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	projectService := service.NewProjectService(repository.NewProjectRepository(s.db.DB))
	project, err := projectService.Update(c.Request.Context(), projectID, &req)
	if err != nil {
		log.Printf("ERROR: Failed to update project %s: %v", projectID, err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_error",
			"message": "Failed to update project",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": project,
	})
}

// handleDeleteProject handles DELETE /api/v1/projects/:projectId
func (s *Server) handleDeleteProject(c *gin.Context) {
	projectID := c.Param("projectId")

	projectService := service.NewProjectService(repository.NewProjectRepository(s.db.DB))
	err := projectService.Delete(c.Request.Context(), projectID)
	if err != nil {
		log.Printf("ERROR: Failed to delete project %s: %v", projectID, err)
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "not_found",
			"message": "Project not found",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}
