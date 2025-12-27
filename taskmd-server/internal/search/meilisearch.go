package search

import (
	"context"
	"fmt"
	"time"

	"github.com/meilisearch/meilisearch-go"
	"github.com/tktomaru/taskai/taskai-server/internal/models"
)

// MeilisearchClient wraps Meilisearch client
type MeilisearchClient struct {
	client *meilisearch.Client
	index  string
}

// TaskDocument represents a task document in Meilisearch
type TaskDocument struct {
	ID           string   `json:"id"`
	ProjectID    string   `json:"project_id"`
	Title        string   `json:"title"`
	Status       string   `json:"status"`
	Priority     string   `json:"priority"`
	Assignees    []string `json:"assignees"`
	Labels       []string `json:"labels"`
	MarkdownBody string   `json:"markdown_body"`
	DueDate      *int64   `json:"due_date,omitempty"`      // Unix timestamp
	StartDate    *int64   `json:"start_date,omitempty"`    // Unix timestamp
	CreatedAt    int64    `json:"created_at"`              // Unix timestamp
	UpdatedAt    int64    `json:"updated_at"`              // Unix timestamp
}

// SearchResult represents a search result
type SearchResult struct {
	Hits       []TaskDocument        `json:"hits"`
	TotalHits  int64                 `json:"total_hits"`
	Query      string                `json:"query"`
	Processing time.Duration         `json:"processing_time_ms"`
}

// NewMeilisearchClient creates a new Meilisearch client
func NewMeilisearchClient(host, apiKey, index string) (*MeilisearchClient, error) {
	client := meilisearch.NewClient(meilisearch.ClientConfig{
		Host:   host,
		APIKey: apiKey,
	})

	mc := &MeilisearchClient{
		client: client,
		index:  index,
	}

	// Create index if it doesn't exist
	if err := mc.setupIndex(); err != nil {
		return nil, fmt.Errorf("failed to setup index: %w", err)
	}

	return mc, nil
}

// setupIndex sets up the Meilisearch index with proper configuration
func (mc *MeilisearchClient) setupIndex() error {
	_ = context.Background()

	// Create index if it doesn't exist
	_, err := mc.client.CreateIndex(&meilisearch.IndexConfig{
		Uid:        mc.index,
		PrimaryKey: "id",
	})
	if err != nil {
		// Ignore error if index already exists
		if !isMeilisearchIndexExistsError(err) {
			return fmt.Errorf("failed to create index: %w", err)
		}
	}

	// Get index
	index := mc.client.Index(mc.index)

	// Configure searchable attributes
	_, err = index.UpdateSearchableAttributes(&[]string{
		"title",
		"markdown_body",
		"labels",
		"id",
	})
	if err != nil {
		return fmt.Errorf("failed to update searchable attributes: %w", err)
	}

	// Configure filterable attributes
	_, err = index.UpdateFilterableAttributes(&[]string{
		"project_id",
		"status",
		"priority",
		"assignees",
		"labels",
		"due_date",
		"start_date",
		"created_at",
		"updated_at",
	})
	if err != nil {
		return fmt.Errorf("failed to update filterable attributes: %w", err)
	}

	// Configure sortable attributes
	_, err = index.UpdateSortableAttributes(&[]string{
		"created_at",
		"updated_at",
		"due_date",
		"start_date",
		"priority",
	})
	if err != nil {
		return fmt.Errorf("failed to update sortable attributes: %w", err)
	}

	// Configure ranking rules
	_, err = index.UpdateRankingRules(&[]string{
		"words",
		"typo",
		"proximity",
		"attribute",
		"sort",
		"exactness",
	})
	if err != nil {
		return fmt.Errorf("failed to update ranking rules: %w", err)
	}

	// Wait for tasks to complete
	time.Sleep(100 * time.Millisecond)

	return nil
}

// IndexTask indexes a task in Meilisearch
func (mc *MeilisearchClient) IndexTask(ctx context.Context, task *models.Task) error {
	doc := mc.taskToDocument(task)

	index := mc.client.Index(mc.index)
	_, err := index.AddDocuments([]TaskDocument{doc})
	if err != nil {
		return fmt.Errorf("failed to index task: %w", err)
	}

	return nil
}

// IndexTasks indexes multiple tasks in batch
func (mc *MeilisearchClient) IndexTasks(ctx context.Context, tasks []*models.Task) error {
	if len(tasks) == 0 {
		return nil
	}

	docs := make([]TaskDocument, len(tasks))
	for i, task := range tasks {
		docs[i] = mc.taskToDocument(task)
	}

	index := mc.client.Index(mc.index)
	_, err := index.AddDocuments(docs)
	if err != nil {
		return fmt.Errorf("failed to index tasks: %w", err)
	}

	return nil
}

