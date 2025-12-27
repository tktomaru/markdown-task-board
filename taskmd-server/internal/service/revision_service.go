package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/tktomaru/taskai/taskai-server/internal/models"
	"github.com/tktomaru/taskai/taskai-server/internal/repository"
)

// RevisionService handles revision business logic
type RevisionService struct {
	revisionRepo *repository.RevisionRepository
	taskRepo     *repository.TaskRepository
}

// NewRevisionService creates a new revision service
func NewRevisionService(revisionRepo *repository.RevisionRepository, taskRepo *repository.TaskRepository) *RevisionService {
	return &RevisionService{
		revisionRepo: revisionRepo,
		taskRepo:     taskRepo,
	}
}

// RevisionResponse represents a revision with additional metadata
type RevisionResponse struct {
	Revision      *models.TaskRevision `json:"revision"`
	RevisionIndex int                  `json:"revision_index"` // 1-based index (1 = oldest, N = newest)
	TotalCount    int                  `json:"total_count"`
}

// RevisionDiff represents differences between two revisions
type RevisionDiff struct {
	OldRevision *models.TaskRevision `json:"old_revision"`
	NewRevision *models.TaskRevision `json:"new_revision"`
	Changes     []FieldChange        `json:"changes"`
}

// FieldChange represents a change in a specific field
type FieldChange struct {
	Field    string      `json:"field"`
	OldValue interface{} `json:"old_value"`
	NewValue interface{} `json:"new_value"`
	Type     string      `json:"type"` // "modified", "added", "removed"
}

// GetTaskRevisions retrieves all revisions for a task
func (s *RevisionService) GetTaskRevisions(ctx context.Context, taskID string, limit int) ([]*RevisionResponse, error) {
	revisions, err := s.revisionRepo.GetTaskRevisions(ctx, taskID, limit)
	if err != nil {
		return nil, err
	}

	totalCount, err := s.revisionRepo.GetRevisionCount(ctx, taskID)
	if err != nil {
		totalCount = len(revisions)
	}

	// Build response with indexes (oldest = 1, newest = N)
	responses := make([]*RevisionResponse, len(revisions))
	for i, rev := range revisions {
		responses[i] = &RevisionResponse{
			Revision:      rev,
			RevisionIndex: totalCount - i,
			TotalCount:    totalCount,
		}
	}

	return responses, nil
}

// GetRevision retrieves a specific revision
func (s *RevisionService) GetRevision(ctx context.Context, revID int64) (*models.TaskRevision, error) {
	return s.revisionRepo.GetRevisionByID(ctx, revID)
}

// CompareRevisions compares two revisions and returns the differences
func (s *RevisionService) CompareRevisions(ctx context.Context, oldRevID, newRevID int64) (*RevisionDiff, error) {
	oldRev, err := s.revisionRepo.GetRevisionByID(ctx, oldRevID)
	if err != nil {
		return nil, fmt.Errorf("failed to get old revision: %w", err)
	}

	newRev, err := s.revisionRepo.GetRevisionByID(ctx, newRevID)
	if err != nil {
		return nil, fmt.Errorf("failed to get new revision: %w", err)
	}

	if oldRev.TaskID != newRev.TaskID {
		return nil, fmt.Errorf("revisions belong to different tasks")
	}

	changes := s.calculateChanges(oldRev, newRev)

	return &RevisionDiff{
		OldRevision: oldRev,
		NewRevision: newRev,
		Changes:     changes,
	}, nil
}

