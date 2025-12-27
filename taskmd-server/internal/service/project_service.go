package service

import (
	"context"
	"fmt"
	"math/rand"
	"time"

	"github.com/tktomaru/taskai/taskai-server/internal/models"
	"github.com/tktomaru/taskai/taskai-server/internal/repository"
)

// generateProjectID generates a unique project ID
func generateProjectID() string {
	const charset = "abcdefghijklmnopqrstuvwxyz0123456789"
	timestamp := time.Now().Unix()

	// Generate random suffix
	b := make([]byte, 6)
	for i := range b {
		b[i] = charset[rand.Intn(len(charset))]
	}

	return fmt.Sprintf("proj-%d-%s", timestamp, string(b))
}

// ProjectService handles project business logic
type ProjectService struct {
	repo *repository.ProjectRepository
}

// NewProjectService creates a new project service
func NewProjectService(repo *repository.ProjectRepository) *ProjectService {
	return &ProjectService{repo: repo}
}

// CreateProjectRequest represents a request to create a project
type CreateProjectRequest struct {
	ID          string                  `json:"id"`
	Name        string                  `json:"name"`
	Description string                  `json:"description"`
	Visibility  models.ProjectVisibility `json:"visibility"`
}

// UpdateProjectRequest represents a request to update a project
type UpdateProjectRequest struct {
	Name        string                  `json:"name"`
	Description string                  `json:"description"`
	Visibility  models.ProjectVisibility `json:"visibility"`
}

// Create creates a new project
func (s *ProjectService) Create(ctx context.Context, req *CreateProjectRequest) (*models.Project, error) {
	if req.Name == "" {
		return nil, fmt.Errorf("project name is required")
	}

	// Auto-generate ID if not provided
	projectID := req.ID
	if projectID == "" {
		projectID = generateProjectID()
	}

	// Set default visibility if not provided
	visibility := req.Visibility
	if visibility == "" {
		visibility = models.ProjectVisibilityPrivate
	}

	project := &models.Project{
		ID:          projectID,
		Name:        req.Name,
		Description: &req.Description,
		Visibility:  visibility,
		Settings:    make(models.JSONB),
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := s.repo.Create(ctx, project); err != nil {
		return nil, err
	}

	return project, nil
}

// GetByID retrieves a project by ID
func (s *ProjectService) GetByID(ctx context.Context, projectID string) (*models.Project, error) {
	return s.repo.GetByID(ctx, projectID)
}

// List retrieves all projects
func (s *ProjectService) List(ctx context.Context) ([]*models.Project, error) {
	return s.repo.List(ctx)
}

// Update updates an existing project
func (s *ProjectService) Update(ctx context.Context, projectID string, req *UpdateProjectRequest) (*models.Project, error) {
	// Get existing project
	project, err := s.repo.GetByID(ctx, projectID)
	if err != nil {
		return nil, err
	}

	// Update fields
	project.Name = req.Name
	project.Description = &req.Description
	project.Visibility = req.Visibility

	if err := s.repo.Update(ctx, project); err != nil {
		return nil, err
	}

	return project, nil
}

// Delete deletes a project
func (s *ProjectService) Delete(ctx context.Context, projectID string) error {
	return s.repo.Delete(ctx, projectID)
}
