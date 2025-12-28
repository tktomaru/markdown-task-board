package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// Task represents a task in the system
type Task struct {
	ID           string         `json:"id" db:"id"`
	ProjectID    string         `json:"project_id" db:"project_id"`
	ParentID     *string        `json:"parent_id,omitempty" db:"parent_id"`
	Title        string         `json:"title" db:"title"`
	Status       TaskStatus     `json:"status" db:"status"`
	Priority     TaskPriority   `json:"priority" db:"priority"`
	Assignees    StringArray    `json:"assignees" db:"assignees"`
	Labels       StringArray    `json:"labels" db:"labels"`
	StartDate    *time.Time     `json:"start_date,omitempty" db:"start_date"`
	DueDate      *time.Time     `json:"due_date,omitempty" db:"due_date"`
	MarkdownBody string         `json:"markdown_body" db:"markdown_body"`
	ExtraMeta    JSONB          `json:"extra_meta" db:"extra_meta"`
	SearchVector *string        `json:"-" db:"search_vector"` // Internal search index, not exposed in API
	CreatedAt    time.Time      `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at" db:"updated_at"`
	CompletedAt  *time.Time     `json:"completed_at,omitempty" db:"completed_at"`
	ArchivedAt   *time.Time     `json:"archived_at,omitempty" db:"archived_at"`
	CreatedBy    *string        `json:"created_by,omitempty" db:"created_by"`
	UpdatedBy    *string        `json:"updated_by,omitempty" db:"updated_by"`
}

// SavedView represents a saved query view
type SavedView struct {
	ID               string    `json:"id" db:"id"`
	ProjectID        string    `json:"project_id" db:"project_id"`
	OwnerUserID      *string   `json:"owner_user_id,omitempty" db:"owner_user_id"`
	Name             string    `json:"name" db:"name"`
	Description      *string   `json:"description,omitempty" db:"description"`
	Scope            ViewScope `json:"scope" db:"scope"`
	RawQuery         string    `json:"raw_query" db:"raw_query"`
	NormalizedQuery  string    `json:"normalized_query" db:"normalized_query"`
	Presentation     JSONB     `json:"presentation" db:"presentation"`
	UseCount         int       `json:"use_count" db:"use_count"`
	LastUsedAt       *time.Time `json:"last_used_at,omitempty" db:"last_used_at"`
	CreatedAt        time.Time `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time `json:"updated_at" db:"updated_at"`
}

// Project represents a project
type Project struct {
	ID          string            `json:"id" db:"id"`
	Name        string            `json:"name" db:"name"`
	Description *string           `json:"description,omitempty" db:"description"`
	Visibility  ProjectVisibility `json:"visibility" db:"visibility"`
	Settings    JSONB             `json:"settings" db:"settings"`
	CreatedAt   time.Time         `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at" db:"updated_at"`
	ArchivedAt  *time.Time        `json:"archived_at,omitempty" db:"archived_at"`
}

// User represents a user
type User struct {
	ID           string     `json:"id" db:"id"`
	Email        string     `json:"email" db:"email"`
	Name         string     `json:"name" db:"name"`
	AvatarURL    *string    `json:"avatar_url,omitempty" db:"avatar_url"`
	PasswordHash *string    `json:"-" db:"password_hash"`
	OIDCProvider *string    `json:"oidc_provider,omitempty" db:"oidc_provider"`
	OIDCSubject  *string    `json:"oidc_subject,omitempty" db:"oidc_subject"`
	Preferences  JSONB      `json:"preferences" db:"preferences"`
	CreatedAt    time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at" db:"updated_at"`
	LastLoginAt  *time.Time `json:"last_login_at,omitempty" db:"last_login_at"`
}

// TaskRelation represents a relation between tasks
type TaskRelation struct {
	SourceTaskID string       `json:"source_task_id" db:"source_task_id"`
	TargetTaskID string       `json:"target_task_id" db:"target_task_id"`
	RelationType RelationType `json:"relation_type" db:"relation_type"`
	CreatedAt    time.Time    `json:"created_at" db:"created_at"`
	CreatedBy    *string      `json:"created_by,omitempty" db:"created_by"`
}