// CompareWithCurrent compares a revision with the current task state
func (s *RevisionService) CompareWithCurrent(ctx context.Context, projectID, taskID string, revID int64) (*RevisionDiff, error) {
	oldRev, err := s.revisionRepo.GetRevisionByID(ctx, revID)
	if err != nil {
		return nil, fmt.Errorf("failed to get revision: %w", err)
	}

	currentTask, err := s.taskRepo.GetByID(ctx, projectID, taskID)
	if err != nil {
		return nil, fmt.Errorf("failed to get current task: %w", err)
	}

	// Convert current task to revision format for comparison
	currentRev := &models.TaskRevision{
		TaskID:       currentTask.ID,
		MarkdownBody: currentTask.MarkdownBody,
		MetaSnapshot: make(models.JSONB),
	}

	// Build meta snapshot
	currentRev.MetaSnapshot["title"] = currentTask.Title
	currentRev.MetaSnapshot["status"] = currentTask.Status
	currentRev.MetaSnapshot["priority"] = currentTask.Priority
	currentRev.MetaSnapshot["assignees"] = currentTask.Assignees
	currentRev.MetaSnapshot["labels"] = currentTask.Labels
	if currentTask.DueDate != nil {
		currentRev.MetaSnapshot["due_date"] = currentTask.DueDate
	}
	if currentTask.StartDate != nil {
		currentRev.MetaSnapshot["start_date"] = currentTask.StartDate
	}

	changes := s.calculateChanges(oldRev, currentRev)

	return &RevisionDiff{
		OldRevision: oldRev,
		NewRevision: currentRev,
		Changes:     changes,
	}, nil
}

// calculateChanges calculates the changes between two revisions
func (s *RevisionService) calculateChanges(oldRev, newRev *models.TaskRevision) []FieldChange {
	var changes []FieldChange

	// Compare markdown body
	if oldRev.MarkdownBody != newRev.MarkdownBody {
		changes = append(changes, FieldChange{
			Field:    "markdown_body",
			OldValue: oldRev.MarkdownBody,
			NewValue: newRev.MarkdownBody,
			Type:     "modified",
		})
	}

	// Compare metadata fields
	metaFields := []string{"title", "status", "priority", "assignees", "labels", "due_date", "start_date"}

	for _, field := range metaFields {
		oldVal, oldExists := oldRev.MetaSnapshot[field]
		newVal, newExists := newRev.MetaSnapshot[field]

		if !oldExists && newExists {
			changes = append(changes, FieldChange{
				Field:    field,
				OldValue: nil,
				NewValue: newVal,
				Type:     "added",
			})
		} else if oldExists && !newExists {
			changes = append(changes, FieldChange{
				Field:    field,
				OldValue: oldVal,
				NewValue: nil,
				Type:     "removed",
			})
		} else if oldExists && newExists {
			// Compare values
			if !s.valuesEqual(oldVal, newVal) {
				changes = append(changes, FieldChange{
					Field:    field,
					OldValue: oldVal,
					NewValue: newVal,
					Type:     "modified",
				})
			}
		}
	}

	return changes
}

// valuesEqual compares two values for equality
func (s *RevisionService) valuesEqual(a, b interface{}) bool {
	// Simple string comparison for now
	return fmt.Sprint(a) == fmt.Sprint(b)
}

// GenerateTextDiff generates a unified diff for markdown body changes
func (s *RevisionService) GenerateTextDiff(oldText, newText string) string {
	// Simple line-by-line diff
	oldLines := strings.Split(oldText, "\n")
	newLines := strings.Split(newText, "\n")

	var diff strings.Builder
	diff.WriteString("--- Old\n")
	diff.WriteString("+++ New\n")

	// Very simple diff implementation
	maxLen := len(oldLines)
	if len(newLines) > maxLen {
		maxLen = len(newLines)
	}

	for i := 0; i < maxLen; i++ {
		var oldLine, newLine string
		if i < len(oldLines) {
			oldLine = oldLines[i]
		}
		if i < len(newLines) {
			newLine = newLines[i]
		}

		if oldLine != newLine {
			if oldLine != "" {
				diff.WriteString(fmt.Sprintf("- %s\n", oldLine))
			}
			if newLine != "" {
				diff.WriteString(fmt.Sprintf("+ %s\n", newLine))
			}
		} else {
			diff.WriteString(fmt.Sprintf("  %s\n", oldLine))
		}
	}

	return diff.String()
}
