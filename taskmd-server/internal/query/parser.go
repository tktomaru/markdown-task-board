package query

import (
	"fmt"
	"regexp"
	"strings"
	"time"
)

// QueryParser parses SavedView query strings
type QueryParser struct{}

// NewQueryParser creates a new query parser
func NewQueryParser() *QueryParser {
	return &QueryParser{}
}

// ParsedQuery represents a parsed query
type ParsedQuery struct {
	Filters   []Filter
	Sort      *SortOption
	Group     *GroupOption
	Limit     int
	ViewType  string
	Columns   []string
}

// Filter represents a single filter condition
type Filter struct {
	Key      string
	Operator string // "=", "!=", ">", "<", ">=", "<=", "in", "not_in", "contains"
	Value    interface{}
	Negate   bool
}

// SortOption represents sorting configuration
type SortOption struct {
	Field string
	Order string // "asc" or "desc"
}

// GroupOption represents grouping configuration
type GroupOption struct {
	Field string
}

// Parse parses a query string
func (p *QueryParser) Parse(queryStr string) (*ParsedQuery, error) {
	result := &ParsedQuery{
		Filters: []Filter{},
		Limit:   100,
	}

	// Split by spaces (but respect parentheses and quotes)
	tokens := p.tokenize(queryStr)

	for _, token := range tokens {
		token = strings.TrimSpace(token)
		if token == "" {
			continue
		}

		// Check for display options
		if strings.HasPrefix(token, "sort:") {
			sortOpt, err := p.parseSort(token)
			if err != nil {
				return nil, err
			}
			result.Sort = sortOpt
			continue
		}

		if strings.HasPrefix(token, "group:") {
			groupOpt, err := p.parseGroup(token)
			if err != nil {
				return nil, err
			}
			result.Group = groupOpt
			continue
		}

		if strings.HasPrefix(token, "limit:") {
			limit, err := p.parseLimit(token)
			if err != nil {
				return nil, err
			}
			result.Limit = limit
			continue
		}

		if strings.HasPrefix(token, "view:") {
			result.ViewType = strings.TrimPrefix(token, "view:")
			continue
		}

		if strings.HasPrefix(token, "cols:") {
			cols, err := p.parseColumns(token)
			if err != nil {
				return nil, err
			}
			result.Columns = cols
			continue
		}

		// Parse filter
		filter, err := p.parseFilter(token)
		if err != nil {
			return nil, fmt.Errorf("invalid filter '%s': %w", token, err)
		}

		result.Filters = append(result.Filters, *filter)
	}

	return result, nil
}

// tokenize splits query string into tokens
func (p *QueryParser) tokenize(query string) []string {
	var tokens []string
	var current strings.Builder
	inParens := 0
	inQuotes := false

	for i, ch := range query {
		switch ch {
		case '(':
			inParens++
			current.WriteRune(ch)
		case ')':
			inParens--
			current.WriteRune(ch)
		case '"':
			inQuotes = !inQuotes
			current.WriteRune(ch)
		case ' ':
			if inParens > 0 || inQuotes {
				current.WriteRune(ch)
			} else {
				if current.Len() > 0 {
					tokens = append(tokens, current.String())
					current.Reset()
				}
			}
		default:
			current.WriteRune(ch)
		}

		// Last character
		if i == len(query)-1 && current.Len() > 0 {
			tokens = append(tokens, current.String())
		}
	}

	return tokens
}

// parseFilter parses a single filter token
func (p *QueryParser) parseFilter(token string) (*Filter, error) {
	negate := false
	if strings.HasPrefix(token, "-") {
		negate = true
		token = token[1:]
	}

	// Pattern: key:value or key:operator:value
	parts := strings.SplitN(token, ":", 2)
	if len(parts) != 2 {
		return nil, fmt.Errorf("invalid filter format (expected key:value)")
	}

	key := parts[0]
	valueStr := parts[1]

	// Check for comparison operators
	operator := "="
	value := valueStr

	if strings.HasPrefix(valueStr, "<=") {
		operator = "<="
		value = strings.TrimPrefix(valueStr, "<=")
	} else if strings.HasPrefix(valueStr, ">=") {
		operator = ">="
		value = strings.TrimPrefix(valueStr, ">=")
	} else if strings.HasPrefix(valueStr, "<") {
		operator = "<"
		value = strings.TrimPrefix(valueStr, "<")
	} else if strings.HasPrefix(valueStr, ">") {
		operator = ">"
		value = strings.TrimPrefix(valueStr, ">")
	}

	// Check for OR values (parentheses)
	if strings.HasPrefix(value, "(") && strings.HasSuffix(value, ")") {
		// Multiple values (OR)
		value = strings.TrimPrefix(value, "(")
		value = strings.TrimSuffix(value, ")")
		values := strings.Split(value, " ")

		// Clean up values
		cleanValues := []string{}
		for _, v := range values {
			v = strings.TrimSpace(v)
			if v != "" {
				cleanValues = append(cleanValues, v)
			}
		}

		return &Filter{
			Key:      key,
			Operator: "in",
			Value:    cleanValues,
			Negate:   negate,
		}, nil
	}

	// Resolve relative dates
	if isDateField(key) {
		resolvedValue, err := p.resolveRelativeDate(value)
		if err == nil {
			value = resolvedValue
		}
	}

	return &Filter{
		Key:      key,
		Operator: operator,
		Value:    value,
		Negate:   negate,
	}, nil
}

// parseSort parses sort option
func (p *QueryParser) parseSort(token string) (*SortOption, error) {
	value := strings.TrimPrefix(token, "sort:")

	// Default to ascending
	order := "asc"
	field := value

	if strings.HasSuffix(value, "_desc") {
		order = "desc"
		field = strings.TrimSuffix(value, "_desc")
	} else if strings.HasSuffix(value, "_asc") {
		field = strings.TrimSuffix(value, "_asc")
	}

	return &SortOption{
		Field: field,
		Order: order,
	}, nil
}

