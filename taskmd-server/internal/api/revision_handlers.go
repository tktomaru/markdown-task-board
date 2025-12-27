package api

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/tktomaru/taskai/taskai-server/internal/repository"
	"github.com/tktomaru/taskai/taskai-server/internal/service"
)

// handleGetTaskRevisions handles GET /api/v1/projects/:projectId/tasks/:taskId/revisions
func (s *Server) handleGetTaskRevisions(c *gin.Context) {
	taskID := c.Param("taskId")

	// Parse limit parameter
	limitStr := c.DefaultQuery("limit", "50")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 50
	}

	revisionService := service.NewRevisionService(
		repository.NewRevisionRepository(s.db.DB),
		repository.NewTaskRepository(s.db.DB),
	)

	revisions, err := revisionService.GetTaskRevisions(c.Request.Context(), taskID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "internal_server_error",
			"message": "Failed to get revisions",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": revisions,
	})
}

// handleGetRevision handles GET /api/v1/revisions/:revId
func (s *Server) handleGetRevision(c *gin.Context) {
	revIDStr := c.Param("revId")
	revID, err := strconv.ParseInt(revIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid_request",
			"message": "Invalid revision ID",
		})
		return
	}

	revisionService := service.NewRevisionService(
		repository.NewRevisionRepository(s.db.DB),
		repository.NewTaskRepository(s.db.DB),
	)

	revision, err := revisionService.GetRevision(c.Request.Context(), revID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "not_found",
			"message": "Revision not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": revision,
	})
}

// handleCompareRevisions handles GET /api/v1/revisions/compare?old=:oldRevId&new=:newRevId
func (s *Server) handleCompareRevisions(c *gin.Context) {
	oldRevIDStr := c.Query("old")
	newRevIDStr := c.Query("new")

	oldRevID, err := strconv.ParseInt(oldRevIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid_request",
			"message": "Invalid old revision ID",
		})
		return
	}

	newRevID, err := strconv.ParseInt(newRevIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid_request",
			"message": "Invalid new revision ID",
		})
		return
	}

	revisionService := service.NewRevisionService(
		repository.NewRevisionRepository(s.db.DB),
		repository.NewTaskRepository(s.db.DB),
	)

	diff, err := revisionService.CompareRevisions(c.Request.Context(), oldRevID, newRevID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "comparison_failed",
			"message": "Failed to compare revisions",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": diff,
	})
}

// handleCompareWithCurrent handles GET /api/v1/projects/:projectId/tasks/:taskId/revisions/:revId/compare
func (s *Server) handleCompareWithCurrent(c *gin.Context) {
	projectID := c.Param("projectId")
	taskID := c.Param("taskId")
	revIDStr := c.Param("revId")

	revID, err := strconv.ParseInt(revIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid_request",
			"message": "Invalid revision ID",
		})
		return
	}

	revisionService := service.NewRevisionService(
		repository.NewRevisionRepository(s.db.DB),
		repository.NewTaskRepository(s.db.DB),
	)

	diff, err := revisionService.CompareWithCurrent(c.Request.Context(), projectID, taskID, revID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "comparison_failed",
			"message": "Failed to compare with current version",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": diff,
	})
}
