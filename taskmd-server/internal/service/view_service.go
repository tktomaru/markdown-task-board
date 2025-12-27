package service

import (
	"context"
	"fmt"
	"time"

	"github.com/tktomaru/taskai/taskai-server/internal/models"
	"github.com/tktomaru/taskai/taskai-server/internal/query"
	"github.com/tktomaru/taskai/taskai-server/internal/repository"
)

// ViewService handles saved view business logic
type ViewService struct {
	repo       *repository.ViewRepository
	parser     *query.QueryParser
	sqlBuilder *query.SQLBuilder
}

// NewViewService creates a new view service
func NewViewService(repo *repository.ViewRepository) *ViewService {
	return &ViewService{
		repo:       repo,
		parser:     query.NewQueryParser(),
		sqlBuilder: query.NewSQLBuilder(),
	}
}

// CreateViewRequest represents a request to create a view
type CreateViewRequest struct {
	ID          string           `json:"id"`
	Name        string           `json:"name"`
	Description string           `json:"description"`
	Scope       models.ViewScope `json:"scope"`
	RawQuery    string           `json:"raw_query"`
	OwnerUserID string           `json:"owner_user_id,omitempty"`
}

// UpdateViewRequest represents a request to update a view
type UpdateViewRequest struct {
	Name        string           `json:"name"`
	Description string           `json:"description"`
	Scope       models.ViewScope `json:"scope"`
	RawQuery    string           `json:"raw_query"`
}

// Create creates a new saved view
func (s *ViewService) Create(ctx context.Context, projectID string, req *CreateViewRequest) (*models.SavedView, error) {
	if req.ID == "" {
		return nil, fmt.Errorf("view ID is required")
	}

	if req.Name == "" {
		return nil, fmt.Errorf("view name is required")
	}

	// Parse and normalize query
	parsed, err := s.parser.Parse(req.RawQuery)
	if err != nil {
		return nil, fmt.Errorf("invalid query: %w", err)
	}

	// Normalize query (for stable comparison)
	normalizedQuery := s.normalizeQuery(parsed)

	// Build presentation settings
	presentation := make(models.JSONB)
	if parsed.Sort != nil {
		presentation["sort"] = parsed.Sort.Field + "_" + parsed.Sort.Order
	}
	if parsed.Group != nil {
		presentation["group"] = parsed.Group.Field
	}
	if parsed.Limit > 0 {
		presentation["limit"] = parsed.Limit
	}
	if len(parsed.Columns) > 0 {
		presentation["cols"] = parsed.Columns
	}
	if parsed.ViewType != "" {
		presentation["view"] = parsed.ViewType
	}

	view := &models.SavedView{
		ID:              req.ID,
		ProjectID:       projectID,
		OwnerUserID:     &req.OwnerUserID,
		Name:            req.Name,
		Description:     &req.Description,
		Scope:           req.Scope,
		RawQuery:        req.RawQuery,
		NormalizedQuery: normalizedQuery,
		Presentation:    presentation,
		UseCount:        0,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	if err := s.repo.Create(ctx, view); err != nil {
		return nil, err
	}

	return view, nil
}

// GetByID retrieves a view by ID
func (s *ViewService) GetByID(ctx context.Context, projectID, viewID string) (*models.SavedView, error) {
	return s.repo.GetByID(ctx, projectID, viewID)
}

// List retrieves all views for a project
func (s *ViewService) List(ctx context.Context, projectID string, ownerUserID *string) ([]*models.SavedView, error) {
	return s.repo.List(ctx, projectID, ownerUserID)
}

// Update updates an existing view
func (s *ViewService) Update(ctx context.Context, projectID, viewID string, req *UpdateViewRequest) (*models.SavedView, error) {
	// Get existing view
	view, err := s.repo.GetByID(ctx, projectID, viewID)
	if err != nil {
		return nil, err
	}

	// Parse and normalize new query
	parsed, err := s.parser.Parse(req.RawQuery)
	if err != nil {
		return nil, fmt.Errorf("invalid query: %w", err)
	}

	normalizedQuery := s.normalizeQuery(parsed)

	// Update fields
	view.Name = req.Name
	view.Description = &req.Description
	view.Scope = req.Scope
	view.RawQuery = req.RawQuery
	view.NormalizedQuery = normalizedQuery

	// Update presentation
	presentation := make(models.JSONB)
	if parsed.Sort != nil {
		presentation["sort"] = parsed.Sort.Field + "_" + parsed.Sort.Order
	}
	if parsed.Group != nil {
		presentation["group"] = parsed.Group.Field
	}
	if parsed.Limit > 0 {
		presentation["limit"] = parsed.Limit
	}
	if len(parsed.Columns) > 0 {
		presentation["cols"] = parsed.Columns
	}
	if parsed.ViewType != "" {
		presentation["view"] = parsed.ViewType
	}
	view.Presentation = presentation

	if err := s.repo.Update(ctx, view); err != nil {
		return nil, err
	}

	return view, nil
}

// Delete deletes a view
func (s *ViewService) Delete(ctx context.Context, projectID, viewID string) error {
	return s.repo.Delete(ctx, projectID, viewID)
}

// Execute executes a saved view's query
func (s *ViewService) Execute(ctx context.Context, projectID, viewID string) ([]*models.Task, error) {
	// Get view
	view, err := s.repo.GetByID(ctx, projectID, viewID)
	if err != nil {
		return nil, err
	}

	// Parse query
	parsed, err := s.parser.Parse(view.RawQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to parse query: %w", err)
	}

	// Build SQL
	buildResult, err := s.sqlBuilder.Build(projectID, parsed)
	if err != nil {
		return nil, fmt.Errorf("failed to build SQL: %w", err)
	}

	// Execute query
	tasks, err := s.repo.ExecuteQuery(ctx, buildResult.SQL, buildResult.Args)
	if err != nil {
		return nil, err
	}

	// Increment use count (async)
	go s.repo.IncrementUseCount(context.Background(), viewID)

	return tasks, nil
}

// normalizeQuery generates a normalized query string for stable comparison
func (s *ViewService) normalizeQuery(parsed *query.ParsedQuery) string {
	// Simple normalization: reconstruct query in canonical form
	// For now, just return the filters in a consistent order
	var parts []string

	for _, filter := range parsed.Filters {
		part := filter.Key + ":" + fmt.Sprint(filter.Value)
		if filter.Negate {
			part = "-" + part
		}
		parts = append(parts, part)
	}

	return fmt.Sprint(parts)
}
