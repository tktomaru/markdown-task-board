package query

import (
	"testing"
)

func TestQueryParser_Parse(t *testing.T) {
	tests := []struct {
		name       string
		queryStr   string
		wantErr    bool
		wantFilter int // expected number of filters
	}{
		{
			name:       "simple field filter",
			queryStr:   "status:open",
			wantErr:    false,
			wantFilter: 1,
		},
		{
			name:       "multiple filters",
			queryStr:   "status:open priority:P1 assignee:user1",
			wantErr:    false,
			wantFilter: 3,
		},
		{
			name:       "negated filter",
			queryStr:   "-status:done",
			wantErr:    false,
			wantFilter: 1,
		},
		{
			name:       "in operator",
			queryStr:   "status:(open in_progress)",
			wantErr:    false,
			wantFilter: 1,
		},
		{
			name:       "date comparison",
			queryStr:   "due:>2024-01-01",
			wantErr:    false,
			wantFilter: 1,
		},
		{
			name:       "relative date",
			queryStr:   "due:today",
			wantErr:    false,
			wantFilter: 1,
		},
		{
			name:       "complex query",
			queryStr:   "status:open priority:(P0 P1) -assignee:user1 due:this_week",
			wantErr:    false,
			wantFilter: 4,
		},
		{
			name:       "empty query",
			queryStr:   "",
			wantErr:    false,
			wantFilter: 0,
		},
		{
			name:       "with sort",
			queryStr:   "status:open sort:priority",
			wantErr:    false,
			wantFilter: 1,
		},
		{
			name:       "with limit",
			queryStr:   "status:open limit:10",
			wantErr:    false,
			wantFilter: 1,
		},
	}

	parser := NewQueryParser()

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := parser.Parse(tt.queryStr)

			if (err != nil) != tt.wantErr {
				t.Errorf("Parse() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr && len(result.Filters) != tt.wantFilter {
				t.Errorf("Parse() got %d filters, want %d", len(result.Filters), tt.wantFilter)
			}
		})
	}
}

func TestFilter_Validation(t *testing.T) {
	parser := NewQueryParser()

	tests := []struct {
		name    string
		query   string
		wantErr bool
	}{
		{
			name:    "valid status filter",
			query:   "status:open",
			wantErr: false,
		},
		{
			name:    "valid priority filter",
			query:   "priority:P1",
			wantErr: false,
		},
		{
			name:    "valid assignee filter",
			query:   "assignee:user1",
			wantErr: false,
		},
		{
			name:    "valid date filter",
			query:   "due:2024-12-31",
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := parser.Parse(tt.query)
			if (err != nil) != tt.wantErr {
				t.Errorf("Parse() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
