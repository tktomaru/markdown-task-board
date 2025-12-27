package service

import (
	"testing"

	"github.com/tktomaru/taskai/taskai-server/internal/models"
)

func TestRevisionService_CalculateChanges(t *testing.T) {
	service := &RevisionService{}

	tests := []struct {
		name        string
		oldRev      *models.TaskRevision
		newRev      *models.TaskRevision
		wantChanges int
	}{
		{
			name: "no changes",
			oldRev: &models.TaskRevision{
				TaskID:       "TASK-001",
				MarkdownBody: "Same content",
				MetaSnapshot: models.JSONB{
					"title":    "Test Task",
					"status":   "open",
					"priority": "P1",
				},
			},
			newRev: &models.TaskRevision{
				TaskID:       "TASK-001",
				MarkdownBody: "Same content",
				MetaSnapshot: models.JSONB{
					"title":    "Test Task",
					"status":   "open",
					"priority": "P1",
				},
			},
			wantChanges: 0,
		},
		{
			name: "markdown body changed",
			oldRev: &models.TaskRevision{
				TaskID:       "TASK-001",
				MarkdownBody: "Old content",
				MetaSnapshot: models.JSONB{
					"title": "Test Task",
				},
			},
			newRev: &models.TaskRevision{
				TaskID:       "TASK-001",
				MarkdownBody: "New content",
				MetaSnapshot: models.JSONB{
					"title": "Test Task",
				},
			},
			wantChanges: 1,
		},
		{
			name: "metadata field changed",
			oldRev: &models.TaskRevision{
				TaskID:       "TASK-001",
				MarkdownBody: "Content",
				MetaSnapshot: models.JSONB{
					"status": "open",
				},
			},
			newRev: &models.TaskRevision{
				TaskID:       "TASK-001",
				MarkdownBody: "Content",
				MetaSnapshot: models.JSONB{
					"status": "done",
				},
			},
			wantChanges: 1,
		},
		{
			name: "field added",
			oldRev: &models.TaskRevision{
				TaskID:       "TASK-001",
				MarkdownBody: "Content",
				MetaSnapshot: models.JSONB{
					"status": "open",
				},
			},
			newRev: &models.TaskRevision{
				TaskID:       "TASK-001",
				MarkdownBody: "Content",
				MetaSnapshot: models.JSONB{
					"status":   "open",
					"priority": "P1",
				},
			},
			wantChanges: 1,
		},
		{
			name: "field removed",
			oldRev: &models.TaskRevision{
				TaskID:       "TASK-001",
				MarkdownBody: "Content",
				MetaSnapshot: models.JSONB{
					"status":   "open",
					"priority": "P1",
				},
			},
			newRev: &models.TaskRevision{
				TaskID:       "TASK-001",
				MarkdownBody: "Content",
				MetaSnapshot: models.JSONB{
					"status": "open",
				},
			},
			wantChanges: 1,
		},
		{
			name: "multiple changes",
			oldRev: &models.TaskRevision{
				TaskID:       "TASK-001",
				MarkdownBody: "Old content",
				MetaSnapshot: models.JSONB{
					"title":    "Old Title",
					"status":   "open",
					"priority": "P1",
				},
			},
			newRev: &models.TaskRevision{
				TaskID:       "TASK-001",
				MarkdownBody: "New content",
				MetaSnapshot: models.JSONB{
					"title":    "New Title",
					"status":   "done",
					"priority": "P1",
				},
			},
			wantChanges: 3, // markdown_body + title + status
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			changes := service.calculateChanges(tt.oldRev, tt.newRev)

			if len(changes) != tt.wantChanges {
				t.Errorf("calculateChanges() got %d changes, want %d", len(changes), tt.wantChanges)
				for _, c := range changes {
					t.Logf("Change: field=%s, type=%s, old=%v, new=%v", c.Field, c.Type, c.OldValue, c.NewValue)
				}
			}
		})
	}
}

func TestRevisionService_ValuesEqual(t *testing.T) {
	service := &RevisionService{}

	tests := []struct {
		name  string
		a     interface{}
		b     interface{}
		equal bool
	}{
		{
			name:  "equal strings",
			a:     "test",
			b:     "test",
			equal: true,
		},
		{
			name:  "different strings",
			a:     "test1",
			b:     "test2",
			equal: false,
		},
		{
			name:  "equal numbers",
			a:     123,
			b:     123,
			equal: true,
		},
		{
			name:  "different numbers",
			a:     123,
			b:     456,
			equal: false,
		},
		{
			name:  "nil vs value",
			a:     nil,
			b:     "test",
			equal: false,
		},
		{
			name:  "both nil",
			a:     nil,
			b:     nil,
			equal: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.valuesEqual(tt.a, tt.b)
			if result != tt.equal {
				t.Errorf("valuesEqual() = %v, want %v", result, tt.equal)
			}
		})
	}
}

func TestRevisionService_GenerateTextDiff(t *testing.T) {
	service := &RevisionService{}

	tests := []struct {
		name         string
		oldText      string
		newText      string
		wantContains []string
	}{
		{
			name:    "no changes",
			oldText: "Line 1\nLine 2\nLine 3",
			newText: "Line 1\nLine 2\nLine 3",
			wantContains: []string{
				"--- Old",
				"+++ New",
				"  Line 1",
				"  Line 2",
				"  Line 3",
			},
		},
		{
			name:    "line changed",
			oldText: "Line 1\nOld Line\nLine 3",
			newText: "Line 1\nNew Line\nLine 3",
			wantContains: []string{
				"- Old Line",
				"+ New Line",
			},
		},
		{
			name:    "line added",
			oldText: "Line 1\nLine 2",
			newText: "Line 1\nLine 2\nLine 3",
			wantContains: []string{
				"+ Line 3",
			},
		},
		{
			name:    "line removed",
			oldText: "Line 1\nLine 2\nLine 3",
			newText: "Line 1\nLine 3",
			wantContains: []string{
				"- Line 2",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			diff := service.GenerateTextDiff(tt.oldText, tt.newText)

			for _, want := range tt.wantContains {
				if !contains(diff, want) {
					t.Errorf("GenerateTextDiff() missing expected part: %q\nGot:\n%s", want, diff)
				}
			}
		})
	}
}

// Helper function to check if a string contains a substring
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > len(substr) && containsHelper(s, substr))
}

func containsHelper(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func TestFieldChange_Type(t *testing.T) {
	tests := []struct {
		name      string
		change    FieldChange
		wantType  string
		wantField string
	}{
		{
			name: "modified field",
			change: FieldChange{
				Field:    "status",
				OldValue: "open",
				NewValue: "done",
				Type:     "modified",
			},
			wantType:  "modified",
			wantField: "status",
		},
		{
			name: "added field",
			change: FieldChange{
				Field:    "priority",
				OldValue: nil,
				NewValue: "P1",
				Type:     "added",
			},
			wantType:  "added",
			wantField: "priority",
		},
		{
			name: "removed field",
			change: FieldChange{
				Field:    "assignee",
				OldValue: "user1",
				NewValue: nil,
				Type:     "removed",
			},
			wantType:  "removed",
			wantField: "assignee",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.change.Type != tt.wantType {
				t.Errorf("FieldChange.Type = %v, want %v", tt.change.Type, tt.wantType)
			}
			if tt.change.Field != tt.wantField {
				t.Errorf("FieldChange.Field = %v, want %v", tt.change.Field, tt.wantField)
			}
		})
	}
}
