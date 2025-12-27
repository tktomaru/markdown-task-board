package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/tktomaru/taskai/taskai-server/internal/repository"
	"github.com/tktomaru/taskai/taskai-server/internal/service"
)

// handleSearch handles POST /api/v1/search
func (s *Server) handleSearch(c *gin.Context) {
	var req service.SearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid_request",
			"message": "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// Use search service if Meilisearch is configured
	var searchService *service.SearchService
	if s.meili != nil {
		searchService = service.NewSearchService(
			repository.NewTaskRepository(s.db.DB),
			s.meili,
		)
	} else {
		searchService = service.NewSearchService(
			repository.NewTaskRepository(s.db.DB),
			nil,
		)
	}

	results, err := searchService.Search(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "search_failed",
			"message": "Failed to perform search",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": results,
	})
}

// handleReindexProject handles POST /api/v1/projects/:projectId/reindex
func (s *Server) handleReindexProject(c *gin.Context) {
	projectID := c.Param("projectId")

	if s.meili == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error":   "meilisearch_not_configured",
			"message": "Meilisearch is not configured",
		})
		return
	}

	searchService := service.NewSearchService(
		repository.NewTaskRepository(s.db.DB),
		s.meili,
	)

	err := searchService.ReindexAll(c.Request.Context(), projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "reindex_failed",
			"message": "Failed to reindex project",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Project reindexed successfully",
	})
}