// TaskRevision represents a task revision
type TaskRevision struct {
	RevID         int64     `json:"rev_id" db:"rev_id"`
	TaskID        string    `json:"task_id" db:"task_id"`
	EditorUserID  *string   `json:"editor_user_id,omitempty" db:"editor_user_id"`
	MarkdownBody  string    `json:"markdown_body" db:"markdown_body"`
	MetaSnapshot  JSONB     `json:"meta_snapshot" db:"meta_snapshot"`
	ChangeSummary *string   `json:"change_summary,omitempty" db:"change_summary"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
}

// AuditLog represents an audit log entry
type AuditLog struct {
	ID          int64       `json:"id" db:"id"`
	ActorUserID *string     `json:"actor_user_id,omitempty" db:"actor_user_id"`
	ActorIP     *string     `json:"actor_ip,omitempty" db:"actor_ip"`
	Action      AuditAction `json:"action" db:"action"`
	TargetType  string      `json:"target_type" db:"target_type"`
	TargetID    string      `json:"target_id" db:"target_id"`
	Detail      JSONB       `json:"detail" db:"detail"`
	CreatedAt   time.Time   `json:"created_at" db:"created_at"`
}

// Enums

type TaskStatus string

const (
	TaskStatusOpen       TaskStatus = "open"
	TaskStatusInProgress TaskStatus = "in_progress"
	TaskStatusReview     TaskStatus = "review"
	TaskStatusBlocked    TaskStatus = "blocked"
	TaskStatusDone       TaskStatus = "done"
	TaskStatusArchived   TaskStatus = "archived"
)

type TaskPriority string

const (
	TaskPriorityP0 TaskPriority = "P0"
	TaskPriorityP1 TaskPriority = "P1"
	TaskPriorityP2 TaskPriority = "P2"
	TaskPriorityP3 TaskPriority = "P3"
	TaskPriorityP4 TaskPriority = "P4"
)

type ProjectVisibility string

const (
	ProjectVisibilityPrivate ProjectVisibility = "private"
	ProjectVisibilityTeam    ProjectVisibility = "team"
	ProjectVisibilityPublic  ProjectVisibility = "public"
)

type ViewScope string

const (
	ViewScopePrivate ViewScope = "private"
	ViewScopeShared  ViewScope = "shared"
)

type RelationType string

const (
	RelationTypeParent       RelationType = "parent"
	RelationTypeChild        RelationType = "child"
	RelationTypeBlocks       RelationType = "blocks"
	RelationTypeBlockedBy    RelationType = "blocked_by"
	RelationTypeRelated      RelationType = "related"
	RelationTypeDuplicates   RelationType = "duplicates"
	RelationTypeDuplicatedBy RelationType = "duplicated_by"
)

type AuditAction string

const (
	AuditActionTaskCreate               AuditAction = "task.create"
	AuditActionTaskUpdate               AuditAction = "task.update"
	AuditActionTaskDelete               AuditAction = "task.delete"
	AuditActionTaskStatusChange         AuditAction = "task.status_change"
	AuditActionTaskAssign               AuditAction = "task.assign"
	AuditActionViewCreate               AuditAction = "view.create"
	AuditActionViewUpdate               AuditAction = "view.update"
	AuditActionViewDelete               AuditAction = "view.delete"
	AuditActionViewShare                AuditAction = "view.share"
	AuditActionProjectCreate            AuditAction = "project.create"
	AuditActionProjectUpdate            AuditAction = "project.update"
	AuditActionProjectDelete            AuditAction = "project.delete"
	AuditActionProjectMemberAdd         AuditAction = "project.member_add"
	AuditActionProjectMemberRemove      AuditAction = "project.member_remove"
	AuditActionProjectMemberRoleChange  AuditAction = "project.member_role_change"
)

// Custom types for PostgreSQL compatibility

// StringArray is a custom type for PostgreSQL text arrays
type StringArray []string

// Value implements the driver.Valuer interface
func (a StringArray) Value() (driver.Value, error) {
	if a == nil {
		return nil, nil
	}
	if len(a) == 0 {
		return "{}", nil
	}

	// Build PostgreSQL array literal
	s := "{"
	for i, v := range a {
		if i > 0 {
			s += ","
		}
		// Escape quotes and backslashes
		escaped := ""
		for _, c := range v {
			if c == '"' || c == '\\' {
				escaped += "\\"
			}
			escaped += string(c)
		}
		s += `"` + escaped + `"`
	}
	s += "}"

	return s, nil
}

// Scan implements the sql.Scanner interface
func (a *StringArray) Scan(value interface{}) error {
	if value == nil {
		*a = nil
		return nil
	}

	switch v := value.(type) {
	case []byte:
		return a.scanBytes(v)
	case string:
		return a.scanBytes([]byte(v))
	default:
		return fmt.Errorf("cannot scan type %T into StringArray", value)
	}
}

func (a *StringArray) scanBytes(src []byte) error {
	// Simple PostgreSQL array parser
	// This is a basic implementation; for production, consider using a library
	if len(src) == 0 || string(src) == "{}" {
		*a = []string{}
		return nil
	}

	// Convert to string for proper UTF-8 handling
	str := string(src)

	// Remove outer braces
	if str[0] == '{' && str[len(str)-1] == '}' {
		str = str[1 : len(str)-1]
	}

	// Split by comma (simplified - doesn't handle nested arrays or escaped commas)
	var result []string
	current := ""
	inQuote := false
	prevRune := rune(0)

	// Iterate over runes for proper UTF-8 handling
	for _, r := range str {
		if r == '"' && prevRune != '\\' {
			inQuote = !inQuote
			prevRune = r
			continue
		}

		if r == ',' && !inQuote {
			result = append(result, current)
			current = ""
			prevRune = r
			continue
		}

		current += string(r)
		prevRune = r
	}

	if current != "" {
		result = append(result, current)
	}

	*a = result
	return nil
}

// JSONB is a custom type for PostgreSQL JSONB
type JSONB map[string]interface{}

// Value implements the driver.Valuer interface
func (j JSONB) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

// Scan implements the sql.Scanner interface
func (j *JSONB) Scan(value interface{}) error {
	if value == nil {
		*j = make(JSONB)
		return nil
	}

	var data []byte
	switch v := value.(type) {
	case []byte:
		data = v
	case string:
		data = []byte(v)
	default:
		return fmt.Errorf("cannot scan type %T into JSONB", value)
	}

	// Initialize the map before unmarshaling
	temp := make(JSONB)
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}
	*j = temp
	return nil
}
