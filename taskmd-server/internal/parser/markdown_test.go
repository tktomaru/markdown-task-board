package parser

import (
	"testing"
)

func TestMarkdownParser_Parse(t *testing.T) {
	tests := []struct {
		name        string
		markdown    string
		wantErr     bool
		wantTitle   string
		wantID      string
		wantStatus  string
		wantPriority string
	}{
		{
			name: "valid task",
			markdown: `## T-1042: Markdownタスクのパーサ実装

` + "```yaml" + `
id: T-1042
status: open
priority: P1
assignees: [taku]
start: 2025-12-27
due: 2026-01-05
labels: [backend, parser]
` + "```" + `

### Background

We need a robust parser for task markdown.

### Tasks

1. Parse YAML frontmatter
2. Extract metadata

### Acceptance Criteria

- [ ] Parse YAML correctly
- [ ] Handle errors gracefully
`,
			wantErr:      false,
			wantTitle:    "Markdownタスクのパーサ実装",
			wantID:       "T-1042",
			wantStatus:   "open",
			wantPriority: "P1",
		},
		{
			name: "missing title",
			markdown: `
` + "```yaml" + `
id: T-1042
status: open
priority: P1
` + "```" + `

Body text
`,
			wantErr: true,
		},
		{
			name: "missing YAML",
			markdown: `## T-1042: Test Task

Body without YAML
`,
			wantErr: true,
		},
		{
			name: "invalid status",
			markdown: `## T-1042: Test Task

` + "```yaml" + `
id: T-1042
status: invalid_status
priority: P1
` + "```" + `

Body
`,
			wantErr: true,
		},
		{
			name: "invalid priority",
			markdown: `## T-1042: Test Task

` + "```yaml" + `
id: T-1042
status: open
priority: P99
` + "```" + `

Body
`,
			wantErr: true,
		},
	}

	parser := NewMarkdownParser()

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := parser.Parse(tt.markdown)

			if (err != nil) != tt.wantErr {
				t.Errorf("Parse() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				if result.Title != tt.wantTitle {
					t.Errorf("Parse() title = %v, want %v", result.Title, tt.wantTitle)
				}
				if result.Metadata.ID != tt.wantID {
					t.Errorf("Parse() id = %v, want %v", result.Metadata.ID, tt.wantID)
				}
				if result.Metadata.Status != tt.wantStatus {
					t.Errorf("Parse() status = %v, want %v", result.Metadata.Status, tt.wantStatus)
				}
				if result.Metadata.Priority != tt.wantPriority {
					t.Errorf("Parse() priority = %v, want %v", result.Metadata.Priority, tt.wantPriority)
				}
			}
		})
	}
}

func TestExtractAcceptanceCriteria(t *testing.T) {
	markdown := `## T-1042: Test

` + "```yaml" + `
id: T-1042
status: open
priority: P1
` + "```" + `

### Acceptance Criteria

- [ ] First criterion
- [x] Second criterion (completed)
- [ ] Third criterion

Some other text

- [ ] Fourth criterion
`

	criteria := ExtractAcceptanceCriteria(markdown)

	expectedCount := 4
	if len(criteria) != expectedCount {
		t.Errorf("ExtractAcceptanceCriteria() got %d criteria, want %d", len(criteria), expectedCount)
	}

	expected := []string{
		"First criterion",
		"Second criterion (completed)",
		"Third criterion",
		"Fourth criterion",
	}

	for i, want := range expected {
		if i >= len(criteria) {
			break
		}
		if criteria[i] != want {
			t.Errorf("ExtractAcceptanceCriteria() criterion[%d] = %v, want %v", i, criteria[i], want)
		}
	}
}
