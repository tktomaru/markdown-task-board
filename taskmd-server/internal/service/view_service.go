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
	debug      bool
}

// NewViewService creates a new view service
func NewViewService(repo *repository.ViewRepository, debug bool) *ViewService {
	return &ViewService{
		repo:       repo,
		parser:     query.NewQueryParser(),
		sqlBuilder: query.NewSQLBuilder(),
		debug:      debug,
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

	if s.debug {
		fmt.Printf("[DEBUG] View Execution Start\n")
		fmt.Printf("[DEBUG]   Project ID: %s\n", projectID)
		fmt.Printf("[DEBUG]   View ID: %s\n", viewID)
		fmt.Printf("[DEBUG]   View Name: %s\n", view.Name)
		fmt.Printf("[DEBUG]   Raw Query: %s\n", view.RawQuery)
	}

	// Parse query
	parsed, err := s.parser.Parse(view.RawQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to parse query: %w", err)
	}

	if s.debug {
		fmt.Printf("[DEBUG] Parsed Query:\n")
		fmt.Printf("[DEBUG]   Filters: %+v\n", parsed.Filters)
		fmt.Printf("[DEBUG]   Sort: %+v\n", parsed.Sort)
		fmt.Printf("[DEBUG]   Limit: %d\n", parsed.Limit)
	}

	// Build SQL
	buildResult, err := s.sqlBuilder.Build(projectID, parsed)
	if err != nil {
		return nil, fmt.Errorf("failed to build SQL: %w", err)
	}

	if s.debug {
		fmt.Printf("[DEBUG] Generated SQL:\n")
		fmt.Printf("[DEBUG]   SQL: %s\n", buildResult.SQL)
		fmt.Printf("[DEBUG]   Args: %+v\n", buildResult.Args)
		fmt.Printf("[DEBUG]   Args Types: ")
		for i, arg := range buildResult.Args {
			fmt.Printf("%d=%T ", i, arg)
		}
		fmt.Printf("\n")
	}

	// Execute query
	tasks, err := s.repo.ExecuteQuery(ctx, buildResult.SQL, buildResult.Args)
	if err != nil {
		if s.debug {
			fmt.Printf("[DEBUG] Query Execution Failed: %v\n", err)
		}
		return nil, fmt.Errorf("failed to execute query: %w", err)
	}

	if s.debug {
		fmt.Printf("[DEBUG] Query Execution Success\n")
		fmt.Printf("[DEBUG]   Result Count: %d tasks\n", len(tasks))
		if len(tasks) > 0 {
			fmt.Printf("[DEBUG]   Sample Task: ID=%s, Title=%s, Status=%s, Priority=%s\n",
				tasks[0].ID, tasks[0].Title, tasks[0].Status, tasks[0].Priority)
		}
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