// parseGroup parses group option
func (p *QueryParser) parseGroup(token string) (*GroupOption, error) {
	value := strings.TrimPrefix(token, "group:")

	return &GroupOption{
		Field: value,
	}, nil
}

// parseLimit parses limit option
func (p *QueryParser) parseLimit(token string) (int, error) {
	value := strings.TrimPrefix(token, "limit:")
	var limit int
	_, err := fmt.Sscanf(value, "%d", &limit)
	if err != nil {
		return 0, fmt.Errorf("invalid limit value")
	}
	return limit, nil
}

// parseColumns parses columns option
func (p *QueryParser) parseColumns(token string) ([]string, error) {
	value := strings.TrimPrefix(token, "cols:")
	value = strings.TrimPrefix(value, "(")
	value = strings.TrimSuffix(value, ")")

	cols := strings.Split(value, " ")
	cleanCols := []string{}
	for _, col := range cols {
		col = strings.TrimSpace(col)
		if col != "" {
			cleanCols = append(cleanCols, col)
		}
	}

	return cleanCols, nil
}

// resolveRelativeDate resolves relative date expressions
func (p *QueryParser) resolveRelativeDate(expr string) (string, error) {
	now := time.Now()

	switch expr {
	case "today":
		return now.Format("2006-01-02"), nil
	case "yesterday":
		return now.AddDate(0, 0, -1).Format("2006-01-02"), nil
	case "tomorrow":
		return now.AddDate(0, 0, 1).Format("2006-01-02"), nil
	}

	// this_week_start (Monday of this week)
	if expr == "this_week_start" {
		weekday := int(now.Weekday())
		if weekday == 0 {
			weekday = 7
		}
		monday := now.AddDate(0, 0, -(weekday - 1))
		return monday.Format("2006-01-02"), nil
	}

	// this_week_end (Sunday of this week)
	if expr == "this_week_end" {
		weekday := int(now.Weekday())
		if weekday == 0 {
			weekday = 7
		}
		sunday := now.AddDate(0, 0, 7-weekday)
		return sunday.Format("2006-01-02"), nil
	}

	// this_week (deprecated, use this_week_start)
	if expr == "this_week" {
		weekday := int(now.Weekday())
		if weekday == 0 {
			weekday = 7
		}
		monday := now.AddDate(0, 0, -(weekday - 1))
		return monday.Format("2006-01-02"), nil
	}

	// last_Nd (last N days)
	lastNdPattern := regexp.MustCompile(`^last_(\d+)d$`)
	if matches := lastNdPattern.FindStringSubmatch(expr); matches != nil {
		var days int
		fmt.Sscanf(matches[1], "%d", &days)
		return now.AddDate(0, 0, -days).Format("2006-01-02"), nil
	}

	// -Nd (N days ago)
	minusDaysPattern := regexp.MustCompile(`^-(\d+)d$`)
	if matches := minusDaysPattern.FindStringSubmatch(expr); matches != nil {
		var days int
		fmt.Sscanf(matches[1], "%d", &days)
		return now.AddDate(0, 0, -days).Format("2006-01-02"), nil
	}

	// +Nd (N days from now)
	plusDaysPattern := regexp.MustCompile(`^\+(\d+)d$`)
	if matches := plusDaysPattern.FindStringSubmatch(expr); matches != nil {
		var days int
		fmt.Sscanf(matches[1], "%d", &days)
		return now.AddDate(0, 0, days).Format("2006-01-02"), nil
	}

	// last_weekday (e.g., last_monday, last_sunday)
	lastWeekdayPattern := regexp.MustCompile(`^last_(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$`)
	if matches := lastWeekdayPattern.FindStringSubmatch(expr); matches != nil {
		targetWeekday := parseWeekday(matches[1])
		currentWeekday := int(now.Weekday())
		if currentWeekday == 0 {
			currentWeekday = 7
		}

		daysBack := currentWeekday - targetWeekday
		if daysBack <= 0 {
			daysBack += 7
		}

		targetDate := now.AddDate(0, 0, -daysBack)
		return targetDate.Format("2006-01-02"), nil
	}

	// next_weekday (e.g., next_monday, next_sunday)
	nextWeekdayPattern := regexp.MustCompile(`^next_(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$`)
	if matches := nextWeekdayPattern.FindStringSubmatch(expr); matches != nil {
		targetWeekday := parseWeekday(matches[1])
		currentWeekday := int(now.Weekday())
		if currentWeekday == 0 {
			currentWeekday = 7
		}

		daysForward := targetWeekday - currentWeekday
		if daysForward <= 0 {
			daysForward += 7
		}

		targetDate := now.AddDate(0, 0, daysForward)
		return targetDate.Format("2006-01-02"), nil
	}

	// overdue
	if expr == "overdue" {
		return now.Format("2006-01-02"), nil // Will be used with < operator
	}

	return "", fmt.Errorf("unknown relative date: %s", expr)
}

// parseWeekday converts weekday name to number (Monday=1, Sunday=7)
func parseWeekday(weekday string) int {
	weekdays := map[string]int{
		"monday":    1,
		"tuesday":   2,
		"wednesday": 3,
		"thursday":  4,
		"friday":    5,
		"saturday":  6,
		"sunday":    7,
	}
	return weekdays[weekday]
}

// isDateField checks if a field is a date field
func isDateField(field string) bool {
	dateFields := map[string]bool{
		"due":        true,
		"due_date":   true,
		"start":      true,
		"start_date": true,
		"created":    true,
		"updated":    true,
	}
	return dateFields[field]
}
