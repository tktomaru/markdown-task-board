package query

import (
	"strings"
	"testing"
)

func TestSQLBuilder_Build(t *testing.T) {
	tests := []struct {
		name        string
		query       *ParsedQuery
		projectID   string
		wantContain []string // SQL parts that should be present
		wantParams  int      // expected number of parameters
	}{
		{
			name: "simple equality filter",
			query: &ParsedQuery{
				Filters: []Filter{
					{Key: "status", Operator: "=", Value: "open"},
				},
			},
			projectID:   "project-1",
			wantContain: []string{"SELECT", "FROM tasks", "WHERE", "project_id", "status"},
			wantParams:  2, // project_id + status
		},
		{
			name: "negated filter",
			query: &ParsedQuery{
				Filters: []Filter{
					{Key: "status", Operator: "=", Value: "done", Negate: true},
				},
			},
			projectID:   "project-1",
			wantContain: []string{"SELECT", "FROM tasks", "status", "!="},
			wantParams:  2,
		},
		{
			name: "multiple filters",
			query: &ParsedQuery{
				Filters: []Filter{
					{Key: "status", Operator: "=", Value: "open"},
					{Key: "priority", Operator: "=", Value: "P1"},
				},
			},
			projectID:   "project-1",
			wantContain: []string{"SELECT", "FROM tasks", "status", "priority", "AND"},
			wantParams:  3, // project_id + status + priority
		},
		{
			name: "with sorting",
			query: &ParsedQuery{
				Filters: []Filter{
					{Key: "status", Operator: "=", Value: "open"},
				},
				Sort: &SortOption{
					Field: "priority",
					Order: "asc",
				},
			},
			projectID:   "project-1",
			wantContain: []string{"ORDER BY", "priority"},
			wantParams:  2,
		},
		{
			name: "with limit",
			query: &ParsedQuery{
				Filters: []Filter{
					{Key: "status", Operator: "=", Value: "open"},
				},
				Limit: 10,
			},
			projectID:   "project-1",
			wantContain: []string{"LIMIT"},
			wantParams:  3, // project_id + status + limit
		},
	}

	builder := NewSQLBuilder()

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := builder.Build(tt.projectID, tt.query)

			if err != nil {
				t.Errorf("Build() unexpected error: %v", err)
				return
			}

			// Check that all expected parts are present
			for _, part := range tt.wantContain {
				if !strings.Contains(result.SQL, part) {
					t.Errorf("Build() SQL does not contain %q\nGot: %s", part, result.SQL)
				}
			}

			// Check parameter count
			if len(result.Args) != tt.wantParams {
				t.Errorf("Build() got %d params, want %d", len(result.Args), tt.wantParams)
			}

			// Check first param is project ID
			if result.Args[0] != tt.projectID {
				t.Errorf("Build() first param = %v, want %v", result.Args[0], tt.projectID)
			}
		})
	}
}

func TestSQLBuilder_DefaultSorting(t *testing.T) {
	builder := NewSQLBuilder()

	query := &ParsedQuery{
		Filters: []Filter{
			{Key: "status", Operator: "=", Value: "open"},
		},
		// No Sort specified
	}

	result, err := builder.Build("project-1", query)
	if err != nil {
		t.Fatalf("Build() error: %v", err)
	}

	// Should include default sorting
	if !strings.Contains(result.SQL, "ORDER BY") {
		t.Error("Build() missing default ORDER BY clause")
	}

	if !strings.Contains(result.SQL, "created_at") {
		t.Error("Build() default sort should use created_at")
	}
}

func TestSQLBuilder_ArchivedFilter(t *testing.T) {
	builder := NewSQLBuilder()

	query := &ParsedQuery{
		Filters: []Filter{
			{Key: "status", Operator: "=", Value: "open"},
		},
	}

	result, err := builder.Build("project-1", query)
	if err != nil {
		t.Fatalf("Build() error: %v", err)
	}

	// Should always filter out archived tasks
	if !strings.Contains(result.SQL, "archived_at IS NULL") {
		t.Error("Build() should filter archived tasks by default")
	}
}

func TestSQLBuilder_ParameterOrdering(t *testing.T) {
	builder := NewSQLBuilder()

	query := &ParsedQuery{
		Filters: []Filter{
			{Key: "status", Operator: "=", Value: "open"},
			{Key: "priority", Operator: "=", Value: "P1"},
		},
		Limit: 5,
	}

	result, err := builder.Build("test-project", query)
	if err != nil {
		t.Fatalf("Build() error: %v", err)
	}

	// Check parameter values and order
	expectedArgs := []interface{}{"test-project", "open", "P1", 5}

	if len(result.Args) != len(expectedArgs) {
		t.Fatalf("Build() got %d args, want %d", len(result.Args), len(expectedArgs))
	}

	for i, want := range expectedArgs {
		if result.Args[i] != want {
			t.Errorf("Build() args[%d] = %v, want %v", i, result.Args[i], want)
		}
	}
}
