package parser

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"gopkg.in/yaml.v3"

	"github.com/tktomaru/taskai/taskai-server/internal/models"
)

// TaskMetadata represents the YAML frontmatter metadata
type TaskMetadata struct {
	ID        string    `yaml:"id"`
	Status    string    `yaml:"status"`
	Priority  string    `yaml:"priority"`
	Assignees []string  `yaml:"assignees"`
	Labels    []string  `yaml:"labels"`
	StartDate *string   `yaml:"start"`
	DueDate   *string   `yaml:"due"`
	ExtraMeta yaml.Node `yaml:",inline"`
}

// ParsedTask represents a parsed task with metadata and body
type ParsedTask struct {
	Metadata     TaskMetadata
	MarkdownBody string
	Title        string
}

// MarkdownParser handles parsing of task markdown
type MarkdownParser struct{}

// NewMarkdownParser creates a new markdown parser
func NewMarkdownParser() *MarkdownParser {
	return &MarkdownParser{}
}

// Parse parses a markdown document with YAML frontmatter
func (p *MarkdownParser) Parse(markdown string) (*ParsedTask, error) {
	// Extract title, metadata, and body
	title, yamlContent, _, err := p.extractParts(markdown)
	if err != nil {
		return nil, fmt.Errorf("failed to extract parts: %w", err)
	}

	// Parse YAML metadata
	var metadata TaskMetadata
	if err := yaml.Unmarshal([]byte(yamlContent), &metadata); err != nil {
		return nil, fmt.Errorf("failed to parse YAML metadata: %w", err)
	}

	// Validate required fields
	if err := p.validateMetadata(&metadata); err != nil {
		return nil, fmt.Errorf("validation failed: %w", err)
	}

	return &ParsedTask{
		Metadata:     metadata,
		MarkdownBody: markdown, // Store original markdown
		Title:        title,
	}, nil
}

// extractParts extracts title, YAML frontmatter, and body from markdown
func (p *MarkdownParser) extractParts(markdown string) (title, yamlContent, body string, err error) {
	// Pattern: ## ID: Title
	titlePattern := regexp.MustCompile(`(?m)^##\s+([A-Z]+-\d+):\s+(.+)$`)
	titleMatch := titlePattern.FindStringSubmatch(markdown)

	if titleMatch == nil {
		return "", "", "", fmt.Errorf("task title not found (expected format: ## ID: Title)")
	}

	title = strings.TrimSpace(titleMatch[2])

	// Extract YAML frontmatter from code block
	// Pattern: ```yaml ... ```
	yamlPattern := regexp.MustCompile("(?s)```yaml\n(.*?)\n```")
	yamlMatch := yamlPattern.FindStringSubmatch(markdown)

	if yamlMatch == nil {
		return "", "", "", fmt.Errorf("YAML frontmatter not found (expected ```yaml ... ```)")
	}

	yamlContent = yamlMatch[1]

	// Body is everything after the YAML block
	yamlEndIdx := strings.Index(markdown, yamlMatch[0]) + len(yamlMatch[0])
	body = strings.TrimSpace(markdown[yamlEndIdx:])

	return title, yamlContent, body, nil
}

// validateMetadata validates required fields
func (p *MarkdownParser) validateMetadata(meta *TaskMetadata) error {
	if meta.ID == "" {
		return fmt.Errorf("id is required")
	}

	if meta.Status == "" {
		return fmt.Errorf("status is required")
	}

	if meta.Priority == "" {
		return fmt.Errorf("priority is required")
	}

	// Validate status enum
	validStatuses := map[string]bool{
		"open": true, "in_progress": true, "review": true,
		"blocked": true, "done": true, "archived": true,
	}
	if !validStatuses[meta.Status] {
		return fmt.Errorf("invalid status: %s (must be one of: open, in_progress, review, blocked, done, archived)", meta.Status)
	}

	// Validate priority enum
	validPriorities := map[string]bool{
		"P0": true, "P1": true, "P2": true, "P3": true, "P4": true,
	}
	if !validPriorities[meta.Priority] {
		return fmt.Errorf("invalid priority: %s (must be one of: P0, P1, P2, P3, P4)", meta.Priority)
	}

	return nil
}

