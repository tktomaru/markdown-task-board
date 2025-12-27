package service

import (
	"context"
	"fmt"

	"github.com/tktomaru/taskai/taskai-server/internal/models"
	"github.com/tktomaru/taskai/taskai-server/internal/repository"
	"github.com/tktomaru/taskai/taskai-server/internal/search"
)

// SearchService handles search operations
type SearchService struct {
	taskRepo *repository.TaskRepository
	meili    *search.MeilisearchClient
}

// NewSearchService creates a new search service
func NewSearchService(taskRepo *repository.TaskRepository, meili *search.MeilisearchClient) *SearchService {
	return &SearchService{
		taskRepo: taskRepo,
		meili:    meili,
	}
}

// SearchRequest represents a search request
type SearchRequest struct {
	Query     string            `json:"query"`
	ProjectID string            `json:"project_id"`
	Limit     int               `json:"limit"`
	Filters   map[string]interface{} `json:"filters"`
}

// SearchResponse represents a search response
type SearchResponse struct {
	Results []*models.Task `json:"results"`
	Total   int64          `json:"total"`
	Query   string         `json:"query"`
}

// Search performs a full-text search
func (s *SearchService) Search(ctx context.Context, req *SearchRequest) (*SearchResponse, error) {
	if s.meili == nil {
		// Fallback to PostgreSQL full-text search
		return s.fallbackSearch(ctx, req)
	}

	// Use Meilisearch
	result, err := s.meili.Search(ctx, req.Query, req.ProjectID, req.Limit, req.Filters)
	if err != nil {
		// Fallback on error
		return s.fallbackSearch(ctx, req)
	}

	// Convert search results to task models
	tasks := make([]*models.Task, 0, len(result.Hits))
	for _, hit := range result.Hits {
		// Fetch full task from database
		task, err := s.taskRepo.GetByID(ctx, hit.ProjectID, hit.ID)
		if err != nil {
			continue
		}
		tasks = append(tasks, task)
	}

	return &SearchResponse{
		Results: tasks,
		Total:   result.TotalHits,
		Query:   req.Query,
	}, nil
}

// IndexTask indexes a task in the search engine
func (s *SearchService) IndexTask(ctx context.Context, task *models.Task) error {
	if s.meili == nil {
		return nil // Skip if Meilisearch is not configured
	}

	return s.meili.IndexTask(ctx, task)
}

// UpdateTaskIndex updates a task in the search engine
func (s *SearchService) UpdateTaskIndex(ctx context.Context, task *models.Task) error {
	if s.meili == nil {
		return nil
	}

	return s.meili.UpdateTask(ctx, task)
}

// DeleteTaskIndex removes a task from the search engine
func (s *SearchService) DeleteTaskIndex(ctx context.Context, taskID string) error {
	if s.meili == nil {
		return nil
	}

	return s.meili.DeleteTask(ctx, taskID)
}

// ReindexAll reindexes all tasks for a project
func (s *SearchService) ReindexAll(ctx context.Context, projectID string) error {
	if s.meili == nil {
		return fmt.Errorf("meilisearch not configured")
	}

	// Get all tasks
	tasks, err := s.taskRepo.List(ctx, projectID, &repository.TaskFilters{
		Limit: 10000, // Large limit
	})
	if err != nil {
		return fmt.Errorf("failed to fetch tasks: %w", err)
	}

	// Index in batches
	batchSize := 100
	for i := 0; i < len(tasks); i += batchSize {
		end := i + batchSize
		if end > len(tasks) {
			end = len(tasks)
		}

		batch := tasks[i:end]
		if err := s.meili.IndexTasks(ctx, batch); err != nil {
			return fmt.Errorf("failed to index batch: %w", err)
		}
	}

	return nil
}

// fallbackSearch uses PostgreSQL full-text search as fallback
func (s *SearchService) fallbackSearch(ctx context.Context, req *SearchRequest) (*SearchResponse, error) {
	limit := req.Limit
	if limit == 0 {
		limit = 20
	}

	tasks, err := s.taskRepo.Search(ctx, req.ProjectID, req.Query, limit)
	if err != nil {
		return nil, err
	}

	return &SearchResponse{
		Results: tasks,
		Total:   int64(len(tasks)),
		Query:   req.Query,
	}, nil
}
