package service

import (
	"context"
	"fmt"
	"time"

	"github.com/tktomaru/taskai/taskai-server/internal/models"
	"github.com/tktomaru/taskai/taskai-server/internal/parser"
	"github.com/tktomaru/taskai/taskai-server/internal/repository"
)

// TaskService handles task business logic
type TaskService struct {
	repo   *repository.TaskRepository
	parser *parser.MarkdownParser
}

// NewTaskService creates a new task service
func NewTaskService(repo *repository.TaskRepository) *TaskService {
	return &TaskService{
		repo:   repo,
		parser: parser.NewMarkdownParser(),
	}
}

// CreateTaskRequest represents a request to create a task
type CreateTaskRequest struct {
	MarkdownBody string `json:"markdown_body"`
	CreatedBy    string `json:"created_by,omitempty"`
}

// UpdateTaskRequest represents a request to update a task
type UpdateTaskRequest struct {
	MarkdownBody string `json:"markdown_body"`
	UpdatedBy    string `json:"updated_by,omitempty"`
}

// Create creates a new task from markdown
func (s *TaskService) Create(ctx context.Context, projectID string, req *CreateTaskRequest) (*models.Task, error) {
	// Parse markdown
	parsed, err := s.parser.Parse(req.MarkdownBody)
	if err != nil {
		return nil, fmt.Errorf("failed to parse markdown: %w", err)
	}

	// Convert to task model
	task, err := parsed.ToTask(projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to convert to task: %w", err)
	}

	// Set metadata
	task.CreatedBy = &req.CreatedBy
	task.UpdatedBy = &req.CreatedBy
	task.CreatedAt = time.Now()
	task.UpdatedAt = time.Now()

	// Create in repository
	if err := s.repo.Create(ctx, task); err != nil {
		return nil, fmt.Errorf("failed to create task: %w", err)
	}

	return task, nil
}

// GetByID retrieves a task by ID
func (s *TaskService) GetByID(ctx context.Context, projectID, taskID string) (*models.Task, error) {
	task, err := s.repo.GetByID(ctx, projectID, taskID)
	if err != nil {
		return nil, err
	}

	return task, nil
}

// List retrieves all tasks for a project
func (s *TaskService) List(ctx context.Context, projectID string, filters *repository.TaskFilters) ([]*models.Task, error) {
	tasks, err := s.repo.List(ctx, projectID, filters)
	if err != nil {
		return nil, err
	}

	return tasks, nil
}

// Update updates an existing task
func (s *TaskService) Update(ctx context.Context, projectID, taskID string, req *UpdateTaskRequest) (*models.Task, error) {
	// Get existing task
	existingTask, err := s.repo.GetByID(ctx, projectID, taskID)
	if err != nil {
		return nil, err
	}

	// Parse new markdown
	parsed, err := s.parser.Parse(req.MarkdownBody)
	if err != nil {
		return nil, fmt.Errorf("failed to parse markdown: %w", err)
	}

	// Convert to task model
	updatedTask, err := parsed.ToTask(projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to convert to task: %w", err)
	}

	// Verify ID hasn't changed
	if updatedTask.ID != taskID {
		return nil, fmt.Errorf("task ID cannot be changed")
	}

	// Preserve timestamps
	updatedTask.CreatedAt = existingTask.CreatedAt
	updatedTask.CreatedBy = existingTask.CreatedBy
	updatedTask.UpdatedBy = &req.UpdatedBy

	// Update status-specific timestamps
	if updatedTask.Status == models.TaskStatusDone && existingTask.Status != models.TaskStatusDone {
		now := time.Now()
		updatedTask.CompletedAt = &now
	}

	// Update in repository
	if err := s.repo.Update(ctx, updatedTask); err != nil {
		return nil, fmt.Errorf("failed to update task: %w", err)
	}

	return updatedTask, nil
}

// Delete deletes a task
func (s *TaskService) Delete(ctx context.Context, projectID, taskID string) error {
	return s.repo.Delete(ctx, projectID, taskID)
}

// Search performs full-text search
func (s *TaskService) Search(ctx context.Context, projectID, query string, limit int) ([]*models.Task, error) {
	if limit == 0 {
		limit = 50
	}

	return s.repo.Search(ctx, projectID, query, limit)
}

// GetAcceptanceCriteria extracts acceptance criteria from a task
func (s *TaskService) GetAcceptanceCriteria(task *models.Task) []string {
	return parser.ExtractAcceptanceCriteria(task.MarkdownBody)
}