// ToTask converts ParsedTask to models.Task
func (pt *ParsedTask) ToTask(projectID string) (*models.Task, error) {
	task := &models.Task{
		ID:           pt.Metadata.ID,
		ProjectID:    projectID,
		Title:        pt.Title,
		Status:       models.TaskStatus(pt.Metadata.Status),
		Priority:     models.TaskPriority(pt.Metadata.Priority),
		Assignees:    models.StringArray(pt.Metadata.Assignees),
		Labels:       models.StringArray(pt.Metadata.Labels),
		MarkdownBody: pt.MarkdownBody,
		ExtraMeta:    make(models.JSONB),
	}

	// Parse dates
	if pt.Metadata.StartDate != nil {
		startDate, err := parseDate(*pt.Metadata.StartDate)
		if err != nil {
			return nil, fmt.Errorf("invalid start date: %w", err)
		}
		task.StartDate = &startDate
	}

	if pt.Metadata.DueDate != nil {
		dueDate, err := parseDate(*pt.Metadata.DueDate)
		if err != nil {
			return nil, fmt.Errorf("invalid due date: %w", err)
		}
		task.DueDate = &dueDate
	}

	return task, nil
}

// parseDate parses a date string in YYYY-MM-DD format
func parseDate(dateStr string) (time.Time, error) {
	return time.Parse("2006-01-02", dateStr)
}

// ExtractAcceptanceCriteria extracts acceptance criteria from markdown body
func ExtractAcceptanceCriteria(markdown string) []string {
	var criteria []string

	// Pattern: - [ ] ... or - [x] ...
	acPattern := regexp.MustCompile(`(?m)^-\s+\[([ x])\]\s+(.+)$`)
	matches := acPattern.FindAllStringSubmatch(markdown, -1)

	for _, match := range matches {
		if len(match) >= 3 {
			criteria = append(criteria, match[2])
		}
	}

	return criteria
}

// GenerateMarkdown generates markdown from task data (for editing)
func GenerateMarkdown(task *models.Task) string {
	var sb strings.Builder

	// Title
	sb.WriteString(fmt.Sprintf("## %s: %s\n\n", task.ID, task.Title))

	// YAML frontmatter
	sb.WriteString("```yaml\n")
	sb.WriteString(fmt.Sprintf("id: %s\n", task.ID))
	sb.WriteString(fmt.Sprintf("status: %s\n", task.Status))
	sb.WriteString(fmt.Sprintf("priority: %s\n", task.Priority))

	if len(task.Assignees) > 0 {
		sb.WriteString("assignees: [")
		for i, assignee := range task.Assignees {
			if i > 0 {
				sb.WriteString(", ")
			}
			sb.WriteString(assignee)
		}
		sb.WriteString("]\n")
	}

	if task.StartDate != nil {
		sb.WriteString(fmt.Sprintf("start: %s\n", task.StartDate.Format("2006-01-02")))
	}

	if task.DueDate != nil {
		sb.WriteString(fmt.Sprintf("due: %s\n", task.DueDate.Format("2006-01-02")))
	}

	if len(task.Labels) > 0 {
		sb.WriteString("labels: [")
		for i, label := range task.Labels {
			if i > 0 {
				sb.WriteString(", ")
			}
			sb.WriteString(label)
		}
		sb.WriteString("]\n")
	}

	sb.WriteString("```\n\n")

	// Body (extract from original markdown_body, skipping title and YAML)
	body := extractBody(task.MarkdownBody)
	sb.WriteString(body)

	return sb.String()
}

// extractBody extracts the body part from markdown (after YAML block)
func extractBody(markdown string) string {
	// Find the end of YAML block
	yamlPattern := regexp.MustCompile("(?s)```yaml\n.*?\n```")
	match := yamlPattern.FindStringIndex(markdown)

	if match == nil {
		return markdown
	}

	// Return everything after the YAML block
	return strings.TrimSpace(markdown[match[1]:])
}
