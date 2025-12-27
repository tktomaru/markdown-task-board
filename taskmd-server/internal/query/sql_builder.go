package query

import (
	"fmt"
	"strings"
)

// SQLBuilder builds SQL queries from parsed queries
type SQLBuilder struct{}

// NewSQLBuilder creates a new SQL builder
func NewSQLBuilder() *SQLBuilder {
	return &SQLBuilder{}
}

// BuildResult represents the result of building a SQL query
type BuildResult struct {
	SQL  string
	Args []interface{}
}

// Build builds a SQL query from a parsed query
func (b *SQLBuilder) Build(projectID string, parsed *ParsedQuery) (*BuildResult, error) {
	result := &BuildResult{
		Args: []interface{}{projectID},
	}

	// Base query
	query := "SELECT * FROM tasks WHERE project_id = $1 AND archived_at IS NULL"
	argCount := 1

	// Apply filters
	for _, filter := range parsed.Filters {
		condition, args, err := b.buildFilterCondition(filter, &argCount)
		if err != nil {
			return nil, err
		}

		query += " AND " + condition
		result.Args = append(result.Args, args...)
	}

	// Apply sorting
	if parsed.Sort != nil {
		orderClause := b.buildOrderClause(parsed.Sort)
		query += " " + orderClause
	} else {
		// Default sorting
		query += " ORDER BY created_at DESC"
	}

	// Apply limit
	if parsed.Limit > 0 {
		argCount++
		query += fmt.Sprintf(" LIMIT $%d", argCount)
		result.Args = append(result.Args, parsed.Limit)
	}

	result.SQL = query
	return result, nil
}

// buildFilterCondition builds a SQL condition for a filter
func (b *SQLBuilder) buildFilterCondition(filter Filter, argCount *int) (string, []interface{}, error) {
	var args []interface{}

	// Map filter keys to database columns
	dbColumn := b.mapFilterKeyToColumn(filter.Key)

	switch filter.Operator {
	case "=":
		*argCount++
		condition := fmt.Sprintf("%s = $%d", dbColumn, *argCount)
		if filter.Negate {
			condition = fmt.Sprintf("%s != $%d", dbColumn, *argCount)
		}
		args = append(args, filter.Value)
		return condition, args, nil

	case "!=":
		*argCount++
		condition := fmt.Sprintf("%s != $%d", dbColumn, *argCount)
		if filter.Negate {
			condition = fmt.Sprintf("%s = $%d", dbColumn, *argCount)
		}
		args = append(args, filter.Value)
		return condition, args, nil

	case ">", "<", ">=", "<=":
		*argCount++
		operator := filter.Operator
		if filter.Negate {
			// Negate the operator
			switch operator {
			case ">":
				operator = "<="
			case "<":
				operator = ">="
			case ">=":
				operator = "<"
			case "<=":
				operator = ">"
			}
		}
		condition := fmt.Sprintf("%s %s $%d", dbColumn, operator, *argCount)
		args = append(args, filter.Value)
		return condition, args, nil

	case "in":
		// For array fields or multiple values
		values, ok := filter.Value.([]string)
		if !ok {
			return "", nil, fmt.Errorf("invalid value type for 'in' operator")
		}

		if b.isArrayField(filter.Key) {
			// Array overlap (e.g., assignees, labels)
			*argCount++
			condition := fmt.Sprintf("%s && $%d", dbColumn, *argCount)
			if filter.Negate {
				condition = fmt.Sprintf("NOT (%s && $%d)", dbColumn, *argCount)
			}
			args = append(args, values)
			return condition, args, nil
		} else {
			// Multiple values (OR)
			*argCount++
			condition := fmt.Sprintf("%s = ANY($%d)", dbColumn, *argCount)
			if filter.Negate {
				condition = fmt.Sprintf("%s != ALL($%d)", dbColumn, *argCount)
			}
			args = append(args, values)
			return condition, args, nil
		}

	default:
		return "", nil, fmt.Errorf("unsupported operator: %s", filter.Operator)
	}
}

// buildOrderClause builds an ORDER BY clause
func (b *SQLBuilder) buildOrderClause(sort *SortOption) string {
	dbColumn := b.mapFilterKeyToColumn(sort.Field)
	order := strings.ToUpper(sort.Order)

	// Handle special cases
	if sort.Field == "priority" {
		// Priority should be P0, P1, P2, P3, P4
		if order == "DESC" {
			return "ORDER BY priority ASC" // P0 first
		}
		return "ORDER BY priority DESC" // P4 first
	}

	return fmt.Sprintf("ORDER BY %s %s", dbColumn, order)
}

// mapFilterKeyToColumn maps filter keys to database columns
func (b *SQLBuilder) mapFilterKeyToColumn(key string) string {
	mapping := map[string]string{
		"id":       "id",
		"status":   "status",
		"priority": "priority",
		"assignee": "assignees",
		"label":    "labels",
		"due":      "due_date",
		"start":    "start_date",
		"created":  "created_at",
		"updated":  "updated_at",
		"title":    "title",
	}

	if col, ok := mapping[key]; ok {
		return col
	}

	return key
}

// isArrayField checks if a field is an array field
func (b *SQLBuilder) isArrayField(key string) bool {
	arrayFields := map[string]bool{
		"assignee": true,
		"label":    true,
	}
	return arrayFields[key]
}
