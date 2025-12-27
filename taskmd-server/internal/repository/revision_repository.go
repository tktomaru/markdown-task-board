package repository

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/tktomaru/taskai/taskai-server/internal/models"
)

// RevisionRepository handles task revision data access
type RevisionRepository struct {
	db *sqlx.DB
}

// NewRevisionRepository creates a new revision repository
func NewRevisionRepository(db *sqlx.DB) *RevisionRepository {
	return &RevisionRepository{db: db}
}

// GetTaskRevisions retrieves all revisions for a task
func (r *RevisionRepository) GetTaskRevisions(ctx context.Context, taskID string, limit int) ([]*models.TaskRevision, error) {
	if limit == 0 {
		limit = 50
	}

	query := `
		SELECT * FROM task_revisions
		WHERE task_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`

	var revisions []*models.TaskRevision
	err := r.db.SelectContext(ctx, &revisions, query, taskID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get revisions: %w", err)
	}

	return revisions, nil
}

// GetRevisionByID retrieves a specific revision
func (r *RevisionRepository) GetRevisionByID(ctx context.Context, revID int64) (*models.TaskRevision, error) {
	query := `
		SELECT * FROM task_revisions
		WHERE rev_id = $1
	`

	var revision models.TaskRevision
	err := r.db.GetContext(ctx, &revision, query, revID)
	if err != nil {
		return nil, fmt.Errorf("failed to get revision: %w", err)
	}

	return &revision, nil
}

// GetRevisionCount returns the total number of revisions for a task
func (r *RevisionRepository) GetRevisionCount(ctx context.Context, taskID string) (int, error) {
	query := `
		SELECT COUNT(*) FROM task_revisions
		WHERE task_id = $1
	`

	var count int
	err := r.db.GetContext(ctx, &count, query, taskID)
	if err != nil {
		return 0, fmt.Errorf("failed to count revisions: %w", err)
	}

	return count, nil
}

// GetLatestRevision retrieves the latest revision for a task
func (r *RevisionRepository) GetLatestRevision(ctx context.Context, taskID string) (*models.TaskRevision, error) {
	query := `
		SELECT * FROM task_revisions
		WHERE task_id = $1
		ORDER BY created_at DESC
		LIMIT 1
	`

	var revision models.TaskRevision
	err := r.db.GetContext(ctx, &revision, query, taskID)
	if err != nil {
		return nil, fmt.Errorf("failed to get latest revision: %w", err)
	}

	return &revision, nil
}
