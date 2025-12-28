package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/tktomaru/taskai/taskai-server/internal/models"
)

// ViewRepository handles saved view data access
type ViewRepository struct {
	db *sqlx.DB
}

// NewViewRepository creates a new view repository
func NewViewRepository(db *sqlx.DB) *ViewRepository {
	return &ViewRepository{db: db}
}

// Create creates a new saved view
func (r *ViewRepository) Create(ctx context.Context, view *models.SavedView) error {
	query := `
		INSERT INTO saved_views (
			id, project_id, owner_user_id, name, description,
			scope, raw_query, normalized_query, presentation
		) VALUES (
			:id, :project_id, :owner_user_id, :name, :description,
			:scope, :raw_query, :normalized_query, :presentation
		)
	`

	_, err := r.db.NamedExecContext(ctx, query, view)
	if err != nil {
		return fmt.Errorf("failed to create view: %w", err)
	}

	return nil
}

// GetByID retrieves a view by ID
func (r *ViewRepository) GetByID(ctx context.Context, projectID, viewID string) (*models.SavedView, error) {
	query := `
		SELECT * FROM saved_views
		WHERE id = $1 AND project_id = $2
	`

	var view models.SavedView
	err := r.db.GetContext(ctx, &view, query, viewID, projectID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("view not found")
		}
		return nil, fmt.Errorf("failed to get view: %w", err)
	}

	return &view, nil
}

// List retrieves all views for a project
func (r *ViewRepository) List(ctx context.Context, projectID string, ownerUserID *string) ([]*models.SavedView, error) {
	query := `
		SELECT * FROM saved_views
		WHERE project_id = $1
			AND (scope = 'shared' OR owner_user_id = $2)
		ORDER BY name ASC
	`

	var views []*models.SavedView
	err := r.db.SelectContext(ctx, &views, query, projectID, ownerUserID)
	if err != nil {
		return nil, fmt.Errorf("failed to list views: %w", err)
	}

	return views, nil
}

// Update updates an existing view
func (r *ViewRepository) Update(ctx context.Context, view *models.SavedView) error {
	query := `
		UPDATE saved_views SET
			name = :name,
			description = :description,
			scope = :scope,
			raw_query = :raw_query,
			normalized_query = :normalized_query,
			presentation = :presentation,
			updated_at = NOW()
		WHERE id = :id AND project_id = :project_id
	`

	result, err := r.db.NamedExecContext(ctx, query, view)
	if err != nil {
		return fmt.Errorf("failed to update view: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("view not found")
	}

	return nil
}

// Delete deletes a view
func (r *ViewRepository) Delete(ctx context.Context, projectID, viewID string) error {
	query := `
		DELETE FROM saved_views
		WHERE id = $1 AND project_id = $2
	`

	result, err := r.db.ExecContext(ctx, query, viewID, projectID)
	if err != nil {
		return fmt.Errorf("failed to delete view: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("view not found")
	}

	return nil
}

// IncrementUseCount increments the use count of a view
func (r *ViewRepository) IncrementUseCount(ctx context.Context, viewID string) error {
	query := `
		UPDATE saved_views SET
			use_count = use_count + 1,
			last_used_at = NOW()
		WHERE id = $1
	`

	_, err := r.db.ExecContext(ctx, query, viewID)
	return err
}

// ExecuteQuery executes a saved view's query and returns tasks
func (r *ViewRepository) ExecuteQuery(ctx context.Context, sql string, args []interface{}) ([]*models.Task, error) {
	var tasks []*models.Task
	err := r.db.SelectContext(ctx, &tasks, sql, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to execute query: %w", err)
	}

	return tasks, nil
}
