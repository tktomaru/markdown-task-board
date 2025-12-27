package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/tktomaru/taskai/taskai-server/internal/models"
)

// ProjectRepository handles project data access
type ProjectRepository struct {
	db *sqlx.DB
}

// NewProjectRepository creates a new project repository
func NewProjectRepository(db *sqlx.DB) *ProjectRepository {
	return &ProjectRepository{db: db}
}

// Create creates a new project
func (r *ProjectRepository) Create(ctx context.Context, project *models.Project) error {
	query := `
		INSERT INTO projects (
			id, name, description, visibility, settings
		) VALUES (
			:id, :name, :description, :visibility, :settings
		)
	`

	_, err := r.db.NamedExecContext(ctx, query, project)
	if err != nil {
		return fmt.Errorf("failed to create project: %w", err)
	}

	return nil
}

// GetByID retrieves a project by ID
func (r *ProjectRepository) GetByID(ctx context.Context, projectID string) (*models.Project, error) {
	query := `
		SELECT * FROM projects
		WHERE id = $1 AND archived_at IS NULL
	`

	var project models.Project
	err := r.db.GetContext(ctx, &project, query, projectID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("project not found")
		}
		return nil, fmt.Errorf("failed to get project: %w", err)
	}

	return &project, nil
}

// List retrieves all projects
func (r *ProjectRepository) List(ctx context.Context) ([]*models.Project, error) {
	query := `
		SELECT * FROM projects
		WHERE archived_at IS NULL
		ORDER BY created_at DESC
	`

	var projects []*models.Project
	err := r.db.SelectContext(ctx, &projects, query)
	if err != nil {
		return nil, fmt.Errorf("failed to list projects: %w", err)
	}

	return projects, nil
}

// Update updates an existing project
func (r *ProjectRepository) Update(ctx context.Context, project *models.Project) error {
	query := `
		UPDATE projects SET
			name = :name,
			description = :description,
			visibility = :visibility,
			settings = :settings,
			updated_at = NOW()
		WHERE id = :id
	`

	result, err := r.db.NamedExecContext(ctx, query, project)
	if err != nil {
		return fmt.Errorf("failed to update project: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("project not found")
	}

	return nil
}

// Delete soft-deletes a project
func (r *ProjectRepository) Delete(ctx context.Context, projectID string) error {
	query := `
		UPDATE projects SET archived_at = NOW()
		WHERE id = $1 AND archived_at IS NULL
	`

	result, err := r.db.ExecContext(ctx, query, projectID)
	if err != nil {
		return fmt.Errorf("failed to delete project: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("project not found")
	}

	return nil
}