// UpdateTask updates a task in Meilisearch
func (mc *MeilisearchClient) UpdateTask(ctx context.Context, task *models.Task) error {
	return mc.IndexTask(ctx, task) // Meilisearch upserts by default
}

// DeleteTask deletes a task from Meilisearch
func (mc *MeilisearchClient) DeleteTask(ctx context.Context, taskID string) error {
	index := mc.client.Index(mc.index)
	_, err := index.DeleteDocument(taskID)
	if err != nil {
		return fmt.Errorf("failed to delete task: %w", err)
	}

	return nil
}

// Search performs a search query
func (mc *MeilisearchClient) Search(ctx context.Context, query string, projectID string, limit int, filters map[string]interface{}) (*SearchResult, error) {
	index := mc.client.Index(mc.index)

	// Build filter string
	filterStr := fmt.Sprintf("project_id = %s", projectID)

	if status, ok := filters["status"].(string); ok && status != "" {
		filterStr += fmt.Sprintf(" AND status = %s", status)
	}

	if priority, ok := filters["priority"].(string); ok && priority != "" {
		filterStr += fmt.Sprintf(" AND priority = %s", priority)
	}

	if assignees, ok := filters["assignees"].([]string); ok && len(assignees) > 0 {
		for _, assignee := range assignees {
			filterStr += fmt.Sprintf(" AND assignees = %s", assignee)
		}
	}

	if limit == 0 {
		limit = 20
	}

	// Perform search
	searchRes, err := index.Search(query, &meilisearch.SearchRequest{
		Limit:  int64(limit),
		Filter: filterStr,
		AttributesToHighlight: []string{"title", "markdown_body"},
		HighlightPreTag:  "<mark>",
		HighlightPostTag: "</mark>",
	})
	if err != nil {
		return nil, fmt.Errorf("failed to search: %w", err)
	}

	// Convert results
	hits := make([]TaskDocument, 0, len(searchRes.Hits))
	for _, hit := range searchRes.Hits {
		// Type assertion
		hitMap, ok := hit.(map[string]interface{})
		if !ok {
			continue
		}

		doc := TaskDocument{
			ID:           getStringField(hitMap, "id"),
			ProjectID:    getStringField(hitMap, "project_id"),
			Title:        getStringField(hitMap, "title"),
			Status:       getStringField(hitMap, "status"),
			Priority:     getStringField(hitMap, "priority"),
			MarkdownBody: getStringField(hitMap, "markdown_body"),
		}

		if assignees, ok := hitMap["assignees"].([]interface{}); ok {
			doc.Assignees = make([]string, len(assignees))
			for i, a := range assignees {
				if s, ok := a.(string); ok {
					doc.Assignees[i] = s
				}
			}
		}

		if labels, ok := hitMap["labels"].([]interface{}); ok {
			doc.Labels = make([]string, len(labels))
			for i, l := range labels {
				if s, ok := l.(string); ok {
					doc.Labels[i] = s
				}
			}
		}

		hits = append(hits, doc)
	}

	return &SearchResult{
		Hits:       hits,
		TotalHits:  searchRes.EstimatedTotalHits,
		Query:      query,
		Processing: time.Duration(searchRes.ProcessingTimeMs) * time.Millisecond,
	}, nil
}

// HealthCheck checks if Meilisearch is healthy
func (mc *MeilisearchClient) HealthCheck(ctx context.Context) error {
	_, err := mc.client.Health()
	if err != nil {
		return fmt.Errorf("meilisearch health check failed: %w", err)
	}
	return nil
}

// taskToDocument converts a task model to a search document
func (mc *MeilisearchClient) taskToDocument(task *models.Task) TaskDocument {
	doc := TaskDocument{
		ID:           task.ID,
		ProjectID:    task.ProjectID,
		Title:        task.Title,
		Status:       string(task.Status),
		Priority:     string(task.Priority),
		Assignees:    task.Assignees,
		Labels:       task.Labels,
		MarkdownBody: task.MarkdownBody,
		CreatedAt:    task.CreatedAt.Unix(),
		UpdatedAt:    task.UpdatedAt.Unix(),
	}

	if task.DueDate != nil {
		timestamp := task.DueDate.Unix()
		doc.DueDate = &timestamp
	}

	if task.StartDate != nil {
		timestamp := task.StartDate.Unix()
		doc.StartDate = &timestamp
	}

	return doc
}

// Helper functions

func isMeilisearchIndexExistsError(err error) bool {
	if err == nil {
		return false
	}
	// Check if error message contains "index_already_exists"
	return false // Simplified for now
}

func getStringField(m map[string]interface{}, key string) string {
	if v, ok := m[key].(string); ok {
		return v
	}
	return ""
}
