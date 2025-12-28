package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/tktomaru/taskai/taskai-server/internal/models"
)

// TaskRepository handles task data access
type TaskRepository struct {
	db *sqlx.DB
}

// NewTaskRepository creates a new task repository
func NewTaskRepository(db *sqlx.DB) *TaskRepository {
	return &TaskRepository{db: db}
}

// Create creates a new task
func (r *TaskRepository) Create(ctx context.Context, task *models.Task) error {
	query := `
		INSERT INTO tasks (
			id, project_id, parent_id, title, status, priority,
			assignees, labels, start_date, due_date,
			markdown_body, extra_meta, created_by, updated_by
		) VALUES (
			:id, :project_id, :parent_id, :title, :status, :priority,
			:assignees, :labels, :start_date, :due_date,
			:markdown_body, :extra_meta, :created_by, :updated_by
		)
	`

	_, err := r.db.NamedExecContext(ctx, query, task)
	if err != nil {
		return fmt.Errorf("failed to create task: %w", err)
	}

	return nil
}

// GetByID retrieves a task by ID
func (r *TaskRepository) GetByID(ctx context.Context, projectID, taskID string) (*models.Task, error) {
	query := `
		SELECT * FROM tasks
		WHERE id = $1 AND project_id = $2 AND archived_at IS NULL
	`

	var task models.Task
	err := r.db.GetContext(ctx, &task, query, taskID, projectID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("task not found")
		}
		return nil, fmt.Errorf("failed to get task: %w", err)
	}

	return &task, nil
}

// List retrieves all tasks for a project
func (r *TaskRepository) List(ctx context.Context, projectID string, filters *TaskFilters) ([]*models.Task, error) {
	query := `
		SELECT * FROM tasks
		WHERE project_id = $1 AND archived_at IS NULL
	`
	args := []interface{}{projectID}
	argCount := 1

	// Apply filters
	if filters != nil {
		if len(filters.Statuses) > 0 {
			argCount++
			query += fmt.Sprintf(" AND status = ANY($%d)", argCount)
			args = append(args, filters.Statuses)
		}

		if len(filters.Priorities) > 0 {
			argCount++
			query += fmt.Sprintf(" AND priority = ANY($%d)", argCount)
			args = append(args, filters.Priorities)
		}

		if len(filters.Assignees) > 0 {
			argCount++
			query += fmt.Sprintf(" AND assignees && $%d", argCount)
			args = append(args, filters.Assignees)
		}

		if len(filters.Labels) > 0 {
			argCount++
			query += fmt.Sprintf(" AND labels && $%d", argCount)
			args = append(args, filters.Labels)
		}
	}

	// Default ordering
	query += " ORDER BY created_at DESC"

	// Apply limit
	if filters != nil && filters.Limit > 0 {
		argCount++
		query += fmt.Sprintf(" LIMIT $%d", argCount)
		args = append(args, filters.Limit)
	}

	var tasks []*models.Task
	err := r.db.SelectContext(ctx, &tasks, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list tasks: %w", err)
	}

	return tasks, nil
}

// Update updates an existing task
func (r *TaskRepository) Update(ctx context.Context, task *models.Task) error {
	query := `
		UPDATE tasks SET
			parent_id = :parent_id,
			title = :title,
			status = :status,
			priority = :priority,
			assignees = :assignees,
			labels = :labels,
			start_date = :start_date,
			due_date = :due_date,
			markdown_body = :markdown_body,
			extra_meta = :extra_meta,
			updated_by = :updated_by,
			updated_at = NOW()
		WHERE id = :id AND project_id = :project_id
	`

	result, err := r.db.NamedExecContext(ctx, query, task)
	if err != nil {
		return fmt.Errorf("failed to update task: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("task not found")
	}

	return nil
}

// Delete soft-deletes a task (sets archived_at)
func (r *TaskRepository) Delete(ctx context.Context, projectID, taskID string) error {
	query := `
		UPDATE tasks SET archived_at = NOW()
		WHERE id = $1 AND project_id = $2 AND archived_at IS NULL
	`

	result, err := r.db.ExecContext(ctx, query, taskID, projectID)
	if err != nil {
		return fmt.Errorf("failed to delete task: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("task not found")
	}

	return nil
}

// Search performs full-text search on tasks
func (r *TaskRepository) Search(ctx context.Context, projectID, searchQuery string, limit int) ([]*models.Task, error) {
	query := `
		SELECT * FROM tasks
		WHERE project_id = $1
			AND archived_at IS NULL
			AND search_vector @@ to_tsquery('english', $2)
		ORDER BY ts_rank(search_vector, to_tsquery('english', $2)) DESC
		LIMIT $3
	`

	var tasks []*models.Task
	err := r.db.SelectContext(ctx, &tasks, query, projectID, searchQuery, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to search tasks: %w", err)
	}

	return tasks, nil
}

// TaskFilters represents filters for task listing
type TaskFilters struct {
	Statuses   []string
	Priorities []string
	Assignees  []string
	Labels     []string
	Limit      int
}
